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
    private static final String CHANNEL_ID="comaco_tracking_location";
    private static final int NOTIFICATION_ID=47021;
    private static final AtomicBoolean RUNNING=new AtomicBoolean(false);
    private TrackingStore store; private TrackingUploader uploader; private LocationManager locations;
    private ConnectivityManager connectivity; private ConnectivityManager.NetworkCallback networkCallback;
    private BroadcastReceiver screenReceiver;
    private HandlerThread thread; private Handler handler;

    static boolean isRunning(){return RUNNING.get();}
    static void start(Context context,String reason){
        boolean fine=ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;
        boolean background=android.os.Build.VERSION.SDK_INT<29||ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_BACKGROUND_LOCATION)==PackageManager.PERMISSION_GRANTED;
        if(!fine||!background){TrackingStore s=new TrackingStore(context.getApplicationContext());s.event("SERVICE_START_SKIPPED","reason=permission");s.close();return;}
        Intent i=new Intent(context,TrackingForegroundService.class).putExtra("reason",reason);
        try{if(RUNNING.get())context.startService(i);else ContextCompat.startForegroundService(context,i);}catch(RuntimeException e){TrackingStore s=new TrackingStore(context.getApplicationContext());s.event("SERVICE_START_ERROR",e.getClass().getSimpleName());s.close();}
    }
    static void stop(Context context){context.stopService(new Intent(context,TrackingForegroundService.class));}

    @Override public void onCreate(){
        super.onCreate(); RUNNING.set(true); createChannel();
        ServiceCompat.startForeground(this,NOTIFICATION_ID,notification("Preparando seguimiento GPS"),ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        store=new TrackingStore(getApplicationContext());
        uploader=new TrackingUploader(store,()->{ if(handler!=null)handler.post(this::refresh); });
        thread=new HandlerThread("comaco-tracking-location");thread.start();handler=new Handler(thread.getLooper());
        locations=(LocationManager)getSystemService(LOCATION_SERVICE);
        store.event("START_FOREGROUND","foreground=true");
        registerConnectivity(); registerScreenEvents(); store.event("SERVICE_CREATE","foreground=true");
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        String reason=intent==null?"sticky":intent.getStringExtra("reason"); store.event("SERVICE_COMMAND","reason="+reason+" foreground=true"); refresh(); uploader.drain(reason); return START_STICKY;
    }

    private void refresh(){
        if(store.hasActive()){
            updateNotification("Seguimiento GPS activo"); requestLocations();
            handler.removeCallbacks(periodicDrain); handler.postDelayed(periodicDrain,15000);
        }else{
            removeLocations(); updateNotification("Enviando posiciones pendientes");
            if(!store.hasWork()){stopSelf();return;}
            handler.removeCallbacks(periodicDrain); handler.postDelayed(periodicDrain,30000);
        }
    }

    private final Runnable periodicDrain=new Runnable(){@Override public void run(){uploader.drain("periodico");if(handler!=null)handler.postDelayed(this,30000);}};

    private void requestLocations(){
        if(ContextCompat.checkSelfPermission(this,Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){store.event("PERMISO_UBICACION_FALTANTE",null);return;}
        try{locations.removeUpdates(this);locations.requestLocationUpdates(LocationManager.GPS_PROVIDER,store.intervalMs(),store.distanceM(),this,thread.getLooper());store.event("REQUEST_UPDATES","provider=gps intervalMs="+store.intervalMs()+" distanceM="+store.distanceM());}
        catch(Exception e){store.event("GPS_NO_DISPONIBLE",e.getClass().getSimpleName());}
    }
    private void removeLocations(){try{if(locations!=null)locations.removeUpdates(this);}catch(SecurityException ignored){}}

    @Override public void onLocationChanged(@NonNull Location location){int generated=store.capture(location);if(generated>0)uploader.drain("nueva_captura");}
    @Override public void onProviderDisabled(@NonNull String provider){store.event("GPS_DESACTIVADO",provider);}
    @Override public void onProviderEnabled(@NonNull String provider){store.event("GPS_ACTIVADO",provider);}
    @Override public void onStatusChanged(String provider,int status,Bundle extras){ }

    private void registerConnectivity(){
        connectivity=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);networkCallback=new ConnectivityManager.NetworkCallback(){@Override public void onAvailable(@NonNull Network network){store.event("NETWORK_AVAILABLE",null);if(uploader!=null)uploader.drain("red_disponible");}@Override public void onLost(@NonNull Network network){store.event("NETWORK_LOST",null);}};
        try{connectivity.registerDefaultNetworkCallback(networkCallback);}catch(Exception e){store.event("RED_CALLBACK_ERROR",e.getClass().getSimpleName());}
    }

    private void registerScreenEvents(){screenReceiver=new BroadcastReceiver(){@Override public void onReceive(Context context,Intent intent){if(Intent.ACTION_SCREEN_OFF.equals(intent.getAction()))store.event("SCREEN_OFF",null);else if(Intent.ACTION_SCREEN_ON.equals(intent.getAction()))store.event("SCREEN_ON",null);}};IntentFilter f=new IntentFilter();f.addAction(Intent.ACTION_SCREEN_OFF);f.addAction(Intent.ACTION_SCREEN_ON);if(android.os.Build.VERSION.SDK_INT>=33)registerReceiver(screenReceiver,f,Context.RECEIVER_NOT_EXPORTED);else registerReceiver(screenReceiver,f);}

    private Notification notification(String text){
        Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi=launch==null?null:PendingIntent.getActivity(this,0,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this,CHANNEL_ID).setSmallIcon(getApplicationInfo().icon).setContentTitle("Control de Origen").setContentText(text).setOngoing(true).setOnlyAlertOnce(true).setCategory(NotificationCompat.CATEGORY_SERVICE).setPriority(NotificationCompat.PRIORITY_LOW).setContentIntent(pi).build();
    }
    private void updateNotification(String text){((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID,notification(text));}
    private void createChannel(){if(android.os.Build.VERSION.SDK_INT>=26){NotificationChannel c=new NotificationChannel(CHANNEL_ID,"Seguimiento de ubicación",NotificationManager.IMPORTANCE_LOW);c.setDescription("Trazabilidad GPS activa para guías en curso");((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);}}

    @Override public void onTaskRemoved(Intent rootIntent){store.event("TASK_REMOVED","foreground=true");super.onTaskRemoved(rootIntent);}
    @Override public void onDestroy(){RUNNING.set(false);removeLocations();if(handler!=null)handler.removeCallbacksAndMessages(null);if(thread!=null)thread.quitSafely();if(connectivity!=null&&networkCallback!=null)try{connectivity.unregisterNetworkCallback(networkCallback);}catch(Exception ignored){}if(screenReceiver!=null)try{unregisterReceiver(screenReceiver);}catch(Exception ignored){}if(store!=null){store.event("STOP_FOREGROUND","foreground=false");store.event("SERVICE_DESTROY","foreground=false");store.close();}stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
