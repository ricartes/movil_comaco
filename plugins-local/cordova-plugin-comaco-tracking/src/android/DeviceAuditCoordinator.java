package io.gestionasi.comaco.tracking;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;

import org.json.JSONObject;

final class DeviceAuditCoordinator {
    private final Context context;
    private final TrackingStore trackingStore;
    private final PowerPolicyInspector inspector;
    private final DeviceAuditStore auditStore;
    private final DeviceAuditUploader uploader;

    DeviceAuditCoordinator(
            Context context,
            TrackingStore trackingStore,
            PowerPolicyInspector inspector) {
        this.context = context.getApplicationContext();
        this.trackingStore = trackingStore;
        this.inspector = inspector;
        this.auditStore = new DeviceAuditStore(this.context);
        this.uploader = new DeviceAuditUploader(auditStore, () -> {
            if (auditStore.hasPending() && auditStore.canUpload()) {
                DeviceAuditJobService.schedule(this.context);
            }
        });
    }

    JSONObject configure(JSONObject input) throws Exception {
        auditStore.configure(input.getString("URL_SERVICIO"));
        JSONObject snapshot = collect("apertura_aplicacion");
        auditStore.enqueueConfiguration(snapshot, null, null, networkAvailable());
        DeviceAuditJobService.scheduleDaily(context);
        if (auditStore.hasPending() && auditStore.canUpload()) {
            DeviceAuditJobService.schedule(context);
            uploader.drain("configuracion");
        }
        JSONObject state = auditStore.state();
        state.put("SNAPSHOT", snapshot);
        return state;
    }

    JSONObject prepareLogin(JSONObject input) throws Exception {
        String loginType = input == null ? "ONLINE"
                : input.optString("TIPO_LOGIN", "ONLINE");
        String userKey = input == null ? null : input.optString("USER_KEY", null);
        String requestedId = input == null ? null : input.optString("ID_EVENTO", null);
        JSONObject snapshot = collect("login_preparado");
        DeviceAuditStore.Event event = auditStore.enqueueLogin(
                snapshot, loginType, null, userKey, networkAvailable(), requestedId);
        JSONObject result = new JSONObject();
        result.put("ID_INSTALACION", auditStore.state().getString("ID_INSTALACION"));
        result.put("VERSION_ESQUEMA", 1);
        result.put("EVENTO", event.toJson());
        return result;
    }

    JSONObject confirmOnline(JSONObject input) throws Exception {
        if (input == null) throw new IllegalArgumentException("CONFIRMACION_REQUERIDA");
        String eventId = input.getString("ID_EVENTO");
        long userId = input.getLong("ID_USUARIO");
        String token = input.optString("TOKEN_INSTALACION", null);
        String userKey = input.optString("USER_KEY", null);
        boolean confirmed = input.optBoolean("AUDITORIA_CONFIRMADA", false);
        String state = input.optString("ESTADO_DISPOSITIVO", null);
        auditStore.confirmOnline(eventId, token, userId, userKey, confirmed, state);
        if (auditStore.hasPending() && auditStore.canUpload()) {
            DeviceAuditJobService.schedule(context);
            uploader.drain("login_online");
        }
        return auditStore.state();
    }

    JSONObject recordLocalLogin(JSONObject input) throws Exception {
        if (input == null) throw new IllegalArgumentException("LOGIN_AUDITORIA_REQUERIDO");
        Long userId = input.has("ID_USUARIO") && !input.isNull("ID_USUARIO")
                && input.optLong("ID_USUARIO", 0) > 0
                ? input.getLong("ID_USUARIO")
                : null;
        String userKey = input.optString("USER_KEY", null);
        String loginType = input.optString("TIPO_LOGIN", "OFFLINE");
        JSONObject snapshot = collect("login_exitoso");
        DeviceAuditStore.Event event = auditStore.enqueueLogin(
                snapshot, loginType, userId, userKey, networkAvailable(), null);
        if ("OFFLINE".equalsIgnoreCase(loginType)) {
            auditStore.logEvent("AUDIT_LOGIN_OFFLINE_SUCCESS", "id="
                    + event.id.substring(0, Math.min(8, event.id.length()))
                    + " userIdAvailable=" + (userId != null));
        }
        if (auditStore.canUpload()) {
            DeviceAuditJobService.schedule(context);
            uploader.drain("login_local");
        }
        JSONObject result = auditStore.state();
        result.put("ID_EVENTO", event.id);
        return result;
    }

    JSONObject collectConfiguration(JSONObject input) throws Exception {
        Long userId = input != null && input.optLong("ID_USUARIO", 0) > 0
                ? input.getLong("ID_USUARIO")
                : null;
        String userKey = input == null ? null : input.optString("USER_KEY", null);
        String reason = input == null ? "configuracion" : input.optString("MOTIVO", "configuracion");
        JSONObject snapshot = collect(reason);
        DeviceAuditStore.Event event = auditStore.enqueueConfiguration(
                snapshot, userId, userKey, networkAvailable());
        if ((event != null || auditStore.hasPending()) && auditStore.canUpload()) {
            DeviceAuditJobService.schedule(context);
            uploader.drain(reason);
        }
        JSONObject result = auditStore.state();
        result.put("SNAPSHOT", snapshot);
        result.put("ID_EVENTO", event == null ? JSONObject.NULL : event.id);
        return result;
    }

    JSONObject discard(JSONObject input) throws Exception {
        if (input != null) auditStore.discard(input.optString("ID_EVENTO", null));
        return auditStore.state();
    }

    JSONObject drain(String reason) throws Exception {
        boolean online = networkAvailable();
        if (online) {
            auditStore.logEvent("AUDIT_NETWORK_AVAILABLE", "trigger=" + reason);
        }
        if ("conexion_recuperada".equals(reason)) {
            auditStore.expeditePending("network_available");
        }
        if (auditStore.canUpload()) {
            DeviceAuditJobService.schedule(context);
            uploader.drain(reason);
        } else {
            auditStore.logEvent("AUDIT_DRAIN_SKIPPED",
                    "reason=credential_unavailable trigger=" + reason);
        }
        return auditStore.state();
    }

    JSONObject state() throws Exception {
        return auditStore.state();
    }

    JSONObject installationCredential() throws Exception {
        DeviceAuditStore.InstallationCredential credential = auditStore.installationCredential();
        if (credential == null) {
            throw new IllegalStateException("CREDENCIAL_INSTALACION_NO_DISPONIBLE");
        }
        try {
            return credential.toJson();
        } finally {
            credential.clear();
        }
    }

    void close() {
        uploader.close();
        auditStore.close();
    }

    private JSONObject collect(String reason) throws Exception {
        return inspector.inspect(trackingStore, reason, false);
    }

    @SuppressWarnings("deprecation")
    private boolean networkAvailable() {
        ConnectivityManager manager =
                (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return false;
        try {
            NetworkInfo info = manager.getActiveNetworkInfo();
            return info != null && info.isConnected();
        } catch (RuntimeException ignored) {
            return false;
        }
    }
}
