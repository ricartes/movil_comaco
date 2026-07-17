package io.gestionasi.comaco.tracking;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class TrackingBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        final PendingResult pending=goAsync();
        new Thread(() -> {
            try {
                TrackingStore store=new TrackingStore(context.getApplicationContext());
                store.event("BOOT",intent==null?null:intent.getAction());
                if(store.configured()&&store.hasWork()) TrackingForegroundService.start(context,"boot");
            } finally { pending.finish(); }
        },"comaco-tracking-boot").start();
    }
}
