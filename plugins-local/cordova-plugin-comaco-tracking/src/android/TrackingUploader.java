package io.gestionasi.comaco.tracking;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.net.ssl.HttpsURLConnection;

import android.os.SystemClock;

final class TrackingUploader {
    private static final Set<String> CREDENTIAL_CODES = new HashSet<>(Arrays.asList(
            "CREDENCIAL_NO_AUTORIZADA", "CREDENCIAL_REVOCADA", "CREDENCIAL_EXPIRADA",
            "DISPOSITIVO_NO_AUTORIZADO", "SEGUIMIENTO_NO_ACTIVO",
            "CREDENCIAL_INSTALACION_INVALIDA", "CREDENCIAL_INSTALACION_NO_AUTORIZADA",
            "DISPOSITIVO_REVOCADO", "DEVICE_TRACKING_MISMATCH"));

    private enum UploadOutcome {
        SUCCESS,
        TRACKING_FAILURE,
        GLOBAL_FAILURE
    }

    private final TrackingStore store;
    private final DeviceAuditStore identityStore;
    private final Runnable onFinished;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean draining = new AtomicBoolean(false);
    private final AtomicBoolean drainRequested = new AtomicBoolean(false);
    private final TrackingPriorityBatchClaimer priorityClaimer;
    private final Set<String> preparedFinalizations = new HashSet<>();
    private volatile String latestDrainReason = "manual";

    TrackingUploader(TrackingStore store, DeviceAuditStore identityStore, Runnable onFinished) {
        this.store = store;
        this.identityStore = identityStore;
        this.onFinished = onFinished;
        this.priorityClaimer = new TrackingPriorityBatchClaimer(store);
    }

    void drain(String reason) {
        latestDrainReason = normalizeReason(reason);
        drainRequested.set(true);

        if (!draining.compareAndSet(false, true)) {
            // Una solicitud de finalización puede llegar mientras el drenaje periódico
            // todavía está enviando. No se descarta: queda coalescida y se ejecutará
            // inmediatamente al terminar el ciclo actual.
            store.event("GPS_DRAIN_QUEUED",
                    "reason=single_flight trigger=" + latestDrainReason);
            return;
        }

        executor.execute(this::drainLoop);
    }

    private void drainLoop() {
        try {
            do {
                drainRequested.set(false);
                drainOnce(latestDrainReason);
            } while (drainRequested.get());
        } finally {
            draining.set(false);

            // Cierra la carrera entre la última comprobación del bucle y la
            // liberación del single-flight. Si entró una solicitud en esa ventana,
            // vuelve a adquirir el worker sin perderla.
            if (drainRequested.get()) {
                drain("coalesced_after_release");
                return;
            }

            if (onFinished != null) onFinished.run();
        }
    }

    private void drainOnce(String reason) {
        String trigger = normalizeReason(reason);
        store.event("GPS_DRAIN_BEGIN", "trigger=" + trigger);
        try {
            long drainCutoffMs = System.currentTimeMillis();
            TrackingPriorityBatchClaimer.PriorityTracking priority = priorityClaimer.findPriority();
            if (priority == null) {
                preparedFinalizations.clear();
            } else if (preparedFinalizations.add(priority.key())) {
                priorityClaimer.prepare(priority.trackingId);
            }

            for (int i = 0; i < 20; i++) {
                TrackingStore.UploadBatch batch;
                boolean priorityBatch = false;

                if (priority != null) {
                    batch = priorityClaimer.claim(priority.trackingId, drainCutoffMs);
                    if (batch != null && !batch.items.isEmpty()) {
                        priorityBatch = true;
                        // La finalización ya tiene un timeout propio. Un intento HTTP es suficiente
                        // para evitar que los reintentos cortos consuman toda la ventana de espera.
                        batch.shortRetries = 0;
                    } else {
                        priority = null;
                        batch = store.claimBatch(drainCutoffMs);
                    }
                } else {
                    batch = store.claimBatch(drainCutoffMs);
                }

                if (batch == null || batch.items.isEmpty()) break;

                store.event("GPS_BATCH_SELECTED",
                        "positions=" + batch.items.size()
                                + " priority=" + priorityBatch
                                + " tracking=" + partial(batch.trackingId));

                UploadOutcome outcome = upload(batch);
                if (outcome == UploadOutcome.GLOBAL_FAILURE) break;
                if (priorityBatch && outcome == UploadOutcome.TRACKING_FAILURE) priority = null;
            }
        } catch (Exception e) {
            store.event("GPS_BACKOFF", "reason=" + errorCode(e));
        } finally {
            store.event("GPS_DRAIN_END", "trigger=" + trigger);
        }
    }

    private UploadOutcome upload(TrackingStore.UploadBatch batch) {
        store.event("GPS_HTTP_BEGIN", "positions=" + batch.items.size() + " endpoint=" + batch.endpoint);
        for (int attempt = 0; attempt <= batch.shortRetries; attempt++) {
            try {
                uploadOnce(batch);
                store.event("GPS_ACK", "positions=" + batch.items.size());
                return UploadOutcome.SUCCESS;
            } catch (CredentialFailure e) {
                store.fail(batch.items, e.code, true);
                store.event("GPS_REJECTED", "reason=" + e.code);
                return UploadOutcome.TRACKING_FAILURE;
            } catch (Exception e) {
                String code = errorCode(e);
                if (attempt < batch.shortRetries) {
                    store.event("GPS_BACKOFF",
                            "reason=short_retry code=" + code + " attempt=" + (attempt + 1));
                    continue;
                }
                store.fail(batch.items, code, false);
                store.event("GPS_REJECTED", "reason=" + code);
                return UploadOutcome.GLOBAL_FAILURE;
            }
        }
        return UploadOutcome.GLOBAL_FAILURE;
    }

    private void uploadOnce(TrackingStore.UploadBatch batch) throws Exception {
        DeviceAuditStore.InstallationCredential credential = null;
        JSONObject request;
        try {
            credential = identityStore == null ? null : identityStore.installationCredential();
            request = request(batch, credential);
        } finally {
            if (credential != null) credential.clear();
        }
        HttpsURLConnection connection = null;
        long started = SystemClock.elapsedRealtime();
        try {
            connection = (HttpsURLConnection) new URL(batch.endpoint).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(batch.timeoutMs);
            connection.setReadTimeout(batch.timeoutMs);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            byte[] bytes = request.toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(bytes);
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream();
            String body = read(stream);
            store.event("GPS_HTTP_RESULT",
                    "status=" + status + " durationMs=" + (SystemClock.elapsedRealtime() - started));
            if (status < 200 || status >= 300) throw new IllegalStateException("HTTP_" + status);
            acknowledge(batch, body);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    static JSONObject request(TrackingStore.UploadBatch batch) throws Exception {
        return request(batch, null);
    }

    static JSONObject request(
            TrackingStore.UploadBatch batch,
            DeviceAuditStore.InstallationCredential credential) throws Exception {
        JSONObject input = new JSONObject();
        input.put("ID_UNICO_SEGUIMIENTO", batch.trackingId);
        input.put("UUID_DISPOSITIVO", batch.deviceUuid);
        input.put("TOKEN_SEGUIMIENTO", batch.token);
        input.put("VERSION_APP", batch.appVersion == null ? "" : batch.appVersion);
        if (credential != null) {
            input.put("ID_INSTALACION", credential.installationId);
            input.put("TOKEN_INSTALACION", credential.token);
        }
        JSONArray positions = new JSONArray();
        for (TrackingStore.OutboxItem p : batch.items) {
            JSONObject o = new JSONObject();
            o.put("UUID_POSICION", p.uuidPosition);
            o.put("SECUENCIA_LOCAL", p.sequence == null ? JSONObject.NULL : p.sequence);
            o.put("FECHA_DISPOSITIVO_UTC", p.dateUtc);
            o.put("LATITUD", p.latitude);
            o.put("LONGITUD", p.longitude);
            nullable(o, "PRECISION_METROS", p.accuracy);
            nullable(o, "VELOCIDAD_MPS", p.speed);
            nullable(o, "RUMBO_GRADOS", p.bearing);
            nullable(o, "ALTITUD_METROS", p.altitude);
            o.put("ES_UBICACION_SIMULADA", p.mocked);
            o.put("ORIGEN_CAPTURA", p.origin);
            positions.put(o);
        }
        input.put("POSICIONES", positions);
        JSONObject wrapper = new JSONObject();
        wrapper.put("entrada", input);
        return wrapper;
    }

    private void acknowledge(TrackingStore.UploadBatch batch, String body) throws Exception {
        JSONObject root = new JSONObject(body);
        Object unwrapped = root.has("d") ? root.get("d") : root;
        if (unwrapped instanceof String) unwrapped = new JSONObject((String) unwrapped);
        if (!(unwrapped instanceof JSONObject)) throw new IllegalStateException("RESPUESTA_INVALIDA");
        JSONObject response = (JSONObject) unwrapped;
        if (!response.optBoolean("EXITO", false)) {
            String code = response.optString("CODIGO", "FALLA_FUNCIONAL");
            if (CREDENTIAL_CODES.contains(code)) throw new CredentialFailure(code);
            throw new IllegalStateException(code);
        }
        JSONArray results = response.optJSONArray("POSICIONES");
        if (results == null) throw new IllegalStateException("ACK_SIN_POSICIONES");
        Set<String> sent = new HashSet<>();
        for (TrackingStore.OutboxItem p : batch.items) sent.add(p.uuidPosition);
        Set<String> accepted = new HashSet<>();
        for (int i = 0; i < results.length(); i++) {
            JSONObject result = results.getJSONObject(i);
            String id = result.getString("UUID_POSICION");
            String state = result.getString("ESTADO");
            if (!sent.contains(id)
                    || !("INSERTADA".equals(state) || "YA_EXISTIA".equals(state))
                    || !accepted.add(id)) {
                throw new IllegalStateException("ACK_INVALIDO");
            }
        }
        store.confirm(accepted, batch.items);
        if (accepted.size() != sent.size()) store.releaseUnacknowledged(batch.items, accepted);
    }

    private static void nullable(JSONObject o, String key, Double value) throws Exception {
        o.put(key, value == null ? JSONObject.NULL : value);
    }

    private static String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder s = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) s.append(line);
        }
        return s.toString();
    }

    private static String errorCode(Exception exception) {
        String message = exception.getMessage();
        if (message != null && message.matches("[A-Z0-9_\\-]{1,80}")) return message;
        return exception.getClass().getSimpleName();
    }

    private static String normalizeReason(String reason) {
        if (reason == null) return "manual";
        String value = reason.trim();
        return value.isEmpty() ? "manual" : value;
    }

    private static String partial(String value) {
        return value == null ? "" : value.substring(0, Math.min(8, value.length()));
    }

    private static final class CredentialFailure extends Exception {
        final String code;

        CredentialFailure(String code) {
            super(code);
            this.code = code;
        }
    }
}
