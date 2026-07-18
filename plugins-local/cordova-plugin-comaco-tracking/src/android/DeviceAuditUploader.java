package io.gestionasi.comaco.tracking;

import org.json.JSONArray;
import org.json.JSONObject;

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
        if (closed.get()) return;
        if (!draining.compareAndSet(false, true)) return;
        executor.execute(() -> {
            try {
                for (int i = 0; i < 20; i++) {
                    DeviceAuditStore.Batch batch = store.claimBatch();
                    if (batch == null || batch.events.isEmpty()) break;
                    if (!upload(batch)) break;
                }
            } catch (Exception ignored) {
                // El uploader de auditorías nunca modifica el health ni el outbox GPS.
            } finally {
                draining.set(false);
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
            store.fail(batch.events, exception.getMessage());
            return false;
        } finally {
            batch.token = null;
        }
    }

    private void uploadOnce(DeviceAuditStore.Batch batch) throws Exception {
        HttpsURLConnection connection = null;
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
        collectIds(response.optJSONArray("ID_EVENTOS_ACEPTADOS"), sent, accepted);
        collectIds(response.optJSONArray("ID_EVENTOS_DUPLICADOS"), sent, accepted);

        String serverState = response.optString("ESTADO_DISPOSITIVO", null);
        store.confirm(accepted, batch.events, serverState);

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

    private static void collectIds(JSONArray values, Set<String> sent, Set<String> accepted)
            throws Exception {
        if (values == null) return;
        for (int i = 0; i < values.length(); i++) {
            String id = values.getString(i);
            if (!sent.contains(id) || !accepted.add(id)) {
                throw new IllegalStateException("ACK_AUDITORIA_INVALIDO");
            }
        }
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
}
