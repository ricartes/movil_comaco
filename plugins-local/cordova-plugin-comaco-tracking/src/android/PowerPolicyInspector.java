package io.gestionasi.comaco.tracking;

import android.Manifest;
import android.app.ActivityManager;
import android.app.ActivityManager.RunningServiceInfo;
import android.app.usage.UsageStatsManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
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
                && wouldBlockInEnforceMode
                && !serviceCreated
                && !userOverrideUsed;
        boolean startAllowed = normalTrackingAllowed
                || enforcementMode == EnforcementMode.OBSERVE
                || (enforcementMode == EnforcementMode.WARN && userOverrideUsed);

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
        return result;
    }

    JSONObject openSettings(String destination) throws Exception {
        String requested = destination == null ? "APP_DETAILS" : destination;
        String resolved = requested;
        boolean fallbackUsed = false;
        Intent intent;
        if ("BATTERY_OPTIMIZATION_LIST".equals(requested)) {
            intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        } else {
            if ("MOTOROLA_BATTERY_OPTIONAL".equals(requested)) {
                // No se inventa un componente OEM no documentado. Hasta validar un
                // destino por modelo, Motorola usa el fallback estandar y auditable.
                fallbackUsed = true;
                resolved = "APP_DETAILS";
            }
            intent = new Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + context.getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PackageManager pm = context.getPackageManager();
        if (intent.resolveActivity(pm) == null) {
            fallbackUsed = true;
            resolved = "GENERAL_SETTINGS";
            intent = new Intent(Settings.ACTION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        if (intent.resolveActivity(pm) == null) {
            throw new IllegalStateException("SETTINGS_ACTIVITY_UNAVAILABLE");
        }
        context.startActivity(intent);
        JSONObject result = new JSONObject();
        result.put("launched", true);
        result.put("requestedDestination", requested);
        result.put("resolvedDestination", resolved);
        result.put("fallbackUsed", fallbackUsed);
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
}
