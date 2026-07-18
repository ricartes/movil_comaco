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
import android.os.SystemClock;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import org.json.JSONObject;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.UUID;

public final class TrackingForegroundService extends Service implements LocationListener {
    private static final String CHANNEL_ID = "comaco_tracking_location";
    private static final int NOTIFICATION_ID = 47021;
    private static final long UPLOAD_INTERVAL_MS = 5000L;
    private boolean locationUpdatesRegistered = false;
    private String locationRegistrationGeneration = null;
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
    private TrackingHealthMonitor healthMonitor;
    private boolean startedWithPolicyOverride = false;

    static boolean isRunning() {
        return RUNNING.get();
    }

    static boolean isForegroundPromotionRequested() {
        TrackingForegroundService current = INSTANCE;
        return current != null && current.foregroundPromoted;
    }

    static boolean areLocationUpdatesRegistered() {
        TrackingForegroundService current = INSTANCE;
        return current != null && current.locationUpdatesRegistered;
    }

    static boolean wasCurrentStartOverrideUsed() {
        TrackingForegroundService current = INSTANCE;
        return current != null && current.startedWithPolicyOverride;
    }

    public static void start(Context context, String reason) {
        start(context, reason, false);
    }

    public static void start(Context context, String reason, boolean userOverrideUsed) {
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
        intent.putExtra("policyOverrideUsed", userOverrideUsed);

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
        startedWithPolicyOverride = store.lastStartUserOverrideUsed();
        store.recordServiceCreated(UUID.randomUUID().toString());
        uploader = new TrackingUploader(store, () -> {
            if (handler != null) {
                handler.post(this::afterDrain);
            }
        });
        thread = new HandlerThread("comaco-tracking-location");
        thread.start();
        handler = new Handler(thread.getLooper());
        healthMonitor = new TrackingHealthMonitor(
                store,
                new PowerPolicyInspector(getApplicationContext()),
                handler);
        healthMonitor.start();
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

        if (intent != null) {
            startedWithPolicyOverride = intent.getBooleanExtra(
                    "policyOverrideUsed",
                    startedWithPolicyOverride);
        }

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
            handler.postDelayed(periodicDrain, UPLOAD_INTERVAL_MS);
            return;
        }

        removeLocations();

        if (work) {
            updateNotification("Enviando posiciones pendientes");

            handler.removeCallbacks(periodicDrain);
            handler.postDelayed(periodicDrain, UPLOAD_INTERVAL_MS);
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
                handler.postDelayed(this, UPLOAD_INTERVAL_MS);
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
            store.clearLocationRegistration();
            store.event("PERMISO_UBICACION_FALTANTE", null);
            publishCurrentHealth("location_permission_missing");
            return;
        }

        String registrationGeneration = UUID.randomUUID().toString();
        store.recordLocationRegistration(
                registrationGeneration,
                System.currentTimeMillis(),
                SystemClock.elapsedRealtime());
        try {
            locations.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    store.intervalMs(),
                    store.distanceM(),
                    this,
                    thread.getLooper());

            locationUpdatesRegistered = true;
            locationRegistrationGeneration = registrationGeneration;

            store.event(
                    "REQUEST_UPDATES",
                    "provider=gps intervalMs=" +
                            store.intervalMs() +
                            " distanceM=" +
                            store.distanceM());
            publishCurrentHealth("location_registration");
        } catch (Exception exception) {
            locationUpdatesRegistered = false;
            locationRegistrationGeneration = null;
            store.clearLocationRegistration();

            store.event(
                    "GPS_NO_DISPONIBLE",
                    exception.getClass().getSimpleName());
            publishCurrentHealth("location_registration_error");
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
            locationRegistrationGeneration = null;
            if (store != null) store.clearLocationRegistration();
        }
    }

    @Override
    public void onLocationChanged(@NonNull Location location) {
        store.recordLocationCallback(
                System.currentTimeMillis(),
                SystemClock.elapsedRealtime(),
                locationRegistrationGeneration);
        publishCurrentHealth("location_callback");
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

        store.capture(location);

        // La captura solo persiste en SQLite. El uploader se ejecuta con una
        // cadencia independiente para agrupar varias posiciones por solicitud.
    }

    @Override
    public void onProviderDisabled(@NonNull String provider) {
        store.event("GPS_DESACTIVADO", provider);
        publishCurrentHealth("provider_disabled");
    }

    @Override
    public void onProviderEnabled(@NonNull String provider) {
        store.event("GPS_ACTIVADO", provider);
        publishCurrentHealth("provider_enabled");
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

    private void publishCurrentHealth(String reason) {
        if (store == null) return;
        try {
            JSONObject snapshot = new PowerPolicyInspector(getApplicationContext()).inspect(
                    store,
                    reason,
                    startedWithPolicyOverride);
            store.applyHealthSnapshot(snapshot);
            ComacoTrackingPlugin.publishHealth(snapshot);
        } catch (Exception exception) {
            store.event("HEALTH_UPDATE_ERROR", exception.getClass().getSimpleName());
        }
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

        if (healthMonitor != null) {
            healthMonitor.stop();
            healthMonitor = null;
        }

        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }

        removeLocations();

        if (store != null) {
            store.recordServiceDestroyed();
            store.event(
                    "SERVICE_DESTROY",
                    "foreground=false");

            store.close();
            store = null;
        }

        if (connectivity != null && networkCallback != null) {
            try {
                connectivity.unregisterNetworkCallback(networkCallback);
            } catch (RuntimeException ignored) {
            }
        }
        if (screenReceiver != null) {
            try {
                unregisterReceiver(screenReceiver);
            } catch (RuntimeException ignored) {
            }
        }
        if (thread != null) {
            thread.quitSafely();
            thread = null;
        }

        stopForeground(STOP_FOREGROUND_REMOVE);

        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
