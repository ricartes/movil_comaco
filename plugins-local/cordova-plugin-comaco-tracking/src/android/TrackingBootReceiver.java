package io.gestionasi.comaco.tracking;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class TrackingBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        final PendingResult pending = goAsync();
        final Context appContext = context.getApplicationContext();

        new Thread(() -> {
            TrackingStore store = null;

            try {
                store = new TrackingStore(appContext);

                String action = intent == null
                        ? null
                        : intent.getAction();

                store.event("BOOT", action);

                boolean debeEjecutarse =
                        store.hasActive() || store.hasWork();

                if (store.configured()
                        && store.migrationComplete()
                        && debeEjecutarse) {

                    TrackingForegroundService.start(
                            appContext,
                            "boot");
                }

            } catch (Exception exception) {
                if (store != null) {
                    store.event(
                            "BOOT_ERROR",
                            exception.getClass().getSimpleName());
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