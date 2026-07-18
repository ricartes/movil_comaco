package io.gestionasi.comaco.tracking;

import android.Manifest;
import android.app.ActivityManager;
import android.app.ActivityManager.RunningServiceInfo;
import android.app.usage.UsageStatsManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;
import java.util.Locale;

final class PowerPolicyInspector {
    enum EnforcementMode {
        OBSERVE,
        WARN,
        ENFORCE;

        static EnforcementMode from(String value) {
            if (value == null) return WARN;
            try {
                return valueOf(value.trim().toUpperCase(Locale.US));
            } catch (IllegalArgumentException ignored) {
                return WARN;
            }
        }
    }

    private final Context context;

    PowerPolicyInspector(Context context) {
        this.context = context.getApplicationContext();
    }

    JSONObject inspect(
            TrackingStore store,
            String reason,
            boolean userOverrideUsed) throws Exception {
        ActivityManager activity = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        UsageStatsManager usage = Build.VERSION.SDK_INT >= 28
                ? (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE)
                : null;
        LocationManager location = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);

        boolean backgroundRestricted = Build.VERSION.SDK_INT >= 28
                && activity != null
                && activity.isBackgroundRestricted();
        boolean ignoringBatteryOptimizations = power != null
                && power.isIgnoringBatteryOptimizations(context.getPackageName());
        Integer standbyBucket = null;
        if (Build.VERSION.SDK_INT >= 28 && usage != null) {
            try {
                standbyBucket = usage.getAppStandbyBucket();
            } catch (RuntimeException ignored) {
                standbyBucket = null;
            }
        }

        boolean coarse = granted(Manifest.permission.ACCESS_COARSE_LOCATION);
        boolean fine = granted(Manifest.permission.ACCESS_FINE_LOCATION);
        boolean backgroundApplicable = Build.VERSION.SDK_INT >= 29;
        boolean background = !backgroundApplicable || granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION);
        boolean notificationsApplicable = Build.VERSION.SDK_INT >= 33;
        boolean notifications = !notificationsApplicable || granted(Manifest.permission.POST_NOTIFICATIONS);
        boolean locationEnabled = isLocationEnabled(location);

        boolean logicalActive = store.hasActive();
        boolean serviceCreated = TrackingForegroundService.isRunning();
        boolean foregroundRequested = TrackingForegroundService.isForegroundPromotionRequested();
        Boolean foregroundObserved = observeForeground(activity);
        boolean updatesRegistered = TrackingForegroundService.areLocationUpdatesRegistered();
        long nowMs = System.currentTimeMillis();
        long nowElapsedMs = android.os.SystemClock.elapsedRealtime();
        long lastCallbackMs = store.lastLocationCallbackMs();
        long lastCallbackElapsedMs = store.lastLocationCallbackElapsedMs();
        String lastCallbackGeneration = store.lastLocationCallbackRegistrationGeneration();
        String registrationGeneration = store.locationRegistrationGeneration();
        long registrationStartedMs = store.locationRegistrationStartedMs();
        long registrationStartedElapsedMs = store.locationRegistrationStartedElapsedMs();
        long firstFixGraceMs = store.locationStaleThresholdMs();
        boolean validElapsedRegistration = registrationStartedElapsedMs > 0
                && nowElapsedMs >= registrationStartedElapsedMs;
        boolean currentSessionCallback = registrationGeneration != null
                && registrationGeneration.equals(lastCallbackGeneration)
                && validElapsedRegistration
                && lastCallbackElapsedMs >= registrationStartedElapsedMs
                && lastCallbackElapsedMs <= nowElapsedMs;
        long callbackAgeMs = currentSessionCallback
                ? nowElapsedMs - lastCallbackElapsedMs
                : -1L;
        long registrationAgeMs = validElapsedRegistration
                ? nowElapsedMs - registrationStartedElapsedMs
                : -1L;
        boolean firstFixGraceActive = logicalActive
                && serviceCreated
                && updatesRegistered
                && !currentSessionCallback
                && registrationAgeMs >= 0
                && registrationAgeMs < firstFixGraceMs;
        long firstFixGraceRemainingMs = firstFixGraceActive
                ? firstFixGraceMs - registrationAgeMs
                : 0L;
        boolean locationStale = logicalActive
                && serviceCreated
                && updatesRegistered
                && ((currentSessionCallback && callbackAgeMs > firstFixGraceMs)
                    || (!currentSessionCallback && !firstFixGraceActive && registrationAgeMs >= 0));
        long serviceCreatedMs = store.serviceCreatedMs();
        boolean foregroundObservationGraceActive = serviceCreated
                && serviceCreatedMs > 0
                && nowMs - serviceCreatedMs >= 0
                && nowMs - serviceCreatedMs < 5000L;

        JSONArray blockers = new JSONArray();
        JSONArray warnings = new JSONArray();
        JSONArray reasons = new JSONArray();
        if (backgroundRestricted) blockers.put("BACKGROUND_RESTRICTED");
        if (!locationEnabled) blockers.put("LOCATION_DISABLED");
        if (!fine) blockers.put("FINE_LOCATION_DENIED");
        if (!notifications) warnings.put("POST_NOTIFICATIONS_DENIED");
        if (!background) warnings.put("BACKGROUND_LOCATION_DENIED");
        if (!ignoringBatteryOptimizations) warnings.put("BATTERY_OPTIMIZATION_ACTIVE");
        if (standbyBucket != null && standbyBucket >= UsageStatsManager.STANDBY_BUCKET_RARE) {
            warnings.put("STANDBY_BUCKET_" + standbyBucketName(standbyBucket));
        }
        for (int i = 0; i < blockers.length(); i++) reasons.put(blockers.getString(i));
        if (logicalActive && !serviceCreated) reasons.put("SERVICE_NOT_CREATED");
        if (logicalActive && serviceCreated && !updatesRegistered) {
            reasons.put("LOCATION_UPDATES_NOT_REGISTERED");
        }
        if (logicalActive && serviceCreated && Boolean.FALSE.equals(foregroundObserved)) {
            reasons.put(foregroundObservationGraceActive
                    ? "FOREGROUND_OBSERVATION_PENDING"
                    : "FOREGROUND_LOST");
        } else if (logicalActive && serviceCreated && foregroundObserved == null) {
            reasons.put("FOREGROUND_OBSERVATION_UNKNOWN");
        }
        if (locationStale) reasons.put("LOCATION_STALE");
        if (logicalActive && serviceCreated && updatesRegistered
                && !currentSessionCallback && registrationAgeMs < 0) {
            reasons.put("LOCATION_REGISTRATION_UNKNOWN");
        }

        boolean normalTrackingAllowed = blockers.length() == 0;
        boolean wouldBlockInEnforceMode = !normalTrackingAllowed;
        boolean remediationRequired = blockers.length() > 0 || warnings.length() > 0;
        JSONArray remediationActions = new JSONArray();
        if (backgroundRestricted) {
            remediationActions.put("OPEN_APPLICATION_SETTINGS");
        }
        if (!ignoringBatteryOptimizations) {
            remediationActions.put("REQUEST_BATTERY_OPTIMIZATION_EXEMPTION");
        }
        if (!backgroundRestricted && remediationRequired) {
            remediationActions.put("OPEN_APPLICATION_SETTINGS");
        }
        if (remediationRequired) remediationActions.put("RECHECK");
        String remediationStep = backgroundRestricted
                ? "BACKGROUND_RESTRICTION"
                : (!ignoringBatteryOptimizations ? "BATTERY_OPTIMIZATION" : "APPLICATION_SETTINGS");
        String diagnosticMode;
        if (wouldBlockInEnforceMode) diagnosticMode = "BLOCKED";
        else if (!logicalActive) diagnosticMode = "IDLE";
        else if (contains(reasons, "SERVICE_NOT_CREATED")
                || contains(reasons, "LOCATION_UPDATES_NOT_REGISTERED")
                || contains(reasons, "FOREGROUND_LOST")
                || contains(reasons, "LOCATION_STALE")) diagnosticMode = "DEGRADED";
        else if (contains(reasons, "FOREGROUND_OBSERVATION_PENDING")
                || contains(reasons, "FOREGROUND_OBSERVATION_UNKNOWN")
                || contains(reasons, "LOCATION_REGISTRATION_UNKNOWN")) diagnosticMode = "CHECKING";
        else if (firstFixGraceActive) diagnosticMode = "WAITING_FOR_LOCATION";
        else diagnosticMode = "READY";

        EnforcementMode enforcementMode = EnforcementMode.from(store.policyMode());
        boolean requiresExplicitContinue = enforcementMode == EnforcementMode.WARN
                && remediationRequired
                && !serviceCreated
                && !userOverrideUsed;
        boolean startAllowed = enforcementMode == EnforcementMode.OBSERVE
                || (enforcementMode == EnforcementMode.WARN
                    && (!remediationRequired || userOverrideUsed))
                || (enforcementMode == EnforcementMode.ENFORCE && normalTrackingAllowed);

        JSONObject decision = new JSONObject();
        decision.put("mode", diagnosticMode);
        decision.put("normalTrackingAllowed", normalTrackingAllowed);
        decision.put("wouldBlockInEnforceMode", wouldBlockInEnforceMode);
        decision.put("blockers", blockers);
        decision.put("warnings", warnings);
        decision.put("reasons", reasons);

        JSONObject enforcement = new JSONObject();
        enforcement.put("mode", enforcementMode.name());
        enforcement.put("userOverrideUsed", userOverrideUsed);
        enforcement.put("requiresExplicitContinue", requiresExplicitContinue);
        enforcement.put("startAllowed", startAllowed);

        JSONObject device = new JSONObject();
        device.put("manufacturer", Build.MANUFACTURER);
        device.put("brand", Build.BRAND);
        device.put("model", Build.MODEL);
        device.put("androidRelease", Build.VERSION.RELEASE);
        device.put("sdkInt", Build.VERSION.SDK_INT);

        JSONObject policy = new JSONObject();
        policy.put("backgroundRestricted", backgroundRestricted);
        policy.put("ignoringBatteryOptimizations", ignoringBatteryOptimizations);
        JSONObject bucket = new JSONObject();
        bucket.put("available", standbyBucket != null);
        if (standbyBucket == null) {
            bucket.put("code", JSONObject.NULL);
            bucket.put("name", "UNAVAILABLE");
        } else {
            bucket.put("code", standbyBucket);
            bucket.put("name", standbyBucketName(standbyBucket));
        }
        policy.put("standbyBucket", bucket);

        JSONObject permissions = new JSONObject();
        permissions.put("coarseLocation", coarse);
        permissions.put("fineLocation", fine);
        permissions.put("backgroundLocationApplicable", backgroundApplicable);
        permissions.put("backgroundLocation", background);
        permissions.put("postNotificationsApplicable", notificationsApplicable);
        permissions.put("postNotifications", notifications);

        JSONObject locationState = new JSONObject();
        locationState.put("deviceLocationEnabled", locationEnabled);
        locationState.put("updatesRegistered", updatesRegistered);
        locationState.put("registrationGeneration", registrationGeneration == null ? JSONObject.NULL : registrationGeneration);
        locationState.put("registrationStartedUtc", registrationStartedMs > 0 ? TrackingStore.iso(registrationStartedMs) : JSONObject.NULL);
        locationState.put("registrationStartedElapsedMs", registrationStartedElapsedMs > 0 ? registrationStartedElapsedMs : JSONObject.NULL);
        locationState.put("lastCallbackUtc", lastCallbackMs > 0 ? TrackingStore.iso(lastCallbackMs) : JSONObject.NULL);
        locationState.put("lastCallbackAgeMs", callbackAgeMs >= 0 ? callbackAgeMs : JSONObject.NULL);
        locationState.put("lastPersistedCallbackAgeMs", lastCallbackMs > 0 ? Math.max(0L, nowMs - lastCallbackMs) : JSONObject.NULL);
        locationState.put("currentSessionCallback", currentSessionCallback);
        locationState.put("firstFixGraceMs", firstFixGraceMs);
        locationState.put("firstFixGraceActive", firstFixGraceActive);
        locationState.put("firstFixGraceRemainingMs", firstFixGraceRemainingMs);
        locationState.put("staleThresholdMs", firstFixGraceMs);
        locationState.put("stale", locationStale);

        JSONObject tracking = new JSONObject();
        tracking.put("logicalActive", logicalActive);
        tracking.put("serviceCreated", serviceCreated);
        tracking.put("foregroundRequested", foregroundRequested);
        tracking.put("foregroundObserved", foregroundObserved == null ? JSONObject.NULL : foregroundObserved);
        tracking.put("foregroundObservationSource", foregroundObserved == null
                ? "UNAVAILABLE"
                : "RUNNING_SERVICE_INFO");
        tracking.put("foregroundObservationGraceActive", foregroundObservationGraceActive);
        tracking.put("health", diagnosticMode);

        JSONObject result = new JSONObject();
        result.put("schemaVersion", 1);
        result.put("capturedAtUtc", TrackingStore.iso(System.currentTimeMillis()));
        result.put("reason", reason == null ? "diagnostico" : reason);
        result.put("device", device);
        result.put("powerPolicy", policy);
        result.put("permissions", permissions);
        result.put("location", locationState);
        result.put("tracking", tracking);
        result.put("decision", decision);
        result.put("enforcement", enforcement);
        result.put("enforcementMode", enforcementMode.name());
        result.put("health", diagnosticMode);
        result.put("warnings", warnings);
        result.put("reasons", reasons);
        result.put("blockers", blockers);
        result.put("backgroundRestricted", backgroundRestricted);
        result.put("ignoringBatteryOptimizations", ignoringBatteryOptimizations);
        result.put("standbyBucket", bucket);
        result.put("logicalActive", logicalActive);
        result.put("foregroundRequested", foregroundRequested);
        result.put("foregroundObserved", foregroundObserved == null ? JSONObject.NULL : foregroundObserved);
        result.put("updatesRegistered", updatesRegistered);
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("remediationRequired", remediationRequired);
        result.put("remediationStep", remediationRequired ? remediationStep : "NONE");
        result.put("remediationActions", remediationActions);
        result.put("manufacturerGuidance", manufacturerGuidance(Build.MANUFACTURER));
        result.put("settingsOpened", false);
        result.put("checkedAtUtc", result.getString("capturedAtUtc"));
        return result;
    }

    JSONObject openSettings(String destination) throws Exception {
        return openPowerRestrictionSettings();
    }

    JSONObject openPowerRestrictionSettings() throws Exception {
        Intent[] intents = new Intent[] {
                packageIntent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS),
                new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                new Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS),
                new Intent(Settings.ACTION_SETTINGS)
        };
        String[] actions = new String[] {
                "OPEN_APPLICATION_SETTINGS",
                "OPEN_BATTERY_OPTIMIZATION_LIST",
                "OPEN_BATTERY_SAVER_SETTINGS",
                "OPEN_GENERAL_SETTINGS"
        };
        return openFirstResolvable(intents, actions, "OPEN_POWER_RESTRICTION_SETTINGS");
    }

    JSONObject requestBatteryOptimizationExemption() throws Exception {
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (power != null && power.isIgnoringBatteryOptimizations(context.getPackageName())) {
            JSONObject result = settingsResult("REQUEST_BATTERY_OPTIMIZATION_EXEMPTION");
            result.put("success", true);
            result.put("settingsOpened", false);
            result.put("alreadyGranted", true);
            result.put("resolvedAction", "ALREADY_GRANTED");
            return result;
        }

        if (power != null) {
            Intent request = packageIntent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            if (request.resolveActivity(context.getPackageManager()) != null) {
                try {
                    request.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(request);
                    JSONObject result = settingsResult("REQUEST_BATTERY_OPTIMIZATION_EXEMPTION");
                    result.put("success", true);
                    result.put("settingsOpened", true);
                    result.put("alreadyGranted", false);
                    result.put("resolvedAction", "REQUEST_BATTERY_OPTIMIZATION_EXEMPTION");
                    return result;
                } catch (ActivityNotFoundException | SecurityException exception) {
                    JSONObject fallback = openPowerRestrictionSettings();
                    fallback.put("requestedAction", "REQUEST_BATTERY_OPTIMIZATION_EXEMPTION");
                    fallback.put("fallbackUsed", true);
                    fallback.put("errorClass", exception.getClass().getSimpleName());
                    return fallback;
                }
            }
        }

        JSONObject fallback = openPowerRestrictionSettings();
        fallback.put("requestedAction", "REQUEST_BATTERY_OPTIMIZATION_EXEMPTION");
        fallback.put("fallbackUsed", true);
        if (power == null) fallback.put("errorClass", "PowerManagerUnavailable");
        return fallback;
    }

    private JSONObject openFirstResolvable(Intent[] intents, String[] actions, String requested) throws Exception {
        PackageManager packageManager = context.getPackageManager();
        String lastErrorClass = null;
        for (int i = 0; i < intents.length; i++) {
            Intent intent = intents[i];
            if (intent.resolveActivity(packageManager) == null) continue;
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                JSONObject result = settingsResult(requested);
                result.put("success", true);
                result.put("settingsOpened", true);
                result.put("resolvedAction", actions[i]);
                result.put("fallbackUsed", i > 0);
                if (lastErrorClass != null) result.put("errorClass", lastErrorClass);
                return result;
            } catch (ActivityNotFoundException | SecurityException exception) {
                lastErrorClass = exception.getClass().getSimpleName();
            }
        }
        JSONObject result = settingsResult(requested);
        result.put("success", false);
        result.put("settingsOpened", false);
        result.put("resolvedAction", JSONObject.NULL);
        result.put("fallbackUsed", true);
        result.put("errorClass", lastErrorClass == null ? "SettingsActivityUnavailable" : lastErrorClass);
        return result;
    }

    private Intent packageIntent(String action) {
        return new Intent(action, Uri.parse("package:" + context.getPackageName()));
    }

    private JSONObject settingsResult(String requested) throws Exception {
        JSONObject result = new JSONObject();
        result.put("requestedAction", requested);
        result.put("manufacturer", Build.MANUFACTURER);
        return result;
    }

    @SuppressWarnings("deprecation")
    private Boolean observeForeground(ActivityManager activity) {
        if (activity == null) return null;
        try {
            List<RunningServiceInfo> services = activity.getRunningServices(50);
            if (services == null) return null;
            ComponentName target = new ComponentName(context, TrackingForegroundService.class);
            for (RunningServiceInfo service : services) {
                if (target.equals(service.service)) return service.foreground;
            }
            return false;
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private boolean granted(String permission) {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isLocationEnabled(LocationManager location) {
        if (location == null) return false;
        try {
            if (Build.VERSION.SDK_INT >= 28) return location.isLocationEnabled();
            return location.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || location.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private static String standbyBucketName(int value) {
        if (value <= UsageStatsManager.STANDBY_BUCKET_ACTIVE) return "ACTIVE";
        if (value <= UsageStatsManager.STANDBY_BUCKET_WORKING_SET) return "WORKING_SET";
        if (value <= UsageStatsManager.STANDBY_BUCKET_FREQUENT) return "FREQUENT";
        if (value <= UsageStatsManager.STANDBY_BUCKET_RARE) return "RARE";
        return "RESTRICTED";
    }

    private static boolean contains(JSONArray values, String expected) {
        for (int i = 0; i < values.length(); i++) {
            if (expected.equals(values.optString(i))) return true;
        }
        return false;
    }

    private static String manufacturerGuidance(String manufacturer) {
        if (manufacturer != null && manufacturer.toLowerCase(Locale.US).contains("motorola")) {
            return "En Bateria, selecciona Permitir en segundo plano y luego Sin restricciones. Revisa tambien cualquier optimizador de aplicaciones o administrador de memoria si el problema continua.";
        }
        return "En la configuracion de la aplicacion, permite la actividad en segundo plano y selecciona el modo de bateria sin restricciones si esta disponible.";
    }
}
