package io.gestionasi.comaco.tracking;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import java.util.concurrent.atomic.AtomicBoolean;

public final class TrackingForegroundService extends Service implements LocationListener {
    private static final String CHANNEL_ID = "comaco_tracking_location";
    private static final int NOTIFICATION_ID = 47021;
    private boolean locationUpdatesRegistered = false;
    private long lastFixElapsedRealtimeNanos = Long.MIN_VALUE;
    private static final AtomicBoolean RUNNING = new AtomicBoolean(false);

    private static volatile TrackingForegroundService INSTANCE;

    private boolean foregroundPromoted = false;
    private TrackingStore store;
    private TrackingUploader uploader;
    private LocationManager locations;
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback networkCallback;
    private BroadcastReceiver screenReceiver;
    private HandlerThread thread;
    private Handler handler;

    static boolean isRunning() {
        return RUNNING.get();
    }

    public static void start(Context context, String reason) {
        Context appContext = context.getApplicationContext();

        TrackingForegroundService current = INSTANCE;

        if (current != null && RUNNING.get()) {
            current.requestRefresh(reason);
            return;
        }

        Intent intent = new Intent(
                appContext,
                TrackingForegroundService.class);

        intent.putExtra("reason", reason);

        try {
            ContextCompat.startForegroundService(
                    appContext,
                    intent);

        } catch (RuntimeException exception) {
            TrackingStore store = new TrackingStore(appContext);

            try {
                store.event(
                        "SERVICE_START_ERROR",
                        exception.getClass().getSimpleName());
            } finally {
                store.close();
            }
        }
    }

    static void stop(Context context) {
        context.stopService(new Intent(context, TrackingForegroundService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        INSTANCE = this;
        RUNNING.set(true);
        createChannel();
        ensureForegroundOnce(
                "Servicio de seguimiento activo");
        store = new TrackingStore(getApplicationContext());
        uploader = new TrackingUploader(store, () -> {
            if (handler != null) {
                handler.post(this::afterDrain);
            }
        });
        thread = new HandlerThread("comaco-tracking-location");
        thread.start();
        handler = new Handler(thread.getLooper());
        locations = (LocationManager) getSystemService(LOCATION_SERVICE);
        store.event("START_FOREGROUND", "foreground=true");
        registerConnectivity();
        registerScreenEvents();
        store.event("SERVICE_CREATE", "foreground=true");
    }

    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId) {

        ensureForegroundOnce(
                "Servicio de seguimiento activo");

        String reason = intent == null
                ? "sticky"
                : intent.getStringExtra("reason");

        if (store != null) {
            store.event(
                    "SERVICE_COMMAND",
                    reason == null ? "sin_motivo" : reason);
        }

        refresh();

        return START_STICKY;
    }

    private void refresh() {
        boolean active = store.hasActive();
        boolean work = store.hasWork();

        store.event(
                "SERVICE_REFRESH",
                "active=" + active + " work=" + work);

        if (active) {
            updateNotification("Seguimiento GPS activo");
            requestLocations();

            handler.removeCallbacks(periodicDrain);
            handler.postDelayed(periodicDrain, 15000);
            return;
        }

        removeLocations();

        if (work) {
            updateNotification("Enviando posiciones pendientes");

            handler.removeCallbacks(periodicDrain);
            handler.postDelayed(periodicDrain, 30000);
            return;
        }

        store.event(
                "SERVICE_STOP_EMPTY",
                "active=false work=false");

        stopSelf();
    }

    private void requestRefresh(String reason) {
        Handler currentHandler = handler;

        if (currentHandler == null) {
            return;
        }

        currentHandler.post(() -> {
            if (!RUNNING.get() || store == null) {
                return;
            }

            store.event(
                    "SERVICE_REFRESH",
                    reason == null ? "sin_motivo" : reason);

            refresh();
        });
    }

    private final Runnable periodicDrain = new Runnable() {
        @Override
        public void run() {
            uploader.drain("periodico");
            if (handler != null)
                handler.postDelayed(this, 30000);
        }
    };

    private synchronized void requestLocations() {
        if (locationUpdatesRegistered) {
            store.event(
                    "REQUEST_UPDATES_SKIPPED",
                    "reason=already_registered");
            return;
        }

        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            store.event("PERMISO_UBICACION_FALTANTE", null);
            return;
        }

        try {
            locations.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    store.intervalMs(),
                    store.distanceM(),
                    this,
                    thread.getLooper());

            locationUpdatesRegistered = true;

            store.event(
                    "REQUEST_UPDATES",
                    "provider=gps intervalMs=" +
                            store.intervalMs() +
                            " distanceM=" +
                            store.distanceM());
        } catch (Exception exception) {
            locationUpdatesRegistered = false;

            store.event(
                    "GPS_NO_DISPONIBLE",
                    exception.getClass().getSimpleName());
        }
    }

    private synchronized void removeLocations() {
        if (!locationUpdatesRegistered) {
            return;
        }

        try {
            if (locations != null) {
                locations.removeUpdates(this);
            }
        } catch (SecurityException ignored) {
        } finally {
            locationUpdatesRegistered = false;
        }
    }

    @Override
    public void onLocationChanged(@NonNull Location location) {
        long fixElapsedRealtimeNanos = location.getElapsedRealtimeNanos();

        if (fixElapsedRealtimeNanos > 0 &&
                fixElapsedRealtimeNanos == lastFixElapsedRealtimeNanos) {
            store.event(
                    "LOCATION_DUPLICATE_SKIPPED",
                    "elapsedRealtimeNanos=" + fixElapsedRealtimeNanos);
            return;
        }

        if (fixElapsedRealtimeNanos > 0) {
            lastFixElapsedRealtimeNanos = fixElapsedRealtimeNanos;
        }

        int generated = store.capture(location);

        if (generated > 0) {
            uploader.drain("nueva_captura");
        }
    }

    @Override
    public void onProviderDisabled(@NonNull String provider) {
        store.event("GPS_DESACTIVADO", provider);
    }

    @Override
    public void onProviderEnabled(@NonNull String provider) {
        store.event("GPS_ACTIVADO", provider);
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
    }

    private void registerConnectivity() {
        connectivity = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                store.event("NETWORK_AVAILABLE", null);
                if (uploader != null)
                    uploader.drain("red_disponible");
            }

            @Override
            public void onLost(@NonNull Network network) {
                store.event("NETWORK_LOST", null);
            }
        };
        try {
            connectivity.registerDefaultNetworkCallback(networkCallback);
        } catch (Exception e) {
            store.event("RED_CALLBACK_ERROR", e.getClass().getSimpleName());
        }
    }

    private void registerScreenEvents() {
        screenReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction()))
                    store.event("SCREEN_OFF", null);
                else if (Intent.ACTION_SCREEN_ON.equals(intent.getAction()))
                    store.event("SCREEN_ON", null);
            }
        };
        IntentFilter f = new IntentFilter();
        f.addAction(Intent.ACTION_SCREEN_OFF);
        f.addAction(Intent.ACTION_SCREEN_ON);
        if (android.os.Build.VERSION.SDK_INT >= 33)
            registerReceiver(screenReceiver, f, Context.RECEIVER_NOT_EXPORTED);
        else
            registerReceiver(screenReceiver, f);
    }

    private Notification notification(String text) {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = launch == null ? null
                : PendingIntent.getActivity(this, 0, launch,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID).setSmallIcon(getApplicationInfo().icon)
                .setContentTitle("Control de Origen").setContentText(text).setOngoing(true).setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE).setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pi).build();
    }

    private void afterDrain() {
        boolean active = store.hasActive();
        boolean work = store.hasWork();

        store.event(
                "UPLOAD_FINISHED",
                "active=" + active + " work=" + work);

        if (!active && !work) {
            stopSelf();
            return;
        }

        if (active) {
            updateNotification("Seguimiento GPS activo");
        } else {
            updateNotification("Enviando posiciones pendientes");
        }
    }

    private void updateNotification(String text) {
        /*
         * La notificación permanece fija durante toda la
         * ejecución del servicio. No se vuelve a publicar
         * ni se vuelve a promover el servicio.
         */
    }

    private void createChannel() {
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(CHANNEL_ID, "Seguimiento de ubicación",
                    NotificationManager.IMPORTANCE_LOW);
            c.setDescription("Trazabilidad GPS activa para guías en curso");
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
        }
    }

    private void ensureForegroundOnce(String text) {
        if (foregroundPromoted) {
            return;
        }

        ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification(text),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);

        foregroundPromoted = true;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        store.event("TASK_REMOVED", "foreground=true");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        RUNNING.set(false);
        foregroundPromoted = false;

        if (INSTANCE == this) {
            INSTANCE = null;
        }

        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }

        removeLocations();

        if (store != null) {
            store.event(
                    "SERVICE_DESTROY",
                    "foreground=false");

            store.close();
            store = null;
        }
        

        stopForeground(STOP_FOREGROUND_REMOVE);

        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
