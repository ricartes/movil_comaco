package io.gestionasi.comaco.tracking;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.net.ssl.HttpsURLConnection;

final class TrackingUploader {
    private static final Set<String> CREDENTIAL_CODES = new HashSet<>(Arrays.asList(
            "CREDENCIAL_NO_AUTORIZADA", "CREDENCIAL_REVOCADA", "CREDENCIAL_EXPIRADA",
            "DISPOSITIVO_NO_AUTORIZADO", "SEGUIMIENTO_NO_ACTIVO"));
    private final TrackingStore store;
    private final Runnable onFinished;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean draining = new AtomicBoolean(false);

    TrackingUploader(TrackingStore store, Runnable onFinished) { this.store=store; this.onFinished=onFinished; }

    void drain(String reason) {
        if (!draining.compareAndSet(false,true)) return;
        executor.execute(() -> {
            store.event("DRENAJE_INICIADO", reason);
            try {
                for (int i=0;i<20;i++) {
                    TrackingStore.UploadBatch batch=store.claimBatch();
                    if(batch==null||batch.items.isEmpty()) break;
                    upload(batch);
                }
            } catch(Exception e) {
                store.event("DRENAJE_ERROR", e.getClass().getSimpleName());
            } finally {
                draining.set(false);
                store.event("DRENAJE_FINALIZADO", reason);
                if(onFinished!=null) onFinished.run();
            }
        });
    }

    private void upload(TrackingStore.UploadBatch batch) {
        store.event("HTTP_BEGIN","positions="+batch.items.size());
        for(int attempt=0;attempt<=batch.shortRetries;attempt++){
            try { uploadOnce(batch); store.event("HTTP_ACK","positions="+batch.items.size()); return; }
            catch(CredentialFailure e){store.fail(batch.items,e.code,true);store.event("HTTP_ERROR","credential="+e.code);return;}
            catch(Exception e){
                if(attempt<batch.shortRetries){store.event("HTTP_SHORT_RETRY","attempt="+(attempt+1));continue;}
                store.fail(batch.items,e.getClass().getSimpleName(),false);store.event("HTTP_ERROR",e.getClass().getSimpleName());return;
            }
        }
    }

    private void uploadOnce(TrackingStore.UploadBatch batch) throws Exception {
        JSONObject request = request(batch);
        HttpsURLConnection connection=null;
        try {
            connection=(HttpsURLConnection)new URL(batch.endpoint).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(batch.timeoutMs);
            connection.setReadTimeout(batch.timeoutMs);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type","application/json; charset=utf-8");
            connection.setRequestProperty("Accept","application/json");
            byte[] bytes=request.toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try(OutputStream output=connection.getOutputStream()){output.write(bytes);}
            int status=connection.getResponseCode();
            InputStream stream=status>=200&&status<300?connection.getInputStream():connection.getErrorStream();
            String body=read(stream);
            if(status<200||status>=300) throw new IllegalStateException("HTTP_"+status);
            acknowledge(batch,body);
        } finally { if(connection!=null)connection.disconnect(); }
    }

    static JSONObject request(TrackingStore.UploadBatch batch) throws Exception {
        JSONObject input=new JSONObject();
        input.put("ID_UNICO_SEGUIMIENTO",batch.trackingId);
        input.put("UUID_DISPOSITIVO",batch.deviceUuid);
        input.put("TOKEN_SEGUIMIENTO",batch.token);
        input.put("VERSION_APP",batch.appVersion==null?"":batch.appVersion);
        JSONArray positions=new JSONArray();
        for(TrackingStore.OutboxItem p:batch.items){
            JSONObject o=new JSONObject(); o.put("UUID_POSICION",p.uuidPosition);
            o.put("SECUENCIA_LOCAL",p.sequence==null?JSONObject.NULL:p.sequence);
            o.put("FECHA_DISPOSITIVO_UTC",p.dateUtc); o.put("LATITUD",p.latitude); o.put("LONGITUD",p.longitude);
            nullable(o,"PRECISION_METROS",p.accuracy); nullable(o,"VELOCIDAD_MPS",p.speed);
            nullable(o,"RUMBO_GRADOS",p.bearing); nullable(o,"ALTITUD_METROS",p.altitude);
            o.put("ES_UBICACION_SIMULADA",p.mocked); o.put("ORIGEN_CAPTURA",p.origin); positions.put(o);
        }
        input.put("POSICIONES",positions);
        JSONObject wrapper=new JSONObject(); wrapper.put("entrada",input); return wrapper;
    }

    private void acknowledge(TrackingStore.UploadBatch batch,String body) throws Exception {
        JSONObject root=new JSONObject(body); Object unwrapped=root.has("d")?root.get("d"):root;
        if(unwrapped instanceof String) unwrapped=new JSONObject((String)unwrapped);
        if(!(unwrapped instanceof JSONObject)) throw new IllegalStateException("RESPUESTA_INVALIDA");
        JSONObject response=(JSONObject)unwrapped;
        if(!response.optBoolean("EXITO",false)) {
            String code=response.optString("CODIGO","FALLA_FUNCIONAL");
            if(CREDENTIAL_CODES.contains(code)) throw new CredentialFailure(code);
            throw new IllegalStateException(code);
        }
        JSONArray results=response.optJSONArray("POSICIONES"); if(results==null) throw new IllegalStateException("ACK_SIN_POSICIONES");
        Set<String> sent=new HashSet<>(); for(TrackingStore.OutboxItem p:batch.items)sent.add(p.uuidPosition);
        Set<String> accepted=new HashSet<>();
        for(int i=0;i<results.length();i++){
            JSONObject result=results.getJSONObject(i);String id=result.getString("UUID_POSICION");String state=result.getString("ESTADO");
            if(!sent.contains(id)||!("INSERTADA".equals(state)||"YA_EXISTIA".equals(state))||!accepted.add(id)) throw new IllegalStateException("ACK_INVALIDO");
        }
        store.confirm(accepted,batch.items);
        if(accepted.size()!=sent.size()) store.releaseUnacknowledged(batch.items,accepted);
    }

    private static void nullable(JSONObject o,String key,Double value)throws Exception{o.put(key,value==null?JSONObject.NULL:value);}
    private static String read(InputStream stream)throws Exception{if(stream==null)return "";StringBuilder s=new StringBuilder();try(BufferedReader r=new BufferedReader(new InputStreamReader(stream,StandardCharsets.UTF_8))){String line;while((line=r.readLine())!=null)s.append(line);}return s.toString();}
    private static final class CredentialFailure extends Exception { final String code; CredentialFailure(String code){super(code);this.code=code;} }
}
