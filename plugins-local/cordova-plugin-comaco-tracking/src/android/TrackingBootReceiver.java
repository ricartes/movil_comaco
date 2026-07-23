package io.gestionasi.comaco.tracking;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public final class TrackingBootReceiver extends BroadcastReceiver {

    private static final boolean IGNORAR_BOOT_SOLO_PRUEBA = false;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null
                ? null
                : intent.getAction();

        /*
         * Prueba temporal:
         * el receiver recibe el evento, pero no inicia el servicio.
         */
        if (IGNORAR_BOOT_SOLO_PRUEBA) {
            Log.i(
                    "ComacoTracking",
                    "[GPS_NATIVE][BOOT_IGNORADO_PRUEBA] action=" + action
            );
            return;
        }

        final PendingResult pending = goAsync();
        final Context appContext = context.getApplicationContext();

        new Thread(() -> {
            TrackingStore store = null;

            try {
                store = new TrackingStore(appContext);

                store.event("BOOT", action);

                boolean debeEjecutarse =
                        store.hasActive() || store.hasWork();
                boolean seguimientoLocalPendiente = store.hasLocalActive();

                if (store.configured()
                        && store.migrationComplete()
                        && debeEjecutarse) {
                    PowerPolicyInspector inspector = new PowerPolicyInspector(appContext);
                    org.json.JSONObject snapshot = inspector.inspect(store, "boot", false);
                    org.json.JSONObject decision = snapshot.getJSONObject("decision");
                    String mode = snapshot.getJSONObject("enforcement").getString("mode");
                    boolean blockers = decision.getBoolean("wouldBlockInEnforceMode");
                    String detail = "mode=" + mode
                            + " health=" + decision.getString("mode")
                            + " blockers=" + decision.getJSONArray("blockers");
                    store.event("POWER_POLICY_PREFLIGHT", "reason=boot " + detail);

                    if (blockers && "ENFORCE".equals(mode)) {
                        store.event("SERVICE_START_BLOCKED_POLICY", "reason=boot " + detail);
                    } else if (blockers && "WARN".equals(mode) && !seguimientoLocalPendiente) {
                        // En boot no existe una UI visible para obtener la decision
                        // explicita requerida por WARN. La app reevalua al abrirse.
                        store.event("SERVICE_START_AWAITING_POLICY_OVERRIDE", "reason=boot " + detail);
                    } else {
                        if (blockers && seguimientoLocalPendiente) {
                            store.event(
                                    "TRACKING_STARTED_WITH_POLICY_WARNING",
                                    "reason=boot_local " + detail);
                        }
                        store.recordPolicyStart(false, snapshot);
                        TrackingForegroundService.start(
                                appContext,
                                "boot",
                                false
                        );
                    }
                }

            } catch (Exception exception) {
                if (store != null) {
                    store.event(
                            "BOOT_ERROR",
                            exception.getClass().getSimpleName()
                    );
                }
            } finally {
                if (store != null) {
                    store.close();
                }

                pending.finish();
            }
        }, "comaco-tracking-boot").start();
    }
}
