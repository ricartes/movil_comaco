package io.gestionasi.comaco.tracking;

import android.content.Context;
import android.os.PowerManager;
import android.Manifest;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import androidx.core.content.ContextCompat;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

public final class ComacoTrackingPlugin extends CordovaPlugin {
    private TrackingStore store;

    @Override protected void pluginInitialize() { store=new TrackingStore(cordova.getContext().getApplicationContext()); }

    @Override public boolean execute(String action, JSONArray args, CallbackContext callback) {
        switch(action){
            case "configurar": case "sincronizarSeguimientos": case "registrarSeguimiento":
            case "finalizarSeguimiento": case "obtenerEstado": case "obtenerEstadisticas":
            case "solicitarDrenaje": case "importarPosicionesLegacy": case "verificarMigracion":
            case "detenerSiCorresponde":
                cordova.getThreadPool().execute(()->run(action,args,callback)); return true;
            default: return false;
        }
    }

    private void run(String action,JSONArray args,CallbackContext callback){
        try{
            JSONObject result;
            switch(action){
                case "configurar": result=store.configure(args.getJSONObject(0)); break;
                case "sincronizarSeguimientos":
                    store.syncTrackings(args.optJSONArray(0)==null?new JSONArray():args.getJSONArray(0));
                    ensureService("sincronizacion"); result=state(); break;
                case "registrarSeguimiento":
                    store.upsertTracking(args.getJSONObject(0)); ensureService("nuevo_seguimiento"); result=state(); break;
                case "finalizarSeguimiento":
                    store.finalizeTracking(args.getJSONObject(0).getString("ID_UNICO_SEGUIMIENTO"));
                    ensureService("finalizacion"); result=state(); break;
                case "obtenerEstado": result=state(); break;
                case "obtenerEstadisticas": result=augment(store.stats(TrackingForegroundService.isRunning())); break;
                case "solicitarDrenaje": ensureService(args.optJSONObject(0)==null?"manual":args.optJSONObject(0).optString("motivo","manual")); result=state(); break;
                case "importarPosicionesLegacy":
                    JSONObject imported=new JSONObject(); imported.put("importadas",store.importLegacy(args.optJSONArray(0)==null?new JSONArray():args.getJSONArray(0))); imported.put("estado",state()); result=imported; break;
                case "verificarMigracion": result=store.verifyMigration(args.optJSONObject(0)==null?new JSONObject():args.getJSONObject(0)); break;
                case "detenerSiCorresponde":
                    if(!store.hasWork()) TrackingForegroundService.stop(cordova.getContext()); result=state(); break;
                default: throw new IllegalArgumentException("Acción no soportada.");
            }
            callback.success(result);
        }catch(Exception e){
            store.event("PUENTE_ERROR",action+":"+e.getClass().getSimpleName());
            callback.error(new JSONObject(java.util.Collections.singletonMap("codigo","TRACKING_NATIVE_ERROR")).toString());
        }
    }

    private void ensureService(String reason){if(store.configured()&&store.migrationComplete()&&store.hasWork())TrackingForegroundService.start(cordova.getContext(),reason);}
    private JSONObject state() throws Exception{return augment(store.state(TrackingForegroundService.isRunning()));}
    private JSONObject augment(JSONObject result) throws Exception{
        Context context=cordova.getContext(); PowerManager power=(PowerManager)context.getSystemService(Context.POWER_SERVICE);
        result.put("optimizacionBateriaIgnorada",power!=null&&power.isIgnoringBatteryOptimizations(context.getPackageName()));
        LocationManager locations=(LocationManager)context.getSystemService(Context.LOCATION_SERVICE);
        boolean location=ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;
        boolean background=android.os.Build.VERSION.SDK_INT<29||ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_BACKGROUND_LOCATION)==PackageManager.PERMISSION_GRANTED;
        boolean notifications=android.os.Build.VERSION.SDK_INT<33||ContextCompat.checkSelfPermission(context,Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;
        result.put("gpsActivo",locations!=null&&locations.isProviderEnabled(LocationManager.GPS_PROVIDER));result.put("permisoUbicacion",location);result.put("permisoBackground",background);result.put("permisoNotificaciones",notifications);result.put("optimizacionBateria",result.getBoolean("optimizacionBateriaIgnorada")?"IGNORADA":"ACTIVA");
        result.put("plataforma","android"); return result;
    }
    @Override public void onDestroy(){if(store!=null)store.close();super.onDestroy();}
}
