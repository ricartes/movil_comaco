package io.gestionasi.comaco.tracking;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.os.SystemClock;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;

final class DeviceAuditStore extends SQLiteOpenHelper {
    private static final String DB_NAME = "comaco_device_audit.db";
    private static final int DB_VERSION = 1;
    private static final long REPORT_INTERVAL_MS = 24L * 60L * 60L * 1000L;
    private static final long SENDING_STALE_MS = 10L * 60L * 1000L;
    private final Context context;
    private final CredentialCipher cipher =
            new CredentialCipher("comaco_device_audit_token_v1");

    static final class Event {
        String id;
        Long userId;
        String userKey;
        String type;
        String loginType;
        String eventUtc;
        boolean hadInternet;
        String snapshot;
        String hash;
        long createdMs;

        JSONObject toJson() throws Exception {
            JSONObject result = new JSONObject();
            result.put("ID_EVENTO", id);
            result.put("ID_USUARIO_LOCAL", userId == null ? JSONObject.NULL : userId);
            result.put("TIPO_EVENTO", type);
            result.put("TIPO_LOGIN", loginType == null ? JSONObject.NULL : loginType);
            result.put("FECHA_EVENTO_DISPOSITIVO_UTC", eventUtc);
            result.put("TENIA_INTERNET", hadInternet);
            result.put("CONFIGURACION_JSON", snapshot);
            return result;
        }
    }

    static final class Batch {
        String installationId;
        String endpoint;
        String token;
        List<Event> events = new ArrayList<>();

        JSONObject request() throws Exception {
            JSONObject input = new JSONObject();
            input.put("ID_INSTALACION", installationId);
            input.put("VERSION_ESQUEMA", 1);
            JSONArray values = new JSONArray();
            for (Event event : events) values.put(event.toJson());
            input.put("EVENTOS", values);
            JSONObject wrapper = new JSONObject();
            wrapper.put("entrada", input);
            return wrapper;
        }
    }

    DeviceAuditStore(Context context) {
        super(context.getApplicationContext(), DB_NAME, null, DB_VERSION);
        this.context = context.getApplicationContext();
        ensureInstallationIdentity();
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE audit_state (" +
                "id INTEGER PRIMARY KEY CHECK(id=1), installation_id TEXT NOT NULL," +
                "base_url TEXT, token_cipher BLOB, token_iv BLOB, current_snapshot TEXT," +
                "current_hash TEXT, last_config_hash TEXT, last_config_ms INTEGER," +
                "last_server_state TEXT, updated_ms INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE audit_outbox (" +
                "id_event TEXT PRIMARY KEY, user_id INTEGER, user_key TEXT," +
                "event_type TEXT NOT NULL, login_type TEXT, event_utc TEXT NOT NULL," +
                "had_internet INTEGER NOT NULL, snapshot_json TEXT NOT NULL," +
                "config_hash TEXT NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0," +
                "next_retry_ms INTEGER NOT NULL DEFAULT 0, sending_since_ms INTEGER," +
                "created_ms INTEGER NOT NULL, updated_ms INTEGER NOT NULL, last_error TEXT)");
        db.execSQL("CREATE INDEX idx_audit_outbox_ready ON audit_outbox(state,next_retry_ms,created_ms)");
        ContentValues state = new ContentValues();
        state.put("id", 1);
        state.put("installation_id", readInstallationId());
        state.put("updated_ms", System.currentTimeMillis());
        db.insertOrThrow("audit_state", null, state);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    }

    synchronized JSONObject configure(String baseUrl) throws Exception {
        if (baseUrl == null || !baseUrl.toLowerCase(Locale.US).startsWith("https://")) {
            throw new IllegalArgumentException("AUDITORIA_REQUIERE_HTTPS");
        }
        while (baseUrl.endsWith("/")) baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        String previousBase = null;
        try (Cursor cursor = getReadableDatabase().rawQuery(
                "SELECT base_url FROM audit_state WHERE id=1", null)) {
            if (cursor.moveToFirst() && !cursor.isNull(0)) previousBase = cursor.getString(0);
        }
        ContentValues values = new ContentValues();
        values.put("base_url", baseUrl);
        values.put("updated_ms", System.currentTimeMillis());
        getWritableDatabase().update("audit_state", values, "id=1", null);
        if (previousBase != null && !previousBase.equals(baseUrl)) {
            expeditePending("url_changed");
        }
        return state();
    }

    synchronized void expeditePending(String reason) {
        ContentValues values = new ContentValues();
        values.put("next_retry_ms", 0);
        values.put("updated_ms", System.currentTimeMillis());
        int count = getWritableDatabase().update(
                "audit_outbox", values, "state='PENDIENTE'", null);
        logEvent("AUDIT_BACKOFF", "reason=expedited_" + reason + " count=" + count);
    }

    synchronized void saveSnapshot(JSONObject snapshot) throws Exception {
        ContentValues values = new ContentValues();
        values.put("current_snapshot", snapshot.toString());
        values.put("current_hash", DeviceAuditCanonicalizer.hash(snapshot));
        values.put("updated_ms", System.currentTimeMillis());
        getWritableDatabase().update("audit_state", values, "id=1", null);
    }

    synchronized Event enqueueLogin(
            JSONObject snapshot,
            String loginType,
            Long userId,
            String userKey,
            boolean hadInternet,
            String requestedId) throws Exception {
        String normalized = loginType == null ? "OFFLINE" : loginType.trim().toUpperCase(Locale.US);
        if (!("ONLINE".equals(normalized) || "OFFLINE".equals(normalized)
                || "AUTOMATICO".equals(normalized))) {
            throw new IllegalArgumentException("TIPO_LOGIN_INVALIDO");
        }
        Event event = insertEvent(snapshot, "LOGIN", normalized, userId, userKey,
                hadInternet, requestedId);
        logEvent("AUDIT_EVENT_CREATED", "id=" + shortId(event.id)
                + " type=LOGIN loginType=" + normalized);
        logEvent("AUDIT_DB_COMMIT", "id=" + shortId(event.id) + " state=PENDIENTE");
        logEvent("AUDIT_PENDING_COUNT", "count=" + pendingCount());
        return event;
    }

    synchronized Event enqueueConfiguration(
            JSONObject snapshot,
            Long userId,
            String userKey,
            boolean hadInternet) throws Exception {
        saveSnapshot(snapshot);
        String hash = DeviceAuditCanonicalizer.hash(snapshot);
        long now = System.currentTimeMillis();
        String lastHash = null;
        long lastMs = 0;
        try (Cursor cursor = getReadableDatabase().rawQuery(
                "SELECT last_config_hash,last_config_ms FROM audit_state WHERE id=1", null)) {
            if (cursor.moveToFirst()) {
                lastHash = cursor.isNull(0) ? null : cursor.getString(0);
                lastMs = cursor.isNull(1) ? 0 : cursor.getLong(1);
            }
        }
        if (hash.equals(lastHash) && now - lastMs < REPORT_INTERVAL_MS) return null;

        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete("audit_outbox", "event_type='CONFIGURACION' AND state='PENDIENTE'", null);
            Event event = insertEvent(db, snapshot, "CONFIGURACION", null,
                    userId, userKey, hadInternet, null);
            ContentValues state = new ContentValues();
            state.put("last_config_hash", hash);
            state.put("last_config_ms", now);
            state.put("updated_ms", now);
            db.update("audit_state", state, "id=1", null);
            db.setTransactionSuccessful();
            return event;
        } finally {
            db.endTransaction();
        }
    }

    synchronized void confirmOnline(
            String eventId,
            String token,
            long userId,
            String userKey,
            boolean confirmed,
            String serverState) throws Exception {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            if (token != null && !token.trim().isEmpty()) {
                CredentialCipher.Encrypted encrypted = cipher.encrypt(token.trim());
                ContentValues state = new ContentValues();
                state.put("token_cipher", encrypted.value);
                state.put("token_iv", encrypted.iv);
                state.put("last_server_state", serverState);
                state.put("updated_ms", System.currentTimeMillis());
                db.update("audit_state", state, "id=1", null);
            }
            ContentValues event = new ContentValues();
            event.put("user_id", userId);
            event.put("updated_ms", System.currentTimeMillis());
            db.update("audit_outbox", event, "id_event=?", new String[]{eventId});
            if (userKey != null && !userKey.trim().isEmpty()) {
                db.update("audit_outbox", event, "user_key=? AND user_id IS NULL",
                        new String[]{userKey.trim().toLowerCase(Locale.US)});
            }
            if (confirmed) db.delete("audit_outbox", "id_event=?", new String[]{eventId});
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    synchronized void discard(String eventId) {
        if (eventId == null) return;
        getWritableDatabase().delete("audit_outbox", "id_event=?", new String[]{eventId});
    }

    synchronized Batch claimBatch() throws Exception {
        long now = System.currentTimeMillis();
        SQLiteDatabase db = getWritableDatabase();
        db.execSQL("UPDATE audit_outbox SET state='PENDIENTE',sending_since_ms=NULL " +
                "WHERE state='ENVIANDO' AND sending_since_ms<?",
                new Object[]{now - SENDING_STALE_MS});

        Batch batch = new Batch();
        byte[] encrypted = null;
        byte[] iv = null;
        try (Cursor cursor = db.rawQuery(
                "SELECT installation_id,base_url,token_cipher,token_iv FROM audit_state WHERE id=1",
                null)) {
            if (!cursor.moveToFirst() || cursor.isNull(1) || cursor.isNull(2) || cursor.isNull(3)) {
                return null;
            }
            batch.installationId = cursor.getString(0);
            batch.endpoint = cursor.getString(1)
                    + "/Webserviceproveedor.asmx/SincronizarAuditoriasDispositivo";
            encrypted = cursor.getBlob(2);
            iv = cursor.getBlob(3);
        }
        batch.token = cipher.decrypt(encrypted, iv);
        logEvent("AUDIT_TOKEN_AVAILABLE", "available=true installation="
                + shortId(batch.installationId));

        db.beginTransaction();
        try (Cursor cursor = db.rawQuery(
                "SELECT id_event,user_id,user_key,event_type,login_type,event_utc," +
                        "had_internet,snapshot_json,config_hash,created_ms " +
                        "FROM audit_outbox WHERE state='PENDIENTE' AND next_retry_ms<=? " +
                        "AND (event_type='CONFIGURACION' OR user_id IS NOT NULL) " +
                        "ORDER BY created_ms,id_event LIMIT 50",
                new String[]{String.valueOf(now)})) {
            List<String> ids = new ArrayList<>();
            while (cursor.moveToNext()) {
                Event event = new Event();
                event.id = cursor.getString(0);
                event.userId = cursor.isNull(1) ? null : cursor.getLong(1);
                event.userKey = cursor.isNull(2) ? null : cursor.getString(2);
                event.type = cursor.getString(3);
                event.loginType = cursor.isNull(4) ? null : cursor.getString(4);
                event.eventUtc = cursor.getString(5);
                event.hadInternet = cursor.getInt(6) != 0;
                event.snapshot = cursor.getString(7);
                event.hash = cursor.getString(8);
                event.createdMs = cursor.getLong(9);
                batch.events.add(event);
                ids.add(event.id);
            }
            ContentValues sending = new ContentValues();
            sending.put("state", "ENVIANDO");
            sending.put("sending_since_ms", now);
            sending.put("updated_ms", now);
            for (String id : ids) db.update("audit_outbox", sending, "id_event=?", new String[]{id});
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
        if (batch.events.isEmpty()) return null;
        logEvent("AUDIT_BATCH_SELECTED", "count=" + batch.events.size());
        return batch;
    }

    synchronized void confirm(Set<String> accepted, List<Event> sent, String serverState) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            for (String id : accepted) db.delete("audit_outbox", "id_event=?", new String[]{id});
            ContentValues pending = new ContentValues();
            pending.put("state", "PENDIENTE");
            pending.putNull("sending_since_ms");
            pending.put("updated_ms", System.currentTimeMillis());
            for (Event event : sent) {
                if (!accepted.contains(event.id)) {
                    db.update("audit_outbox", pending, "id_event=?", new String[]{event.id});
                }
            }
            if (serverState != null) {
                ContentValues state = new ContentValues();
                state.put("last_server_state", serverState);
                state.put("updated_ms", System.currentTimeMillis());
                db.update("audit_state", state, "id=1", null);
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
        logEvent("AUDIT_ACCEPTED", "count=" + accepted.size());
        logEvent("AUDIT_PENDING_COUNT", "count=" + pendingCount());
    }

    synchronized void fail(List<Event> events, String error) {
        long now = System.currentTimeMillis();
        SQLiteDatabase db = getWritableDatabase();
        for (Event event : events) {
            int attempts = 0;
            try (Cursor cursor = db.rawQuery(
                    "SELECT attempts FROM audit_outbox WHERE id_event=?",
                    new String[]{event.id})) {
                if (cursor.moveToFirst()) attempts = cursor.getInt(0) + 1;
            }
            long backoff = Math.min(60L * 60L * 1000L,
                    (1L << Math.min(attempts, 10)) * 5000L);
            ContentValues values = new ContentValues();
            values.put("state", "PENDIENTE");
            values.put("attempts", attempts);
            values.put("next_retry_ms", now + backoff);
            values.putNull("sending_since_ms");
            values.put("updated_ms", now);
            values.put("last_error", safeError(error));
            db.update("audit_outbox", values, "id_event=?", new String[]{event.id});
        }
        logEvent("AUDIT_BACKOFF", "count=" + events.size() + " reason=" + safeError(error));
        logEvent("AUDIT_PENDING_COUNT", "count=" + pendingCount());
    }

    synchronized boolean hasPending() {
        try (Cursor cursor = getReadableDatabase().rawQuery(
                "SELECT 1 FROM audit_outbox WHERE state IN ('PENDIENTE','ENVIANDO') LIMIT 1", null)) {
            return cursor.moveToFirst();
        }
    }

    synchronized int pendingCount() {
        try (Cursor cursor = getReadableDatabase().rawQuery(
                "SELECT COUNT(*) FROM audit_outbox WHERE state IN ('PENDIENTE','ENVIANDO')", null)) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        }
    }

    void logEvent(String event, String detail) {
        Log.i("ComacoTracking", "[AUDIT][" + event + "] utc="
                + iso(System.currentTimeMillis()) + " elapsed=" + SystemClock.elapsedRealtime()
                + (detail == null ? "" : " " + detail));
    }

    synchronized boolean canUpload() {
        try (Cursor cursor = getReadableDatabase().rawQuery(
                "SELECT 1 FROM audit_state WHERE id=1 AND base_url IS NOT NULL " +
                        "AND token_cipher IS NOT NULL AND token_iv IS NOT NULL", null)) {
            return cursor.moveToFirst();
        }
    }

    synchronized JSONObject state() throws Exception {
        JSONObject result = new JSONObject();
        try (Cursor cursor = getReadableDatabase().rawQuery(
                "SELECT installation_id,current_hash,last_server_state FROM audit_state WHERE id=1",
                null)) {
            if (cursor.moveToFirst()) {
                result.put("ID_INSTALACION", cursor.getString(0));
                result.put("HASH_CONFIGURACION", cursor.isNull(1) ? JSONObject.NULL : cursor.getString(1));
                result.put("ESTADO_DISPOSITIVO", cursor.isNull(2) ? JSONObject.NULL : cursor.getString(2));
            }
        }
        try (Cursor cursor = getReadableDatabase().rawQuery(
                "SELECT COUNT(*) FROM audit_outbox WHERE state IN ('PENDIENTE','ENVIANDO')", null)) {
            result.put("PENDIENTES", cursor.moveToFirst() ? cursor.getInt(0) : 0);
        }
        return result;
    }

    private Event insertEvent(
            JSONObject snapshot, String type, String loginType, Long userId,
            String userKey, boolean hadInternet, String requestedId) throws Exception {
        return insertEvent(getWritableDatabase(), snapshot, type, loginType,
                userId, userKey, hadInternet, requestedId);
    }

    private Event insertEvent(
            SQLiteDatabase db, JSONObject snapshot, String type, String loginType,
            Long userId, String userKey, boolean hadInternet, String requestedId) throws Exception {
        saveSnapshot(snapshot);
        long now = System.currentTimeMillis();
        Event event = new Event();
        event.id = requestedId == null || requestedId.trim().isEmpty()
                ? UUID.randomUUID().toString()
                : UUID.fromString(requestedId).toString();
        event.userId = userId;
        event.userKey = userKey == null ? null : userKey.trim().toLowerCase(Locale.US);
        event.type = type;
        event.loginType = loginType;
        event.eventUtc = iso(now);
        event.hadInternet = hadInternet;
        event.snapshot = snapshot.toString();
        event.hash = DeviceAuditCanonicalizer.hash(snapshot);
        event.createdMs = now;

        ContentValues values = new ContentValues();
        values.put("id_event", event.id);
        if (userId == null) values.putNull("user_id"); else values.put("user_id", userId);
        values.put("user_key", event.userKey);
        values.put("event_type", type);
        values.put("login_type", loginType);
        values.put("event_utc", event.eventUtc);
        values.put("had_internet", hadInternet ? 1 : 0);
        values.put("snapshot_json", event.snapshot);
        values.put("config_hash", event.hash);
        values.put("state", "PENDIENTE");
        values.put("attempts", 0);
        values.put("next_retry_ms", 0);
        values.put("created_ms", now);
        values.put("updated_ms", now);
        db.insertOrThrow("audit_outbox", null, values);
        return event;
    }

    private void ensureInstallationIdentity() {
        String expected = readInstallationId();
        SQLiteDatabase db = getWritableDatabase();
        String current = null;
        try (Cursor cursor = db.rawQuery("SELECT installation_id FROM audit_state WHERE id=1", null)) {
            if (cursor.moveToFirst()) current = cursor.getString(0);
        }
        if (!expected.equals(current)) {
            db.beginTransaction();
            try {
                db.delete("audit_outbox", null, null);
                ContentValues values = new ContentValues();
                values.put("installation_id", expected);
                values.putNull("token_cipher");
                values.putNull("token_iv");
                values.putNull("current_snapshot");
                values.putNull("current_hash");
                values.putNull("last_config_hash");
                values.putNull("last_config_ms");
                values.putNull("last_server_state");
                values.put("updated_ms", System.currentTimeMillis());
                db.update("audit_state", values, "id=1", null);
                db.setTransactionSuccessful();
            } finally {
                db.endTransaction();
            }
        }
    }

    private String readInstallationId() {
        File file = new File(context.getNoBackupFilesDir(), "comaco_installation_id");
        try {
            if (file.isFile()) {
                byte[] bytes = new byte[(int) file.length()];
                try (FileInputStream input = new FileInputStream(file)) {
                    int read = input.read(bytes);
                    if (read == bytes.length) {
                        String value = new String(bytes, StandardCharsets.UTF_8).trim();
                        return UUID.fromString(value).toString();
                    }
                }
            }
        } catch (Exception ignored) {
        }
        String value = UUID.randomUUID().toString();
        try (FileOutputStream output = new FileOutputStream(file, false)) {
            output.write(value.getBytes(StandardCharsets.UTF_8));
            output.getFD().sync();
        } catch (Exception exception) {
            throw new IllegalStateException("ID_INSTALACION_NO_PERSISTIDO", exception);
        }
        return value;
    }

    static String iso(long millis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(millis));
    }

    private static String safeError(String error) {
        if (error == null) return "ERROR_AUDITORIA";
        String value = error.replaceAll("[^A-Za-z0-9_\\-]", "_");
        return value.substring(0, Math.min(value.length(), 100));
    }

    private static String shortId(String value) {
        if (value == null) return "none";
        return value.substring(0, Math.min(8, value.length()));
    }
}
