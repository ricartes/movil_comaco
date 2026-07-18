package io.gestionasi.comaco.tracking;

import org.json.JSONArray;
import org.json.JSONObject;

import android.os.SystemClock;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.net.ssl.HttpsURLConnection;

final class DeviceAuditUploader {
    private static final Set<String> CREDENTIAL_ERRORS = new HashSet<>(Arrays.asList(
            "CREDENCIAL_INSTALACION_NO_AUTORIZADA", "DISPOSITIVO_REVOCADO"));
    private final DeviceAuditStore store;
    private final Runnable onFinished;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean draining = new AtomicBoolean(false);
    private final AtomicBoolean closed = new AtomicBoolean(false);

    DeviceAuditUploader(DeviceAuditStore store, Runnable onFinished) {
        this.store = store;
        this.onFinished = onFinished;
    }

    void drain(String reason) {
        if (closed.get()) {
            store.logEvent("AUDIT_DRAIN_SKIPPED", "reason=closed trigger=" + reason);
            return;
        }
        if (!draining.compareAndSet(false, true)) {
            store.logEvent("AUDIT_DRAIN_SKIPPED", "reason=single_flight trigger=" + reason);
            return;
        }
        executor.execute(() -> {
            store.logEvent("AUDIT_DRAIN_BEGIN", "trigger=" + reason);
            try {
                for (int i = 0; i < 20; i++) {
                    DeviceAuditStore.Batch batch = store.claimBatch();
                    if (batch == null || batch.events.isEmpty()) {
                        store.logEvent("AUDIT_BATCH_SELECTED", "count=0");
                        break;
                    }
                    if (!upload(batch)) break;
                }
            } catch (Exception exception) {
                store.logEvent("AUDIT_BACKOFF", "reason=" + errorCode(exception));
                // El uploader de auditorías nunca modifica el health ni el outbox GPS.
            } finally {
                draining.set(false);
                store.logEvent("AUDIT_DRAIN_END", "trigger=" + reason
                        + " pending=" + store.pendingCount());
                if (!closed.get() && onFinished != null) onFinished.run();
            }
        });
    }

    void close() {
        closed.set(true);
        executor.shutdownNow();
    }

    private boolean upload(DeviceAuditStore.Batch batch) {
        try {
            uploadOnce(batch);
            return true;
        } catch (Exception exception) {
            String code = errorCode(exception);
            store.logEvent("AUDIT_REJECTED", "count=" + batch.events.size()
                    + " reason=" + code);
            store.fail(batch.events, code);
            return false;
        } finally {
            batch.token = null;
        }
    }

    private void uploadOnce(DeviceAuditStore.Batch batch) throws Exception {
        HttpsURLConnection connection = null;
        long started = SystemClock.elapsedRealtime();
        try {
            URL url = new URL(batch.endpoint);
            if (!"https".equalsIgnoreCase(url.getProtocol())) {
                throw new IllegalArgumentException("AUDITORIA_REQUIERE_HTTPS");
            }
            connection = (HttpsURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(20000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + batch.token);
            store.logEvent("AUDIT_HTTP_BEGIN", "count=" + batch.events.size()
                    + " endpoint=" + batch.endpoint);
            byte[] body = batch.request().toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(body.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body);
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream();
            String responseBody = read(stream);
            store.logEvent("AUDIT_HTTP_RESULT", "status=" + status + " durationMs="
                    + (SystemClock.elapsedRealtime() - started));
            if (status < 200 || status >= 300) throw new IllegalStateException("HTTP_" + status);
            acknowledge(batch, responseBody);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void acknowledge(DeviceAuditStore.Batch batch, String body) throws Exception {
        JSONObject root = new JSONObject(body);
        Object value = root.has("d") ? root.get("d") : root;
        if (value instanceof String) value = new JSONObject((String) value);
        if (!(value instanceof JSONObject)) throw new IllegalStateException("RESPUESTA_AUDITORIA_INVALIDA");
        JSONObject response = (JSONObject) value;
        String code = response.optString("CODIGO", "ERROR_AUDITORIA");
        if (CREDENTIAL_ERRORS.contains(code)) throw new IllegalStateException(code);

        Set<String> sent = new HashSet<>();
        for (DeviceAuditStore.Event event : batch.events) sent.add(event.id);
        Set<String> accepted = new HashSet<>();
        int acceptedCount = collectIds(
                response.optJSONArray("ID_EVENTOS_ACEPTADOS"), sent, accepted);
        int duplicateCount = collectIds(
                response.optJSONArray("ID_EVENTOS_DUPLICADOS"), sent, accepted);

        String serverState = response.optString("ESTADO_DISPOSITIVO", null);
        store.confirm(accepted, batch.events, serverState);
        store.logEvent("AUDIT_ACCEPTED", "count=" + acceptedCount);
        store.logEvent("AUDIT_DUPLICATE", "count=" + duplicateCount);

        if (accepted.size() != sent.size()) {
            List<DeviceAuditStore.Event> rejected = new ArrayList<>();
            for (DeviceAuditStore.Event event : batch.events) {
                if (!accepted.contains(event.id)) rejected.add(event);
            }
            String rejectionCode = "OK".equals(code)
                    ? "RESPUESTA_AUDITORIA_SIN_ACK"
                    : code;
            store.fail(rejected, rejectionCode);
        }
    }

    private static int collectIds(JSONArray values, Set<String> sent, Set<String> accepted)
            throws Exception {
        if (values == null) return 0;
        int count = 0;
        for (int i = 0; i < values.length(); i++) {
            String id = values.getString(i);
            if (!sent.contains(id) || !accepted.add(id)) {
                throw new IllegalStateException("ACK_AUDITORIA_INVALIDO");
            }
            count++;
        }
        return count;
    }

    private static String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder value = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) value.append(line);
        }
        return value.toString();
    }

    private static String errorCode(Exception exception) {
        String message = exception.getMessage();
        if (message != null && message.matches("[A-Z0-9_\\-]{1,80}")) return message;
        return exception.getClass().getSimpleName();
    }
}
