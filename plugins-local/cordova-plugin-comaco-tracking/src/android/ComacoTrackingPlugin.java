package io.gestionasi.comaco.tracking;

import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONObject;

public final class ComacoTrackingPlugin extends CordovaPlugin {
    private static volatile ComacoTrackingPlugin instance;
    private TrackingStore store;
    private PowerPolicyInspector inspector;
    private DeviceAuditCoordinator deviceAudit;
    private volatile CallbackContext healthSubscription;

    @Override
    protected void pluginInitialize() {
        instance = this;
        store = new TrackingStore(cordova.getContext().getApplicationContext());
        inspector = new PowerPolicyInspector(cordova.getContext());
        try {
            deviceAudit = new DeviceAuditCoordinator(
                    cordova.getContext().getApplicationContext(), store, inspector);
        } catch (RuntimeException exception) {
            Log.i("ComacoTracking", "[AUDIT][AUDIT_BACKOFF] reason=coordinator_init_"
                    + exception.getClass().getSimpleName());
            deviceAudit = null;
        }
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callback) {
        Log.i("ComacoTracking", "[CORDOVA_ACTION] action=" + action);
        if ("suscribirEstadoSalud".equals(action)) {
            healthSubscription = callback;
            PluginResult pending = new PluginResult(PluginResult.Status.NO_RESULT);
            pending.setKeepCallback(true);
            callback.sendPluginResult(pending);
            return true;
        }
        switch (action) {
            case "configurar":
            case "sincronizarSeguimientos":
            case "registrarSeguimiento":
            case "finalizarSeguimiento":
            case "obtenerEstado":
            case "obtenerEstadisticas":
            case "solicitarDrenaje":
            case "importarPosicionesLegacy":
            case "verificarMigracion":
            case "detenerSiCorresponde":
            case "obtenerDiagnosticoPolitica":
            case "configurarModoPolitica":
            case "continuarInicioConAdvertencia":
            case "abrirConfiguracionPolitica":
            case "getPowerPolicyStatus":
            case "openPowerRestrictionSettings":
            case "requestBatteryOptimizationExemption":
            case "recheckPowerPolicy":
            case "presentPowerRemediation":
            case "prepararAuditoriaLogin":
            case "confirmarAuditoriaLoginOnline":
            case "registrarAuditoriaLogin":
            case "auditarConfiguracion":
            case "solicitarDrenajeAuditoria":
            case "descartarAuditoria":
            case "obtenerEstadoAuditoria":
            case "obtenerCredencialInstalacion":
                cordova.getThreadPool().execute(() -> run(action, args, callback));
                return true;
            default:
                return false;
        }
    }

    private void run(String action, JSONArray args, CallbackContext callback) {
        try {
            JSONObject result;
            switch (action) {
                case "configurar":
                    store.configure(args.getJSONObject(0));
                    if (deviceAudit != null) {
                        try {
                            deviceAudit.configure(args.getJSONObject(0));
                        } catch (Exception exception) {
                            Log.i("ComacoTracking", "[AUDIT][AUDIT_BACKOFF] reason=configure_"
                                    + exception.getClass().getSimpleName());
                            // La auditorÃ­a nunca bloquea la configuraciÃ³n ni el tracking GPS.
                        }
                    }
                    result = stateWithPolicy(inspect("configuracion", false));
                    break;
                case "sincronizarSeguimientos":
                    store.syncTrackings(args.optJSONArray(0) == null
                            ? new JSONArray()
                            : args.getJSONArray(0));
                    result = stateWithPolicy(ensureService("sincronizacion", false));
                    break;
                case "registrarSeguimiento":
                    store.upsertTracking(args.getJSONObject(0));
                    result = stateWithPolicy(ensureService("nuevo_seguimiento", false));
                    break;
                case "finalizarSeguimiento":
                    store.finalizeTracking(args.getJSONObject(0).getString("ID_UNICO_SEGUIMIENTO"));
                    result = stateWithPolicy(ensureService("finalizacion", false));
                    break;
                case "obtenerEstado":
                    result = stateWithPolicy(inspect("estado", currentOverrideUsed()));
                    break;
                case "obtenerEstadisticas":
                    result = augment(
                            store.stats(TrackingForegroundService.isRunning()),
                            inspect("estadisticas", currentOverrideUsed()));
                    break;
                case "solicitarDrenaje":
                    result = stateWithPolicy(ensureService(
                            args.optJSONObject(0) == null
                                    ? "manual"
                                    : args.optJSONObject(0).optString("motivo", "manual"),
                            false));
                    break;
                case "importarPosicionesLegacy":
                    JSONObject imported = new JSONObject();
                    imported.put("importadas", store.importLegacy(
                            args.optJSONArray(0) == null
                                    ? new JSONArray()
                                    : args.getJSONArray(0)));
                    imported.put("estado", stateWithPolicy(inspect("importacion_legacy", false)));
                    result = imported;
                    break;
                case "verificarMigracion":
                    result = store.verifyMigration(
                            args.optJSONObject(0) == null
                                    ? new JSONObject()
                                    : args.getJSONObject(0));
                    result.put("policyDiagnostic", inspect("verificacion_migracion", false));
                    break;
                case "detenerSiCorresponde":
                    result = stateWithPolicy(inspect("detener_si_corresponde", currentOverrideUsed()));
                    break;
                case "obtenerDiagnosticoPolitica":
                    result = inspect(
                            args.optJSONObject(0) == null
                                    ? "preflight"
                                    : args.optJSONObject(0).optString("motivo", "preflight"),
                            currentOverrideUsed());
                    store.diagnosticEvent("POWER_POLICY_DIAGNOSTIC", diagnosticDetail(result));
                    break;
                case "configurarModoPolitica":
                    JSONObject modeInput = args.optJSONObject(0);
                    store.setPolicyMode(modeInput == null ? null : modeInput.optString("mode", null));
                    result = inspect("cambio_modo_politica", currentOverrideUsed());
                    break;
                case "continuarInicioConAdvertencia":
                    result = stateWithPolicy(ensureService(
                            args.optJSONObject(0) == null
                                    ? "continuacion_explicita"
                                    : args.optJSONObject(0).optString("motivo", "continuacion_explicita"),
                            true));
                    break;
                case "abrirConfiguracionPolitica":
                case "openPowerRestrictionSettings":
                    result = performRemediationAction(
                            "OPEN_POWER_RESTRICTION_SETTINGS",
                            inspect("power_settings", currentOverrideUsed()),
                            false);
                    break;
                case "requestBatteryOptimizationExemption":
                    result = performRemediationAction(
                            "REQUEST_BATTERY_OPTIMIZATION_EXEMPTION",
                            inspect("battery_optimization_request", currentOverrideUsed()),
                            true);
                    break;
                case "getPowerPolicyStatus":
                    result = inspect("get_power_policy_status", currentOverrideUsed());
                    store.diagnosticEvent("POWER_POLICY_DIAGNOSTIC", diagnosticDetail(result));
                    break;
                case "recheckPowerPolicy":
                    store.recordRemediationAction("RECHECK");
                    result = inspect("power_policy_recheck", currentOverrideUsed());
                    store.diagnosticEvent("POWER_REMEDIATION_ACTION", powerEventDetail("RECHECK", result, null));
                    store.diagnosticEvent("POWER_POLICY_RECHECKED", powerEventDetail("RECHECK", result, null));
                    break;
                case "presentPowerRemediation":
                    result = args.optJSONObject(0);
                    if (result == null) result = new JSONObject();
                    store.diagnosticEvent("POWER_REMEDIATION_PRESENTED", powerEventDetail("PRESENT", result, null));
                    break;
                case "prepararAuditoriaLogin":
                    ensureDeviceAudit();
                    result = deviceAudit.prepareLogin(args.optJSONObject(0));
                    break;
                case "confirmarAuditoriaLoginOnline":
                    ensureDeviceAudit();
                    result = deviceAudit.confirmOnline(args.optJSONObject(0));
                    break;
                case "registrarAuditoriaLogin":
                    ensureDeviceAudit();
                    result = deviceAudit.recordLocalLogin(args.optJSONObject(0));
                    break;
                case "auditarConfiguracion":
                    ensureDeviceAudit();
                    result = deviceAudit.collectConfiguration(args.optJSONObject(0));
                    break;
                case "solicitarDrenajeAuditoria":
                    ensureDeviceAudit();
                    result = deviceAudit.drain(args.optJSONObject(0) == null
                            ? "manual"
                            : args.optJSONObject(0).optString("motivo", "manual"));
                    break;
                case "descartarAuditoria":
                    ensureDeviceAudit();
                    result = deviceAudit.discard(args.optJSONObject(0));
                    break;
                case "obtenerEstadoAuditoria":
                    ensureDeviceAudit();
                    result = deviceAudit.state();
                    break;
                case "obtenerCredencialInstalacion":
                    ensureDeviceAudit();
                    result = deviceAudit.installationCredential();
                    break;
                default:
                    throw new IllegalArgumentException("Accion no soportada.");
            }
            callback.success(result);
        } catch (Exception exception) {
            if (!isAuditAction(action)) {
                store.event("PUENTE_ERROR", action + ":" + exception.getClass().getSimpleName());
            } else {
                Log.i("ComacoTracking", "[AUDIT][AUDIT_BACKOFF] reason=bridge_"
                        + action + "_" + exception.getClass().getSimpleName());
            }
            callback.error(new JSONObject(java.util.Collections.singletonMap(
                    "codigo",
                    isAuditAction(action) ? "DEVICE_AUDIT_ERROR" : "TRACKING_NATIVE_ERROR")).toString());
        }
    }

    private static boolean isAuditAction(String action) {
        return action != null && (action.contains("Auditoria")
                || "auditarConfiguracion".equals(action)
                || "obtenerCredencialInstalacion".equals(action));
    }

    private void ensureDeviceAudit() {
        if (deviceAudit == null) throw new IllegalStateException("DEVICE_AUDIT_UNAVAILABLE");
    }

    private JSONObject ensureService(String reason, boolean explicitContinue) throws Exception {
        boolean shouldRun = store.configured()
                && store.migrationComplete()
                && (store.hasActive() || store.hasWork());
        boolean alreadyRunning = TrackingForegroundService.isRunning();
        JSONObject snapshot = inspect(reason, alreadyRunning && currentOverrideUsed());
        JSONObject decision = snapshot.getJSONObject("decision");
        JSONObject enforcement = snapshot.getJSONObject("enforcement");
        String mode = enforcement.getString("mode");
        boolean blockers = decision.getBoolean("wouldBlockInEnforceMode");
        boolean remediationRequired = snapshot.optBoolean("remediationRequired", blockers);

        store.diagnosticEvent("POWER_POLICY_PREFLIGHT", diagnosticDetail(snapshot));

        enforcement.put("startEligible", shouldRun);
        if (!shouldRun) {
            enforcement.put("requiresExplicitContinue", false);
            return snapshot;
        }
        if (alreadyRunning) {
            return snapshot;
        }

        if ("ENFORCE".equals(mode) && blockers) {
            store.event("SERVICE_START_BLOCKED_POLICY", diagnosticDetail(snapshot));
            return snapshot;
        }

        if ("WARN".equals(mode) && remediationRequired && !explicitContinue) {
            store.event("SERVICE_START_AWAITING_POLICY_OVERRIDE", diagnosticDetail(snapshot));
            return snapshot;
        }

        boolean overrideUsed = "WARN".equals(mode) && remediationRequired && explicitContinue;
        if (overrideUsed) {
            snapshot = inspect(reason, true);
            store.event("TRACKING_STARTED_WITH_POLICY_WARNING", diagnosticDetail(snapshot));
        }
        store.recordPolicyStart(overrideUsed, snapshot);
        TrackingForegroundService.start(cordova.getContext(), reason, overrideUsed);
        snapshot.put("serviceStartRequested", true);
        return snapshot;
    }

    private JSONObject inspect(String reason, boolean userOverrideUsed) throws Exception {
        JSONObject snapshot = inspector.inspect(store, reason, userOverrideUsed);
        TrackingStore.HealthUpdate update = store.applyHealthSnapshot(snapshot);
        if (store.applyPowerRestrictionSnapshot(snapshot.getBoolean("backgroundRestricted"))) {
            store.diagnosticEvent(
                    "POWER_RESTRICTION_RECOVERED",
                    powerEventDetail("RECHECK", snapshot, null));
        }
        if (update.changed) publishHealth(snapshot);
        return snapshot;
    }

    private JSONObject performRemediationAction(
            String action,
            JSONObject snapshot,
            boolean requestExemption) throws Exception {
        store.recordRemediationAction(action);
        store.diagnosticEvent("POWER_REMEDIATION_ACTION", powerEventDetail(action, snapshot, null));
        JSONObject outcome = requestExemption
                ? inspector.requestBatteryOptimizationExemption()
                : inspector.openPowerRestrictionSettings();
        snapshot.put("settingsOpened", outcome.optBoolean("settingsOpened", false));
        snapshot.put("remediationResult", outcome);
        if (!outcome.optBoolean("alreadyGranted", false)) {
            String event = outcome.optBoolean("settingsOpened", false)
                    ? "POWER_SETTINGS_OPENED"
                    : "POWER_SETTINGS_OPEN_FAILED";
            store.diagnosticEvent(event, powerEventDetail(action, snapshot, outcome));
        }
        return snapshot;
    }

    private String powerEventDetail(String action, JSONObject snapshot, JSONObject outcome) {
        JSONObject detail = new JSONObject();
        try {
            detail.put("action", action);
            detail.put("manufacturer", snapshot.optString("manufacturer", "unknown"));
            detail.put("backgroundRestricted", snapshot.optBoolean("backgroundRestricted", false));
            detail.put("ignoringBatteryOptimizations", snapshot.optBoolean("ignoringBatteryOptimizations", false));
            detail.put("health", snapshot.optString("health", "UNKNOWN"));
            detail.put("blockers", snapshot.optJSONArray("blockers"));
            detail.put("warnings", snapshot.optJSONArray("warnings"));
            if (outcome != null) {
                detail.put("success", outcome.optBoolean("success", false));
                detail.put("errorClass", jsonValue(outcome, "errorClass"));
            }
        } catch (Exception ignored) {
            return "{\"action\":\"UNKNOWN\",\"success\":false}";
        }
        return detail.toString();
    }

    private boolean currentOverrideUsed() {
        if (TrackingForegroundService.isRunning()) {
            return TrackingForegroundService.wasCurrentStartOverrideUsed();
        }
        return false;
    }

    private JSONObject stateWithPolicy(JSONObject policy) throws Exception {
        return augment(store.state(TrackingForegroundService.isRunning()), policy);
    }

    private JSONObject augment(JSONObject result, JSONObject policy) throws Exception {
        JSONObject power = policy.getJSONObject("powerPolicy");
        JSONObject permissions = policy.getJSONObject("permissions");
        JSONObject location = policy.getJSONObject("location");
        JSONObject tracking = policy.getJSONObject("tracking");
        result.put("optimizacionBateriaIgnorada", power.getBoolean("ignoringBatteryOptimizations"));
        result.put("gpsActivo", location.getBoolean("deviceLocationEnabled"));
        result.put("permisoUbicacion", permissions.getBoolean("fineLocation"));
        result.put("permisoBackground", permissions.getBoolean("backgroundLocation"));
        result.put("permisoNotificaciones", permissions.getBoolean("postNotifications"));
        result.put("optimizacionBateria",
                power.getBoolean("ignoringBatteryOptimizations") ? "IGNORADA" : "ACTIVA");
        result.put("servicioForeground", tracking.isNull("foregroundObserved")
                ? JSONObject.NULL
                : tracking.getBoolean("foregroundObserved"));
        result.put("decision", policy.getJSONObject("decision"));
        result.put("enforcement", policy.getJSONObject("enforcement"));
        result.put("policyDiagnostic", policy);
        result.put("plataforma", "android");
        return result;
    }

    private String diagnosticDetail(JSONObject snapshot) {
        JSONObject detail = new JSONObject();
        JSONObject power = snapshot.optJSONObject("powerPolicy");
        JSONObject tracking = snapshot.optJSONObject("tracking");
        JSONObject location = snapshot.optJSONObject("location");
        JSONObject decision = snapshot.optJSONObject("decision");
        JSONObject enforcement = snapshot.optJSONObject("enforcement");
        try {
            detail.put("reason", snapshot.optString("reason", "unknown"));
            detail.put("enforcementMode", enforcement == null ? JSONObject.NULL : enforcement.optString("mode"));
            detail.put("backgroundRestricted", jsonValue(power, "backgroundRestricted"));
            detail.put("ignoringBatteryOptimizations", jsonValue(power, "ignoringBatteryOptimizations"));
            detail.put("standbyBucket", jsonValue(power, "standbyBucket"));
            detail.put("logicalActive", jsonValue(tracking, "logicalActive"));
            detail.put("serviceCreated", jsonValue(tracking, "serviceCreated"));
            detail.put("foregroundRequested", jsonValue(tracking, "foregroundRequested"));
            detail.put("foregroundObserved", jsonValue(tracking, "foregroundObserved"));
            detail.put("foregroundObservationSource", jsonValue(tracking, "foregroundObservationSource"));
            detail.put("updatesRegistered", jsonValue(location, "updatesRegistered"));
            detail.put("lastCallbackUtc", jsonValue(location, "lastCallbackUtc"));
            detail.put("lastCallbackAgeMs", jsonValue(location, "lastCallbackAgeMs"));
            detail.put("firstFixGraceActive", jsonValue(location, "firstFixGraceActive"));
            detail.put("firstFixGraceRemainingMs", jsonValue(location, "firstFixGraceRemainingMs"));
            detail.put("warnings", decision == null ? new JSONArray() : decision.optJSONArray("warnings"));
            detail.put("reasons", decision == null ? new JSONArray() : decision.optJSONArray("reasons"));
            detail.put("blockers", decision == null ? new JSONArray() : decision.optJSONArray("blockers"));
            detail.put("health", decision == null ? JSONObject.NULL : decision.optString("mode"));
        } catch (Exception ignored) {
            return "{\"diagnosticSerializationError\":true}";
        }
        return detail.toString();
    }

    static void publishHealth(JSONObject snapshot) {
        ComacoTrackingPlugin current = instance;
        CallbackContext subscription = current == null ? null : current.healthSubscription;
        if (subscription == null) return;
        PluginResult result = new PluginResult(PluginResult.Status.OK, snapshot);
        result.setKeepCallback(true);
        subscription.sendPluginResult(result);
    }

    private static Object jsonValue(JSONObject source, String key) {
        if (source == null || !source.has(key) || source.isNull(key)) return JSONObject.NULL;
        Object value = source.opt(key);
        return value == null ? JSONObject.NULL : value;
    }

    @Override
    public void onPause(boolean multitasking) {
        Log.i("ComacoTracking", "[PLUGIN_LIFECYCLE] onPause");
        super.onPause(multitasking);
    }

    @Override
    public void onReset() {
        Log.i("ComacoTracking", "[PLUGIN_LIFECYCLE] onReset");
        super.onReset();
    }

    @Override
    public void onDestroy() {
        Log.i("ComacoTracking", "[PLUGIN_LIFECYCLE] onDestroy");
        if (store != null) {
            store.close();
            store = null;
        }
        if (deviceAudit != null) {
            deviceAudit.close();
            deviceAudit = null;
        }
        healthSubscription = null;
        if (instance == this) instance = null;
        super.onDestroy();
    }
}
