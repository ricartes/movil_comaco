package io.gestionasi.comaco.tracking;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.location.Location;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

final class TrackingStore extends SQLiteOpenHelper {
    static final String PENDING = "PENDIENTE";
    static final String SENDING = "ENVIANDO";
    static final String CONFIRMED = "CONFIRMADA";
    static final String CREDENTIAL_ERROR = "ERROR_CREDENCIAL";
    static final String FINAL = "FINAL";
    private static final String DB_NAME = "comaco_tracking.db";
    private static final int DB_VERSION = 4;
    private final CredentialCipher cipher = new CredentialCipher();

    static final class OutboxItem {
        String uuidPosition, trackingId, mobileId, deviceUuid, dateUtc, origin;
        Long sequence;
        double latitude, longitude;
        Double accuracy, speed, bearing, altitude;
        boolean mocked;
    }

    static final class UploadBatch {
        String trackingId, mobileId, deviceUuid, token, endpoint, appVersion;
        int timeoutMs, shortRetries;
        final List<OutboxItem> items = new ArrayList<>();
    }

    static final class HealthUpdate {
        boolean changed;
        boolean trackingRecovered;
        boolean locationCallbackRecovered;
    }

    TrackingStore(Context context) { super(context, DB_NAME, null, DB_VERSION); }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE tracking_config (id INTEGER PRIMARY KEY CHECK(id=1), base_url TEXT NOT NULL, interval_ms INTEGER NOT NULL, distance_m REAL NOT NULL, batch_size INTEGER NOT NULL, timeout_ms INTEGER NOT NULL, max_short_retries INTEGER NOT NULL, schema_version INTEGER NOT NULL, migration_complete INTEGER NOT NULL DEFAULT 0, device_uuid TEXT NOT NULL, app_version TEXT NOT NULL, updated_ms INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE location_capture (uuid_capture TEXT PRIMARY KEY, captured_ms INTEGER NOT NULL, date_utc TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL, speed REAL, bearing REAL, altitude REAL, mocked INTEGER NOT NULL, provider TEXT NOT NULL)");
        db.execSQL("CREATE TABLE active_tracking (tracking_id TEXT PRIMARY KEY, mobile_id TEXT NOT NULL, device_uuid TEXT NOT NULL, token_cipher BLOB, token_iv BLOB, status TEXT NOT NULL, sequence INTEGER NOT NULL DEFAULT 0, created_ms INTEGER NOT NULL, updated_ms INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE position_outbox (uuid_position TEXT PRIMARY KEY, uuid_capture TEXT NOT NULL, tracking_id TEXT NOT NULL, mobile_id TEXT NOT NULL, sequence INTEGER, date_utc TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL, speed REAL, bearing REAL, altitude REAL, mocked INTEGER NOT NULL, origin TEXT NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_retry_ms INTEGER NOT NULL DEFAULT 0, sending_since_ms INTEGER, created_ms INTEGER NOT NULL, updated_ms INTEGER NOT NULL, last_error TEXT, FOREIGN KEY(uuid_capture) REFERENCES location_capture(uuid_capture))");
        db.execSQL("CREATE INDEX idx_outbox_ready ON position_outbox(state,next_retry_ms,created_ms)");
        db.execSQL("CREATE INDEX idx_outbox_tracking ON position_outbox(tracking_id,state,created_ms)");
        db.execSQL("CREATE TABLE technical_event (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, detail TEXT, created_ms INTEGER NOT NULL)");
        createRuntimeState(db);
    }

    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) createRuntimeState(db);
        else if (oldVersion < 3) {
            addCurrentHealthColumns(db);
            addPowerRemediationColumns(db);
        } else if (oldVersion < 4) addPowerRemediationColumns(db);
    }

    private static void createRuntimeState(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS tracking_runtime_state (id INTEGER PRIMARY KEY CHECK(id=1), policy_mode TEXT NOT NULL DEFAULT 'WARN', last_location_callback_ms INTEGER, last_location_callback_elapsed_ms INTEGER, last_location_callback_registration_generation TEXT, location_registration_generation TEXT, location_registration_started_ms INTEGER, location_registration_started_elapsed_ms INTEGER, current_health TEXT, current_health_reasons TEXT, current_health_updated_ms INTEGER, current_background_restricted INTEGER, last_remediation_action TEXT, last_remediation_action_ms INTEGER, last_start_user_override INTEGER NOT NULL DEFAULT 0, last_policy_mode TEXT, last_policy_decision TEXT, service_generation TEXT, service_created_ms INTEGER, service_destroyed_ms INTEGER, updated_ms INTEGER NOT NULL DEFAULT 0)");
        db.execSQL("INSERT OR IGNORE INTO tracking_runtime_state(id,policy_mode,updated_ms) VALUES(1,'WARN',0)");
    }

    private static void addCurrentHealthColumns(SQLiteDatabase db) {
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN last_location_callback_registration_generation TEXT");
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN location_registration_generation TEXT");
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN location_registration_started_ms INTEGER");
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN location_registration_started_elapsed_ms INTEGER");
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN current_health TEXT");
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN current_health_reasons TEXT");
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN current_health_updated_ms INTEGER");
    }

    private static void addPowerRemediationColumns(SQLiteDatabase db) {
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN current_background_restricted INTEGER");
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN last_remediation_action TEXT");
        db.execSQL("ALTER TABLE tracking_runtime_state ADD COLUMN last_remediation_action_ms INTEGER");
    }

    synchronized JSONObject configure(JSONObject input) throws Exception {
        String base = required(input, "URL_SERVICIO");
        if (!base.toLowerCase(Locale.US).startsWith("https://")) {
            throw new IllegalArgumentException("URL_SERVICIO debe usar HTTPS.");
        }
        while (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        String previousBase = null;
        try (Cursor cursor = getReadableDatabase().rawQuery(
                "SELECT base_url FROM tracking_config WHERE id=1", null)) {
            if (cursor.moveToFirst() && !cursor.isNull(0)) previousBase = cursor.getString(0);
        }
        ContentValues v = new ContentValues();
        v.put("id", 1); v.put("base_url", base);
        v.put("interval_ms", bounded(input.optLong("INTERVALO_MS", 1000), 1000, 60000, "INTERVALO_MS"));
        v.put("distance_m", boundedDouble(input.optDouble("DISTANCIA_METROS", 0d), 0d, 1000d, "DISTANCIA_METROS"));
        v.put("batch_size", (int) bounded(input.optLong("TAMANO_LOTE", 50), 1, 200, "TAMANO_LOTE"));
        v.put("timeout_ms", (int) bounded(input.optLong("TIMEOUT_HTTP_MS", 15000), 5000, 120000, "TIMEOUT_HTTP_MS"));
        v.put("max_short_retries", (int) bounded(input.optLong("REINTENTOS_CORTOS", 3), 0, 10, "REINTENTOS_CORTOS"));
        v.put("schema_version", input.optInt("VERSION_ESQUEMA", 1));
        v.put("migration_complete", currentMigrationFlag());
        v.put("device_uuid", required(input, "UUID_DISPOSITIVO"));
        v.put("app_version", input.optString("VERSION_APP", ""));
        v.put("updated_ms", System.currentTimeMillis());
        getWritableDatabase().insertWithOnConflict("tracking_config", null, v, SQLiteDatabase.CONFLICT_REPLACE);
        if (previousBase != null && !previousBase.equals(base)) {
            expeditePending("url_changed");
        }
        event("CONFIGURED", null);
        return state(false);
    }

    synchronized void expeditePending(String reason) {
        ContentValues values = new ContentValues();
        values.put("next_retry_ms", 0);
        values.put("updated_ms", System.currentTimeMillis());
        int count = getWritableDatabase().update(
                "position_outbox", values, "state='PENDIENTE'", null);
        event("GPS_BACKOFF", "reason=expedited_" + reason + " positions=" + count);
    }

    private int currentMigrationFlag() {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT migration_complete FROM tracking_config WHERE id=1", null)) {
            return c.moveToFirst() ? c.getInt(0) : 0;
        }
    }

    synchronized int syncTrackings(JSONArray items) throws Exception {
        int count = 0;
        for (int i = 0; i < items.length(); i++) { upsertTracking(items.getJSONObject(i)); count++; }
        return count;
    }

    synchronized void upsertTracking(JSONObject item) throws Exception {
        String trackingId = uuid(item, "ID_UNICO_SEGUIMIENTO");
        String mobileId = required(item, "ID_UNICO_MOVIL_GDE");
        String deviceUuid = required(item, "UUID_DISPOSITIVO");
        String token = required(item, "TOKEN_SEGUIMIENTO");
        CredentialCipher.Encrypted encrypted = cipher.encrypt(token);
        long now = System.currentTimeMillis();
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            long sequence = 0;
            try (Cursor c = db.rawQuery("SELECT sequence FROM active_tracking WHERE tracking_id=?", new String[]{trackingId})) {
                if (c.moveToFirst()) sequence = c.getLong(0);
            }
            ContentValues v = new ContentValues();
            v.put("tracking_id", trackingId); v.put("mobile_id", mobileId); v.put("device_uuid", deviceUuid);
            v.put("token_cipher", encrypted.value); v.put("token_iv", encrypted.iv); v.put("status", "ACTIVA");
            v.put("sequence", sequence); v.put("created_ms", now); v.put("updated_ms", now);
            db.insertWithOnConflict("active_tracking", null, v, SQLiteDatabase.CONFLICT_REPLACE);
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
        event("TRACK_REGISTERED", null);
    }

    synchronized void finalizeTracking(String trackingId) {
        ContentValues v = new ContentValues(); v.put("status", "FINALIZANDO"); v.put("updated_ms", System.currentTimeMillis());
        getWritableDatabase().update("active_tracking", v, "tracking_id=? AND status<>'FINAL'", new String[]{trackingId});
        completeFinalizations();
        event("TRACK_FINALIZING", null);
    }

    synchronized void beginFinalizationPreparation(String trackingId) {
        String id = uuidValue(trackingId, "ID_UNICO_SEGUIMIENTO");
        String status = text(
                "SELECT status FROM active_tracking WHERE tracking_id=?",
                new String[]{id});
        if ("PAUSADA_FINALIZACION".equals(status)) return;
        if (!"ACTIVA".equals(status)) throw new IllegalStateException("SEGUIMIENTO_NO_ACTIVO");
        ContentValues values = new ContentValues();
        values.put("status", "PAUSADA_FINALIZACION");
        values.put("updated_ms", System.currentTimeMillis());
        int updated = getWritableDatabase().update(
                "active_tracking", values, "tracking_id=? AND status='ACTIVA'", new String[]{id});
        if (updated != 1) throw new IllegalStateException("SEGUIMIENTO_NO_ACTIVO");
        event("TRACK_FINALIZATION_PAUSED", "tracking=" + partial(id));
    }

    synchronized void cancelFinalizationPreparation(String trackingId) {
        String id = uuidValue(trackingId, "ID_UNICO_SEGUIMIENTO");
        ContentValues values = new ContentValues();
        values.put("status", "ACTIVA");
        values.put("updated_ms", System.currentTimeMillis());
        int updated = getWritableDatabase().update(
                "active_tracking", values,
                "tracking_id=? AND status='PAUSADA_FINALIZACION'", new String[]{id});
        event("TRACK_FINALIZATION_RESUMED", "tracking=" + partial(id) + " updated=" + updated);
    }

    synchronized void recoverStaleFinalizationPreparations(long maxAgeMs) {
        long cutoff = System.currentTimeMillis() - Math.max(30000L, maxAgeMs);
        ContentValues values = new ContentValues();
        values.put("status", "ACTIVA");
        values.put("updated_ms", System.currentTimeMillis());
        int updated = getWritableDatabase().update(
                "active_tracking", values,
                "status='PAUSADA_FINALIZACION' AND updated_ms<?",
                new String[]{String.valueOf(cutoff)});
        if (updated > 0) event("TRACK_FINALIZATION_STALE_RECOVERED", "trackings=" + updated);
    }

    synchronized void expediteTrackingPending(String trackingId, String reason) {
        String id = uuidValue(trackingId, "ID_UNICO_SEGUIMIENTO");
        ContentValues values = new ContentValues();
        values.put("next_retry_ms", 0);
        values.put("updated_ms", System.currentTimeMillis());
        int count = getWritableDatabase().update(
                "position_outbox", values,
                "tracking_id=? AND state='PENDIENTE'", new String[]{id});
        event("GPS_BACKOFF", "reason=expedited_" + safe(reason) + " positions=" + count);
    }

    synchronized JSONObject finalizationPreparationState(String trackingId) throws JSONException {
        String id = uuidValue(trackingId, "ID_UNICO_SEGUIMIENTO");
        String status = text(
                "SELECT status FROM active_tracking WHERE tracking_id=?",
                new String[]{id});
        if (status == null) throw new IllegalStateException("SEGUIMIENTO_NO_EXISTE");
        int withoutAck = scalar(
                "SELECT COUNT(*) FROM position_outbox WHERE tracking_id=? AND state NOT IN ('CONFIRMADA','FINAL')",
                new String[]{id});
        JSONObject result = new JSONObject();
        result.put("ID_UNICO_SEGUIMIENTO", id);
        result.put("ESTADO", status);
        result.put("POSICIONES_SIN_ACK", withoutAck);
        result.put("POSICIONES_PENDIENTES", scalar(
                "SELECT COUNT(*) FROM position_outbox WHERE tracking_id=? AND state='PENDIENTE'",
                new String[]{id}));
        result.put("POSICIONES_ENVIANDO", scalar(
                "SELECT COUNT(*) FROM position_outbox WHERE tracking_id=? AND state='ENVIANDO'",
                new String[]{id}));
        return result;
    }

    synchronized int importLegacy(JSONArray items) throws Exception {
        SQLiteDatabase db = getWritableDatabase(); int imported = 0; long now = System.currentTimeMillis();
        db.beginTransaction();
        try {
            for (int i = 0; i < items.length(); i++) {
                JSONObject p = items.getJSONObject(i); String positionId = uuid(p, "UUID_POSICION");
                String trackingId = uuid(p, "ID_UNICO_SEGUIMIENTO"); String captureId = UUID.nameUUIDFromBytes(("legacy:" + positionId).getBytes(StandardCharsets.UTF_8)).toString();
                ContentValues capture = captureValues(captureId, p.optString("FECHA_DISPOSITIVO_UTC"), p.getDouble("LATITUD"), p.getDouble("LONGITUD"), nullable(p,"PRECISION_METROS"), nullable(p,"VELOCIDAD_MPS"), nullable(p,"RUMBO_GRADOS"), nullable(p,"ALTITUD_METROS"), p.optBoolean("ES_UBICACION_SIMULADA", p.optInt("ES_UBICACION_SIMULADA",0)==1), "LEGACY");
                db.insertWithOnConflict("location_capture", null, capture, SQLiteDatabase.CONFLICT_IGNORE);
                long created=p.has("FECHA_CREACION_UTC")?parseDate(p.optString("FECHA_CREACION_UTC")):now;
                ContentValues out = outboxValues(positionId, captureId, trackingId, required(p,"ID_UNICO_MOVIL_GDE"), p.has("SECUENCIA_LOCAL") && !p.isNull("SECUENCIA_LOCAL") ? p.getLong("SECUENCIA_LOCAL") : null, p.optString("FECHA_DISPOSITIVO_UTC"), p.getDouble("LATITUD"), p.getDouble("LONGITUD"), nullable(p,"PRECISION_METROS"), nullable(p,"VELOCIDAD_MPS"), nullable(p,"RUMBO_GRADOS"), nullable(p,"ALTITUD_METROS"), p.optBoolean("ES_UBICACION_SIMULADA", p.optInt("ES_UBICACION_SIMULADA",0)==1), p.optString("ORIGEN_CAPTURA","GPS"), created);
                out.put("attempts",Math.max(0,p.optInt("INTENTOS_ENVIO",0)));
                if(p.has("FECHA_ULTIMO_INTENTO_UTC")&&!p.isNull("FECHA_ULTIMO_INTENTO_UTC"))out.put("updated_ms",parseDate(p.optString("FECHA_ULTIMO_INTENTO_UTC")));
                if (db.insertWithOnConflict("position_outbox", null, out, SQLiteDatabase.CONFLICT_IGNORE) != -1) imported++;
                if (out.getAsLong("sequence") != null) db.execSQL("UPDATE active_tracking SET sequence=MAX(sequence,?) WHERE tracking_id=?", new Object[]{out.getAsLong("sequence"),trackingId});
            }
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
        event("LEGACY_IMPORTED", "count="+imported); return imported;
    }

    synchronized JSONObject verifyMigration(JSONObject expected) throws JSONException {
        int tracks = scalar("SELECT COUNT(*) FROM active_tracking", null);
        int positions = scalar("SELECT COUNT(*) FROM position_outbox WHERE origin<>'GPS_NATIVO'", null);
        int expectedTracks = expected.optInt("seguimientos", tracks), expectedPositions = expected.optInt("posiciones", positions);
        int missing=0; JSONArray uuids=expected.optJSONArray("uuids");
        if(uuids!=null)for(int i=0;i<uuids.length();i++)if(scalar("SELECT COUNT(*) FROM position_outbox WHERE uuid_position=?",new String[]{uuids.optString(i)})!=1)missing++;
        boolean verified = tracks >= expectedTracks && positions >= expectedPositions && missing==0;
        if (verified && expected.optBoolean("completar", false)) getWritableDatabase().execSQL("UPDATE tracking_config SET migration_complete=1 WHERE id=1");
        JSONObject result = new JSONObject(); result.put("verificada", verified); result.put("seguimientosNativos", tracks); result.put("posicionesNativas", positions); result.put("seguimientosEsperados", expectedTracks); result.put("posicionesEsperadas", expectedPositions); result.put("uuidsFaltantes",missing); return result;
    }

    synchronized int capture(Location location) {
        if (!valid(location)) { event("LOCATION_REJECTED", "reason=invalid"); return 0; }
        SQLiteDatabase db = getWritableDatabase(); long now = System.currentTimeMillis(); String captureId = UUID.randomUUID().toString(); int generated = 0;
        db.beginTransaction();
        try {
            db.insertOrThrow("location_capture", null, captureValues(captureId, iso(location.getTime()), location.getLatitude(), location.getLongitude(), location.hasAccuracy() ? (double)location.getAccuracy() : null, location.hasSpeed() ? (double)location.getSpeed() : null, location.hasBearing() ? (double)location.getBearing() : null, location.hasAltitude() ? location.getAltitude() : null, Build.VERSION.SDK_INT >= 18 && location.isFromMockProvider(), location.getProvider()));
            try (Cursor c = db.rawQuery("SELECT tracking_id,mobile_id,sequence FROM active_tracking WHERE status='ACTIVA' ORDER BY tracking_id", null)) {
                while (c.moveToNext()) {
                    long sequence = c.getLong(2) + 1; String trackingId = c.getString(0);
                    db.execSQL("UPDATE active_tracking SET sequence=?,updated_ms=? WHERE tracking_id=?", new Object[]{sequence,now,trackingId});
                    db.insertOrThrow("position_outbox", null, outboxValues(UUID.randomUUID().toString(), captureId, trackingId, c.getString(1), sequence, iso(location.getTime()), location.getLatitude(), location.getLongitude(), location.hasAccuracy()?(double)location.getAccuracy():null, location.hasSpeed()?(double)location.getSpeed():null, location.hasBearing()?(double)location.getBearing():null, location.hasAltitude()?location.getAltitude():null, Build.VERSION.SDK_INT>=18&&location.isFromMockProvider(), "GPS_NATIVO", now));
                    generated++;
                }
            }
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
        event("GPS_CAPTURE","provider="+location.getProvider()+" accuracy="+(location.hasAccuracy()?Math.round(location.getAccuracy()):"na")+" ageMs="+Math.max(0,System.currentTimeMillis()-location.getTime()));
        event("GPS_DB_COMMIT","positions="+generated);
        if(generated>0) event("GPS_OUTBOX_CREATED","positions="+generated);
        logPendingCount();
        return generated;
    }

    synchronized UploadBatch claimBatch(long createdBeforeOrAtMs) throws Exception {
        long now = System.currentTimeMillis();
        getWritableDatabase().execSQL("UPDATE position_outbox SET state='PENDIENTE',sending_since_ms=NULL,updated_ms=? WHERE state='ENVIANDO' AND sending_since_ms<?", new Object[]{now, now-300000});
        String trackingId = null; int limit = 50;
        try (Cursor c = getReadableDatabase().rawQuery("SELECT o.tracking_id,c.batch_size FROM position_outbox o JOIN tracking_config c ON c.id=1 JOIN active_tracking a ON a.tracking_id=o.tracking_id WHERE o.state='PENDIENTE' AND o.next_retry_ms<=? AND o.created_ms<=? AND a.status IN ('ACTIVA','PAUSADA_FINALIZACION','FINALIZANDO') ORDER BY o.created_ms LIMIT 1", new String[]{String.valueOf(now),String.valueOf(createdBeforeOrAtMs)})) {
            if (c.moveToFirst()) { trackingId=c.getString(0); limit=c.getInt(1); }
        }
        if (trackingId == null) return null;
        UploadBatch batch = new UploadBatch(); batch.trackingId=trackingId;
        try (Cursor c = getReadableDatabase().rawQuery("SELECT a.mobile_id,a.device_uuid,a.token_cipher,a.token_iv,c.base_url,c.app_version,c.timeout_ms,c.max_short_retries FROM active_tracking a JOIN tracking_config c ON c.id=1 WHERE a.tracking_id=?", new String[]{trackingId})) {
            if (!c.moveToFirst() || c.isNull(2) || c.isNull(3)) return null;
            batch.mobileId=c.getString(0); batch.deviceUuid=c.getString(1); batch.token=cipher.decrypt(c.getBlob(2),c.getBlob(3)); batch.endpoint=c.getString(4)+"/Webserviceproveedor.asmx/Recibe_Posiciones_Seguimiento"; batch.appVersion=c.getString(5); batch.timeoutMs=c.getInt(6); batch.shortRetries=c.getInt(7);
        }
        List<String> ids = new ArrayList<>();
        try (Cursor c = getReadableDatabase().rawQuery("SELECT uuid_position,mobile_id,sequence,date_utc,latitude,longitude,accuracy,speed,bearing,altitude,mocked,origin FROM position_outbox WHERE tracking_id=? AND state='PENDIENTE' AND next_retry_ms<=? AND created_ms<=? ORDER BY created_ms LIMIT ?", new String[]{trackingId,String.valueOf(now),String.valueOf(createdBeforeOrAtMs),String.valueOf(limit)})) {
            while(c.moveToNext()) { OutboxItem p=new OutboxItem(); p.uuidPosition=c.getString(0); p.trackingId=trackingId; p.mobileId=c.getString(1); p.sequence=c.isNull(2)?null:c.getLong(2); p.dateUtc=c.getString(3); p.latitude=c.getDouble(4); p.longitude=c.getDouble(5); p.accuracy=dbl(c,6); p.speed=dbl(c,7); p.bearing=dbl(c,8); p.altitude=dbl(c,9); p.mocked=c.getInt(10)==1; p.origin=c.getString(11); batch.items.add(p); ids.add(p.uuidPosition); }
        }
        markSending(ids,now); return batch;
    }

    synchronized void confirm(Set<String> accepted, List<OutboxItem> sent) {
        SQLiteDatabase db=getWritableDatabase(); long now=System.currentTimeMillis(); db.beginTransaction();
        try { for(OutboxItem p:sent) if(accepted.contains(p.uuidPosition)) db.execSQL("UPDATE position_outbox SET state='CONFIRMADA',sending_since_ms=NULL,updated_ms=?,last_error=NULL WHERE uuid_position=?",new Object[]{now,p.uuidPosition}); db.setTransactionSuccessful(); } finally { db.endTransaction(); }
        completeFinalizations();
        logPendingCount();
    }

    synchronized void fail(List<OutboxItem> sent, String code, boolean credentialError) {
        long now=System.currentTimeMillis(); SQLiteDatabase db=getWritableDatabase(); db.beginTransaction();
        try { for(OutboxItem p:sent) { int attempts=attempts(p.uuidPosition)+1; long backoff=Math.min(60L*60L*1000L,15000L*(1L<<Math.min(attempts-1,8))); db.execSQL("UPDATE position_outbox SET state=?,attempts=?,next_retry_ms=?,sending_since_ms=NULL,updated_ms=?,last_error=? WHERE uuid_position=?",new Object[]{credentialError?CREDENTIAL_ERROR:PENDING,attempts,now+backoff,now,safe(code),p.uuidPosition}); } db.setTransactionSuccessful(); } finally { db.endTransaction(); }
        logPendingCount();
    }

    synchronized void releaseUnacknowledged(List<OutboxItem> sent, Set<String> accepted) { List<OutboxItem> missing=new ArrayList<>(); for(OutboxItem p:sent) if(!accepted.contains(p.uuidPosition)) missing.add(p); fail(missing,"ACK_INCOMPLETO",false); }

    synchronized boolean hasWork() { return scalar("SELECT COUNT(*) FROM active_tracking WHERE status IN ('ACTIVA','PAUSADA_FINALIZACION','FINALIZANDO')",null)>0 || scalar("SELECT COUNT(*) FROM position_outbox WHERE state IN ('PENDIENTE','ENVIANDO')",null)>0; }
    synchronized boolean hasActive() { return scalar("SELECT COUNT(*) FROM active_tracking WHERE status='ACTIVA'",null)>0; }
    synchronized long intervalMs() { return scalarLong("SELECT interval_ms FROM tracking_config WHERE id=1",null,1000); }
    synchronized float distanceM() { try(Cursor c=getReadableDatabase().rawQuery("SELECT distance_m FROM tracking_config WHERE id=1",null)){ return c.moveToFirst()?c.getFloat(0):0f; } }
    synchronized boolean configured() { return scalar("SELECT COUNT(*) FROM tracking_config WHERE id=1",null)==1; }
    synchronized boolean migrationComplete() { return currentMigrationFlag()==1; }

    synchronized String policyMode() {
        String value=lastText("SELECT policy_mode FROM tracking_runtime_state WHERE id=1");
        return value==null||value.trim().isEmpty()?"WARN":value;
    }

    synchronized JSONObject setPolicyMode(String requested) throws JSONException {
        String value=requested==null?"":requested.trim().toUpperCase(Locale.US);
        if(!"OBSERVE".equals(value)&&!"WARN".equals(value)&&!"ENFORCE".equals(value))
            throw new IllegalArgumentException("Modo de politica no soportado.");
        ContentValues v=new ContentValues();v.put("policy_mode",value);v.put("updated_ms",System.currentTimeMillis());
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
        event("POLICY_MODE_CHANGED","mode="+value);
        JSONObject result=new JSONObject();result.put("mode",value);return result;
    }

    synchronized void recordLocationRegistration(String generation,long wallMs,long elapsedMs) {
        ContentValues v=new ContentValues();v.put("location_registration_generation",generation);v.put("location_registration_started_ms",wallMs);v.put("location_registration_started_elapsed_ms",elapsedMs);v.put("updated_ms",wallMs);
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
    }

    synchronized void clearLocationRegistration() {
        ContentValues v=new ContentValues();v.putNull("location_registration_generation");v.putNull("location_registration_started_ms");v.putNull("location_registration_started_elapsed_ms");v.put("updated_ms",System.currentTimeMillis());
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
    }

    synchronized void recordLocationCallback(long wallMs,long elapsedMs,String registrationGeneration) {
        ContentValues v=new ContentValues();v.put("last_location_callback_ms",wallMs);v.put("last_location_callback_elapsed_ms",elapsedMs);v.put("last_location_callback_registration_generation",registrationGeneration);v.put("updated_ms",wallMs);
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
    }

    synchronized long lastLocationCallbackMs() {
        return scalarLong("SELECT last_location_callback_ms FROM tracking_runtime_state WHERE id=1",null,0);
    }

    synchronized long lastLocationCallbackElapsedMs() {
        return scalarLong("SELECT last_location_callback_elapsed_ms FROM tracking_runtime_state WHERE id=1",null,0);
    }

    synchronized String lastLocationCallbackRegistrationGeneration() {
        return lastText("SELECT last_location_callback_registration_generation FROM tracking_runtime_state WHERE id=1");
    }

    synchronized String locationRegistrationGeneration() {
        return lastText("SELECT location_registration_generation FROM tracking_runtime_state WHERE id=1");
    }

    synchronized long locationRegistrationStartedMs() {
        return scalarLong("SELECT location_registration_started_ms FROM tracking_runtime_state WHERE id=1",null,0);
    }

    synchronized long locationRegistrationStartedElapsedMs() {
        return scalarLong("SELECT location_registration_started_elapsed_ms FROM tracking_runtime_state WHERE id=1",null,0);
    }

    synchronized long serviceCreatedMs() {
        return scalarLong("SELECT service_created_ms FROM tracking_runtime_state WHERE id=1",null,0);
    }

    synchronized long locationStaleThresholdMs() {
        return Math.max(90000L,intervalMs()*6L);
    }

    synchronized void recordPolicyStart(boolean userOverrideUsed,JSONObject snapshot) {
        ContentValues v=new ContentValues();v.put("last_start_user_override",userOverrideUsed?1:0);
        JSONObject enforcement=snapshot==null?null:snapshot.optJSONObject("enforcement");
        JSONObject decision=snapshot==null?null:snapshot.optJSONObject("decision");
        v.put("last_policy_mode",enforcement==null?policyMode():enforcement.optString("mode",policyMode()));
        v.put("last_policy_decision",decision==null?null:decision.toString());v.put("updated_ms",System.currentTimeMillis());
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
    }

    synchronized boolean lastStartUserOverrideUsed() {
        return scalar("SELECT last_start_user_override FROM tracking_runtime_state WHERE id=1",null)==1;
    }

    synchronized void recordServiceCreated(String generation) {
        long now=System.currentTimeMillis();ContentValues v=new ContentValues();v.put("service_generation",generation);v.put("service_created_ms",now);v.putNull("service_destroyed_ms");v.put("updated_ms",now);
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
    }

    synchronized void recordServiceDestroyed() {
        long now=System.currentTimeMillis();ContentValues v=new ContentValues();v.put("service_destroyed_ms",now);v.put("last_start_user_override",0);v.put("updated_ms",now);
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
    }

    synchronized HealthUpdate applyHealthSnapshot(JSONObject snapshot) throws JSONException {
        JSONObject decision=snapshot.getJSONObject("decision");
        JSONObject location=snapshot.getJSONObject("location");
        String currentHealth=decision.getString("mode");
        JSONArray currentReasons=decision.getJSONArray("reasons");
        String currentReasonsValue=currentReasons.toString();
        String previousHealth=lastText("SELECT current_health FROM tracking_runtime_state WHERE id=1");
        String previousReasons=lastText("SELECT current_health_reasons FROM tracking_runtime_state WHERE id=1");

        HealthUpdate update=new HealthUpdate();
        update.changed=previousHealth==null||!previousHealth.equals(currentHealth)||previousReasons==null||!previousReasons.equals(currentReasonsValue);
        update.locationCallbackRecovered=containsReason(previousReasons,"LOCATION_STALE")
                && !containsReason(currentReasonsValue,"LOCATION_STALE")
                && location.optBoolean("currentSessionCallback",false);
        update.trackingRecovered=isUnhealthy(previousHealth)&&"READY".equals(currentHealth);

        ContentValues v=new ContentValues();v.put("current_health",currentHealth);v.put("current_health_reasons",currentReasonsValue);v.put("current_health_updated_ms",System.currentTimeMillis());v.put("updated_ms",System.currentTimeMillis());
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);

        if(update.locationCallbackRecovered) event("LOCATION_CALLBACK_RECOVERED","health="+currentHealth);
        if(update.trackingRecovered) event("TRACKING_RECOVERED","from="+previousHealth+" to="+currentHealth);
        else if(update.changed&&("DEGRADED".equals(currentHealth)||"BLOCKED".equals(currentHealth)))
            event("TRACKING_DEGRADED","health="+currentHealth+" reasons="+currentReasonsValue);
        return update;
    }

    synchronized boolean applyPowerRestrictionSnapshot(boolean backgroundRestricted) {
        long previous=scalarLong("SELECT current_background_restricted FROM tracking_runtime_state WHERE id=1",null,-1);
        ContentValues v=new ContentValues();v.put("current_background_restricted",backgroundRestricted?1:0);v.put("updated_ms",System.currentTimeMillis());
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
        return previous==1&&!backgroundRestricted;
    }

    synchronized void recordRemediationAction(String action) {
        ContentValues v=new ContentValues();v.put("last_remediation_action",safe(action));v.put("last_remediation_action_ms",System.currentTimeMillis());v.put("updated_ms",System.currentTimeMillis());
        getWritableDatabase().update("tracking_runtime_state",v,"id=1",null);
    }

    synchronized JSONObject state(boolean serviceActive) throws JSONException {
        JSONObject o=new JSONObject(); int active=scalar("SELECT COUNT(*) FROM active_tracking WHERE status='ACTIVA'",null); int pending=scalar("SELECT COUNT(*) FROM position_outbox WHERE state='PENDIENTE'",null); int sending=scalar("SELECT COUNT(*) FROM position_outbox WHERE state='ENVIANDO'",null);
        o.put("configurado",configured()); o.put("servicioActivo",serviceActive); o.put("servicioCreado",serviceActive); o.put("servicioForeground",JSONObject.NULL); o.put("servicioForegroundSolicitado",TrackingForegroundService.isForegroundPromotionRequested()); o.put("seguimientosActivos",active); o.put("seguimientosFinalizando",scalar("SELECT COUNT(*) FROM active_tracking WHERE status='FINALIZANDO'",null)); o.put("posicionesPendientes",pending); o.put("pendientes",pending); o.put("posicionesEnviando",sending); o.put("enviando",sending); o.put("posicionesConfirmadasRecientes",scalar("SELECT COUNT(*) FROM position_outbox WHERE state='CONFIRMADA' AND updated_ms>?",new String[]{String.valueOf(System.currentTimeMillis()-86400000)})); o.put("errorCredencial",scalar("SELECT COUNT(*) FROM position_outbox WHERE state='ERROR_CREDENCIAL'",null)); o.put("migracionCompletada",currentMigrationFlag()==1); o.put("migracionCompleta",currentMigrationFlag()==1); o.put("intervaloMs",intervalMs()); o.put("distanciaMetros",distanceM()); o.put("versionEsquema",4); o.put("modoPolitica",policyMode()); o.put("healthActual",lastText("SELECT current_health FROM tracking_runtime_state WHERE id=1")); o.put("reasonsActuales",lastText("SELECT current_health_reasons FROM tracking_runtime_state WHERE id=1")); putTime(o,"ultimoCallbackUbicacionUtc","SELECT last_location_callback_ms FROM tracking_runtime_state WHERE id=1"); putTime(o,"ultimaCapturaUtc","SELECT MAX(captured_ms) FROM location_capture"); putTime(o,"ultimaPersistenciaUtc","SELECT MAX(created_ms) FROM position_outbox"); putTime(o,"ultimoEnvioUtc","SELECT MAX(updated_ms) FROM position_outbox WHERE attempts>0 OR state='CONFIRMADA'"); o.put("ultimoResultadoEnvio",lastText("SELECT state FROM position_outbox ORDER BY updated_ms DESC LIMIT 1")); o.put("proveedor",lastText("SELECT provider FROM location_capture ORDER BY captured_ms DESC LIMIT 1")); return o;
    }
    synchronized JSONObject stats(boolean serviceActive) throws JSONException { JSONObject o=state(serviceActive); o.put("capturas",scalar("SELECT COUNT(*) FROM location_capture",null)); o.put("confirmadas",scalar("SELECT COUNT(*) FROM position_outbox WHERE state='CONFIRMADA'",null)); o.put("eventosTecnicos",scalar("SELECT COUNT(*) FROM technical_event",null)); return o; }

    synchronized void event(String type,String detail){ writeEvent(type,detail,180); }
    synchronized void diagnosticEvent(String type,String detail){ writeEvent(type,detail,3500); }
    private void logPendingCount(){event("GPS_PENDING_COUNT","pending="+scalar("SELECT COUNT(*) FROM position_outbox WHERE state='PENDIENTE'",null)+" sending="+scalar("SELECT COUNT(*) FROM position_outbox WHERE state='ENVIANDO'",null));}
    private void writeEvent(String type,String detail,int maxDetail){String safeType=safe(type);String safeDetail=safe(detail,maxDetail);String prefix=(safeType.startsWith("SCREEN_")?"[APP]":"[GPS_NATIVE]")+"["+safeType+"]";Log.i("ComacoTracking",prefix+" utc="+iso(System.currentTimeMillis())+" elapsed="+SystemClock.elapsedRealtime()+" pid="+android.os.Process.myPid()+(safeDetail==null?"":" "+safeDetail));ContentValues v=new ContentValues();v.put("event_type",safeType);v.put("detail",safeDetail);v.put("created_ms",System.currentTimeMillis());getWritableDatabase().insert("technical_event",null,v);}

    private void completeFinalizations(){ SQLiteDatabase db=getWritableDatabase(); db.execSQL("UPDATE active_tracking SET status='FINAL',token_cipher=NULL,token_iv=NULL,updated_ms=? WHERE status='FINALIZANDO' AND NOT EXISTS (SELECT 1 FROM position_outbox o WHERE o.tracking_id=active_tracking.tracking_id AND o.state NOT IN ('CONFIRMADA','FINAL'))",new Object[]{System.currentTimeMillis()}); }
    private void markSending(List<String> ids,long now){ SQLiteDatabase db=getWritableDatabase(); db.beginTransaction(); try{for(String id:ids)db.execSQL("UPDATE position_outbox SET state='ENVIANDO',sending_since_ms=?,updated_ms=? WHERE uuid_position=? AND state='PENDIENTE'",new Object[]{now,now,id});db.setTransactionSuccessful();}finally{db.endTransaction();}}
    private int attempts(String id){try(Cursor c=getReadableDatabase().rawQuery("SELECT attempts FROM position_outbox WHERE uuid_position=?",new String[]{id})){return c.moveToFirst()?c.getInt(0):0;}}
    private static Double dbl(Cursor c,int i){return c.isNull(i)?null:c.getDouble(i);}
    private int scalar(String sql,String[] args){return (int)scalarLong(sql,args,0);}
    private long scalarLong(String sql,String[] args,long fallback){try(Cursor c=getReadableDatabase().rawQuery(sql,args)){return c.moveToFirst()?c.getLong(0):fallback;}}
    private String lastText(String sql){try(Cursor c=getReadableDatabase().rawQuery(sql,null)){return c.moveToFirst()&&!c.isNull(0)?c.getString(0):null;}}
    private String text(String sql,String[] args){try(Cursor c=getReadableDatabase().rawQuery(sql,args)){return c.moveToFirst()&&!c.isNull(0)?c.getString(0):null;}}
    private void putTime(JSONObject o,String key,String sql)throws JSONException{try(Cursor c=getReadableDatabase().rawQuery(sql,null)){o.put(key,c.moveToFirst()&&!c.isNull(0)?iso(c.getLong(0)):JSONObject.NULL);}}
    private static String safe(String value){return safe(value,180);}
    private static String safe(String value,int max){if(value==null)return null;return value.length()>max?value.substring(0,max):value;}
    private static boolean containsReason(String json,String reason){return json!=null&&json.contains("\""+reason+"\"");}
    private static boolean isUnhealthy(String health){return "BLOCKED".equals(health)||"DEGRADED".equals(health);}
    private static long bounded(long value,long min,long max,String name){if(value<min||value>max)throw new IllegalArgumentException(name+" fuera de rango.");return value;}
    private static double boundedDouble(double value,double min,double max,String name){if(!Double.isFinite(value)||value<min||value>max)throw new IllegalArgumentException(name+" fuera de rango.");return value;}
    private static String required(JSONObject o,String key)throws JSONException{String v=o.getString(key).trim();if(v.isEmpty()||"null".equalsIgnoreCase(v)||"undefined".equalsIgnoreCase(v))throw new JSONException(key+" es obligatorio.");return v;}
    private static String uuid(JSONObject o,String key)throws JSONException{String v=required(o,key);UUID.fromString(v);return v;}
    private static String uuidValue(String value,String name){String v=value==null?"":value.trim();if(v.isEmpty())throw new IllegalArgumentException(name+" es obligatorio.");UUID.fromString(v);return v;}
    private static String partial(String value){return value==null?"":value.substring(0,Math.min(8,value.length()));}
    private static Double nullable(JSONObject o,String key)throws JSONException{return !o.has(key)||o.isNull(key)?null:o.getDouble(key);}
    private static boolean valid(Location l){return l!=null&&Double.isFinite(l.getLatitude())&&Double.isFinite(l.getLongitude())&&l.getLatitude()>=-90&&l.getLatitude()<=90&&l.getLongitude()>=-180&&l.getLongitude()<=180;}
    static String iso(long time){java.text.SimpleDateFormat f=new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",Locale.US);f.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));return f.format(new java.util.Date(time));}
    private static void put(ContentValues v,String key,Double value){if(value==null)v.putNull(key);else v.put(key,value);}
    private static ContentValues captureValues(String id,String date,double lat,double lon,Double accuracy,Double speed,Double bearing,Double altitude,boolean mocked,String provider){ContentValues v=new ContentValues();v.put("uuid_capture",id);v.put("captured_ms",date==null||date.isEmpty()?System.currentTimeMillis():parseDate(date));v.put("date_utc",date==null||date.isEmpty()?iso(System.currentTimeMillis()):date);v.put("latitude",lat);v.put("longitude",lon);put(v,"accuracy",accuracy);put(v,"speed",speed);put(v,"bearing",bearing);put(v,"altitude",altitude);v.put("mocked",mocked?1:0);v.put("provider",provider==null?"GPS":provider);return v;}
    private static ContentValues outboxValues(String position,String capture,String tracking,String mobile,Long sequence,String date,double lat,double lon,Double accuracy,Double speed,Double bearing,Double altitude,boolean mocked,String origin,long now){ContentValues v=new ContentValues();v.put("uuid_position",position);v.put("uuid_capture",capture);v.put("tracking_id",tracking);v.put("mobile_id",mobile);if(sequence==null)v.putNull("sequence");else v.put("sequence",sequence);v.put("date_utc",date);v.put("latitude",lat);v.put("longitude",lon);put(v,"accuracy",accuracy);put(v,"speed",speed);put(v,"bearing",bearing);put(v,"altitude",altitude);v.put("mocked",mocked?1:0);v.put("origin",origin);v.put("state",PENDING);v.put("attempts",0);v.put("next_retry_ms",0);v.put("created_ms",now);v.put("updated_ms",now);return v;}
    private static long parseDate(String date){
        String[] patterns={"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'","yyyy-MM-dd'T'HH:mm:ss'Z'"};
        for(String pattern:patterns){try{java.text.SimpleDateFormat f=new java.text.SimpleDateFormat(pattern,Locale.US);f.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));return f.parse(date).getTime();}catch(Exception ignored){}}
        return System.currentTimeMillis();
    }
}
