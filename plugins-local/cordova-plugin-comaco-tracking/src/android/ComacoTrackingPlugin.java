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
    private volatile CallbackContext healthSubscription;

    @Override
    protected void pluginInitialize() {
        instance = this;
        store = new TrackingStore(cordova.getContext().getApplicationContext());
        inspector = new PowerPolicyInspector(cordova.getContext());
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
                    JSONObject settingsInput = args.optJSONObject(0);
                    result = inspector.openSettings(settingsInput == null
                            ? "APP_DETAILS"
                            : settingsInput.optString("destino", "APP_DETAILS"));
                    store.event("POWER_POLICY_SETTINGS_OPENED", result.toString());
                    break;
                default:
                    throw new IllegalArgumentException("Accion no soportada.");
            }
            callback.success(result);
        } catch (Exception exception) {
            store.event("PUENTE_ERROR", action + ":" + exception.getClass().getSimpleName());
            callback.error(new JSONObject(java.util.Collections.singletonMap(
                    "codigo",
                    "TRACKING_NATIVE_ERROR")).toString());
        }
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

        if ("WARN".equals(mode) && blockers && !explicitContinue) {
            store.event("SERVICE_START_AWAITING_POLICY_OVERRIDE", diagnosticDetail(snapshot));
            return snapshot;
        }

        boolean overrideUsed = "WARN".equals(mode) && blockers && explicitContinue;
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
        if (update.changed) publishHealth(snapshot);
        return snapshot;
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
        healthSubscription = null;
        if (instance == this) instance = null;
        super.onDestroy();
    }
}
