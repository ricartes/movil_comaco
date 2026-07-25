package io.gestionasi.comaco.tracking;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Selecciona primero la guía pausada por finalización sin alterar el orden ni
 * el backoff de las demás guías.
 */
final class TrackingPriorityBatchClaimer {
    static final class PriorityTracking {
        final String trackingId;
        final long updatedMs;

        PriorityTracking(String trackingId, long updatedMs) {
            this.trackingId = trackingId;
            this.updatedMs = updatedMs;
        }

        String key() {
            return trackingId + ":" + updatedMs;
        }
    }

    private final TrackingStore store;
    private final CredentialCipher cipher = new CredentialCipher();

    TrackingPriorityBatchClaimer(TrackingStore store) {
        this.store = store;
    }

    PriorityTracking findPriority() {
        try (Cursor cursor = store.getReadableDatabase().rawQuery(
                "SELECT tracking_id,updated_ms "
                        + "FROM active_tracking "
                        + "WHERE status='PAUSADA_FINALIZACION' "
                        + "ORDER BY updated_ms LIMIT 1",
                null)) {
            if (!cursor.moveToFirst()) return null;
            return new PriorityTracking(cursor.getString(0), cursor.getLong(1));
        }
    }

    void prepare(String trackingId) {
        validateTrackingId(trackingId);
        long now = System.currentTimeMillis();
        SQLiteDatabase db = store.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put("state", TrackingStore.PENDING);
        values.put("next_retry_ms", 0);
        values.putNull("sending_since_ms");
        values.put("updated_ms", now);
        values.putNull("last_error");

        int recovered = db.update(
                "position_outbox",
                values,
                "tracking_id=? AND state NOT IN ('CONFIRMADA','FINAL')",
                new String[]{trackingId});

        store.event(
                "GPS_FINALIZATION_PRIORITY_PREPARED",
                "tracking=" + partial(trackingId) + " positions=" + recovered);
    }

    TrackingStore.UploadBatch claim(String trackingId, long createdBeforeOrAtMs) throws Exception {
        return claim(trackingId, createdBeforeOrAtMs, Integer.MAX_VALUE);
    }

    TrackingStore.UploadBatch claim(
            String trackingId,
            long createdBeforeOrAtMs,
            int maximumItems) throws Exception {
        validateTrackingId(trackingId);
        long now = System.currentTimeMillis();
        TrackingStore.UploadBatch batch = new TrackingStore.UploadBatch();
        batch.trackingId = trackingId;
        int limit;

        try (Cursor cursor = store.getReadableDatabase().rawQuery(
                "SELECT a.mobile_id,a.device_uuid,a.token_cipher,a.token_iv,"
                        + "c.base_url,c.app_version,c.timeout_ms,c.max_short_retries,c.batch_size "
                        + "FROM active_tracking a "
                        + "JOIN tracking_config c ON c.id=1 "
                        + "WHERE a.tracking_id=? "
                        + "AND a.status IN ('PAUSADA_FINALIZACION','FINALIZANDO')",
                new String[]{trackingId})) {
            if (!cursor.moveToFirst() || cursor.isNull(2) || cursor.isNull(3)) {
                store.event(
                        "GPS_FINALIZATION_PRIORITY_NO_BATCH",
                        "tracking=" + partial(trackingId) + " reason=credentials_or_status");
                return null;
            }
            batch.mobileId = cursor.getString(0);
            batch.deviceUuid = cursor.getString(1);
            batch.token = cipher.decrypt(cursor.getBlob(2), cursor.getBlob(3));
            batch.endpoint = cursor.getString(4)
                    + "/Webserviceproveedor.asmx/Recibe_Posiciones_Seguimiento";
            batch.appVersion = cursor.getString(5);
            batch.timeoutMs = cursor.getInt(6);
            batch.shortRetries = cursor.getInt(7);
            int configuredLimit = Math.max(1, cursor.getInt(8));
            limit = Math.max(1, Math.min(configuredLimit, Math.max(1, maximumItems)));
        }

        List<String> ids = new ArrayList<>();
        try (Cursor cursor = store.getReadableDatabase().rawQuery(
                "SELECT uuid_position,mobile_id,sequence,date_utc,latitude,longitude,"
                        + "accuracy,speed,bearing,altitude,mocked,origin "
                        + "FROM position_outbox "
                        + "WHERE tracking_id=? AND state='PENDIENTE' "
                        + "AND next_retry_ms<=? "
                        + "ORDER BY created_ms LIMIT ?",
                new String[]{
                        trackingId,
                        String.valueOf(now),
                        String.valueOf(limit)
                })) {
            while (cursor.moveToNext()) {
                TrackingStore.OutboxItem position = new TrackingStore.OutboxItem();
                position.uuidPosition = cursor.getString(0);
                position.trackingId = trackingId;
                position.mobileId = cursor.getString(1);
                position.sequence = cursor.isNull(2) ? null : cursor.getLong(2);
                position.dateUtc = cursor.getString(3);
                position.latitude = cursor.getDouble(4);
                position.longitude = cursor.getDouble(5);
                position.accuracy = nullableDouble(cursor, 6);
                position.speed = nullableDouble(cursor, 7);
                position.bearing = nullableDouble(cursor, 8);
                position.altitude = nullableDouble(cursor, 9);
                position.mocked = cursor.getInt(10) == 1;
                position.origin = cursor.getString(11);
                batch.items.add(position);
                ids.add(position.uuidPosition);
            }
        }

        if (ids.isEmpty()) {
            int remaining = countNonTerminal(trackingId);
            store.event(
                    "GPS_FINALIZATION_PRIORITY_NO_BATCH",
                    "tracking=" + partial(trackingId) + " remaining=" + remaining);
            return null;
        }
        markSending(ids, now);
        return batch;
    }

    private int countNonTerminal(String trackingId) {
        try (Cursor cursor = store.getReadableDatabase().rawQuery(
                "SELECT COUNT(*) FROM position_outbox "
                        + "WHERE tracking_id=? AND state NOT IN ('CONFIRMADA','FINAL')",
                new String[]{trackingId})) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        }
    }

    private void markSending(List<String> ids, long now) {
        SQLiteDatabase db = store.getWritableDatabase();
        db.beginTransaction();
        try {
            for (String id : ids) {
                db.execSQL(
                        "UPDATE position_outbox "
                                + "SET state='ENVIANDO',sending_since_ms=?,updated_ms=? "
                                + "WHERE uuid_position=? AND state='PENDIENTE'",
                        new Object[]{now, now, id});
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    private static Double nullableDouble(Cursor cursor, int index) {
        return cursor.isNull(index) ? null : cursor.getDouble(index);
    }

    private static void validateTrackingId(String trackingId) {
        UUID.fromString(trackingId == null ? "" : trackingId.trim());
    }

    private static String partial(String value) {
        return value == null ? "" : value.substring(0, Math.min(8, value.length()));
    }
}
