package io.gestionasi.comaco.tracking;

import android.os.Handler;

import org.json.JSONArray;
import org.json.JSONObject;

final class TrackingHealthMonitor {
    private static final long CHECK_INTERVAL_MS = 30000L;

    private final TrackingStore store;
    private final PowerPolicyInspector inspector;
    private final Handler handler;
    private Boolean previousForegroundObserved = Boolean.TRUE;
    private boolean previousLocationStale = false;
    private String previousBlockers = null;
    private volatile boolean active = false;

    TrackingHealthMonitor(TrackingStore store, PowerPolicyInspector inspector, Handler handler) {
        this.store = store;
        this.inspector = inspector;
        this.handler = handler;
    }

    void start() {
        active = true;
        handler.postDelayed(check, 5000L);
    }

    void stop() {
        active = false;
        handler.removeCallbacks(check);
    }

    private final Runnable check = new Runnable() {
        @Override public void run() {
            if (!active) return;
            long nextDelayMs = CHECK_INTERVAL_MS;
            try {
                JSONObject snapshot = inspector.inspect(
                        store,
                        "health_monitor",
                        TrackingForegroundService.wasCurrentStartOverrideUsed());
                JSONObject tracking = snapshot.getJSONObject("tracking");
                JSONObject location = snapshot.getJSONObject("location");
                JSONObject decision = snapshot.getJSONObject("decision");
                Boolean foregroundObserved = tracking.isNull("foregroundObserved")
                        ? null
                        : tracking.getBoolean("foregroundObserved");
                boolean locationStale = location.getBoolean("stale");
                JSONArray blockers = decision.getJSONArray("blockers");
                String blockersValue = blockers.toString();
                String health = decision.getString("mode");

                if (Boolean.TRUE.equals(previousForegroundObserved)
                        && Boolean.FALSE.equals(foregroundObserved)) {
                    store.event("FGS_OBSERVED_LOST", "health=" + decision.getString("mode"));
                }
                if (!previousLocationStale && locationStale) {
                    store.event("LOCATION_CALLBACK_STALE",
                            "ageMs=" + location.optLong("lastCallbackAgeMs", -1)
                                    + " thresholdMs=" + location.getLong("staleThresholdMs"));
                }
                if (previousBlockers != null && !previousBlockers.equals(blockersValue)) {
                    store.event("POWER_POLICY_BLOCKERS_CHANGED", "blockers=" + blockersValue);
                }

                previousForegroundObserved = foregroundObserved;
                previousLocationStale = locationStale;
                previousBlockers = blockersValue;
                TrackingStore.HealthUpdate update = store.applyHealthSnapshot(snapshot);
                if (update.changed) ComacoTrackingPlugin.publishHealth(snapshot);
                if ("CHECKING".equals(health)) nextDelayMs = 5000L;
            } catch (Exception exception) {
                store.event("HEALTH_MONITOR_ERROR", exception.getClass().getSimpleName());
            } finally {
                if (active) handler.postDelayed(this, nextDelayMs);
            }
        }
    };
}
