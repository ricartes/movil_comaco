package io.gestionasi.comaco.observability;

import android.content.pm.PackageInfo;
import android.os.Build;

import com.google.firebase.FirebaseApp;
import com.google.firebase.crashlytics.FirebaseCrashlytics;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;

public final class ComacoCrashlyticsPlugin extends CordovaPlugin {
    private FirebaseCrashlytics crashlytics;

    @Override
    protected void pluginInitialize() {
        try {
            FirebaseApp app = FirebaseApp.initializeApp(cordova.getContext());
            if (app == null && FirebaseApp.getApps(cordova.getContext()).isEmpty()) {
                return;
            }

            crashlytics = FirebaseCrashlytics.getInstance();
            crashlytics.setCustomKey("android_sdk", Build.VERSION.SDK_INT);
            crashlytics.setCustomKey("android_release", safe(Build.VERSION.RELEASE, 32));
            crashlytics.setCustomKey("cordova_bridge_loaded", true);
            crashlytics.setCustomKey("startup_phase", "native_plugin_initialized");

            PackageInfo info = cordova.getContext().getPackageManager()
                    .getPackageInfo(cordova.getContext().getPackageName(), 0);
            crashlytics.setCustomKey("app_version", safe(info.versionName, 48));
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? info.getLongVersionCode()
                    : info.versionCode;
            crashlytics.setCustomKey("app_version_code", versionCode);
            crashlytics.log("COMACO_NATIVE_OBSERVABILITY_READY");
        } catch (Exception ignored) {
            crashlytics = null;
        }
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callback) {
        switch (action) {
            case "isReady":
                callback.success(crashlytics != null ? 1 : 0);
                return true;
            case "log":
                if (crashlytics != null) {
                    crashlytics.log(safe(args.optString(0, "COMACO_EVENT"), 256));
                }
                callback.success();
                return true;
            case "setKey":
                if (crashlytics != null) {
                    crashlytics.setCustomKey(
                            safe(args.optString(0, "diagnostic_key"), 64),
                            safe(args.optString(1, "unknown"), 128));
                }
                callback.success();
                return true;
            case "recordError":
                if (crashlytics != null) {
                    String code = safe(args.optString(0, "JS_NON_FATAL"), 96);
                    String stack = safe(args.optString(1, ""), 2048);
                    if (!stack.isEmpty()) {
                        crashlytics.log("JS_STACK " + stack);
                    }
                    crashlytics.recordException(new RuntimeException(code));
                }
                callback.success();
                return true;
            case "testCrash":
                callback.success();
                cordova.getActivity().runOnUiThread(() -> {
                    throw new RuntimeException("COMACO_CRASHLYTICS_TEST");
                });
                return true;
            default:
                return false;
        }
    }

    private static String safe(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String sanitized = value.replace('\n', ' ').replace('\r', ' ').trim();
        return sanitized.length() <= maxLength
                ? sanitized
                : sanitized.substring(0, maxLength);
    }
}
