package io.gestionasi.comaco.tracking;

import android.database.Cursor;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Gestiona el corte operativo de una guía sin esperar a que el outbox quede vacío.
 * La captura se detiene primero y el uploader existente continúa trabajando en segundo plano.
 */
public final class ComacoTrackingFinalizationPlugin extends CordovaPlugin {
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callback) {
        if (!"preparar".equals(action)
                && !"confirmar".equals(action)
                && !"cancelar".equals(action)) {
            return false;
        }
        cordova.getThreadPool().execute(() -> run(action, args, callback));
        return true;
    }

    private void run(String action, JSONArray args, CallbackContext callback) {
        TrackingStore store = new TrackingStore(
                cordova.getContext().getApplicationContext());
        try {
            JSONObject input = args.getJSONObject(0);
            String trackingId = input.getString("ID_UNICO_SEGUIMIENTO").trim();

            if ("preparar".equals(action)) {
                callback.success(preparar(store, trackingId));
                return;
            }

            if ("confirmar".equals(action)) {
                store.finalizeTracking(trackingId);
                store.event(
                        "TRACK_FINALIZATION_ASYNC_CONFIRMED",
                        "tracking=" + partial(trackingId));
                iniciarDrenaje("finalizacion_asincrona_confirmada");
                callback.success(store.state(TrackingForegroundService.isRunning()));
                return;
            }

            store.cancelFinalizationPreparation(trackingId);
            store.event(
                    "TRACK_FINALIZATION_ASYNC_CANCELLED",
                    "tracking=" + partial(trackingId));
            callback.success(store.state(TrackingForegroundService.isRunning()));
        } catch (Exception exception) {
            try {
                store.event(
                        "TRACK_FINALIZATION_CUTOFF_ERROR",
                        action + ":" + exception.getClass().getSimpleName());
            } catch (Exception ignored) {
            }
            callback.error(error(exception).toString());
        } finally {
            store.close();
        }
    }

    private JSONObject preparar(TrackingStore store, String trackingId) throws Exception {
        // Este cambio de estado es el corte: capture() ya no selecciona esta guía.
        store.beginFinalizationPreparation(trackingId);

        // La misma normalización usada por el drenaje se ejecuta antes de informar
        // el corte al servidor, para que el conteo de descartes sea definitivo.
        new TrackingPriorityBatchClaimer(store).prepare(trackingId);
        store.expediteTrackingPending(trackingId, "async_finalization");

        JSONObject result = store.finalizationPreparationState(trackingId);
        long finalSequence = scalarLong(
                store,
                "SELECT sequence FROM active_tracking WHERE tracking_id=?",
                trackingId);
        long discarded = scalarLong(
                store,
                "SELECT COUNT(*) FROM position_outbox "
                        + "WHERE tracking_id=? AND state='FINAL' "
                        + "AND last_error='DESCARTADA_INVALIDA'",
                trackingId);

        result.put("SECUENCIA_FINAL_LOCAL", finalSequence);
        result.put("CANTIDAD_DESCARTADA_LOCAL", discarded);
        result.put("FECHA_TERMINO_DISPOSITIVO_UTC",
                TrackingStore.iso(System.currentTimeMillis()));
        result.put("DRENAJE_ASINCRONO", true);
        result.put("ACK_COMPLETO", result.getInt("POSICIONES_SIN_ACK") == 0);
        result.put("TIMEOUT", false);

        store.event(
                "TRACK_FINALIZATION_CUTOFF_CREATED",
                "tracking=" + partial(trackingId)
                        + " sequence=" + finalSequence
                        + " discarded=" + discarded
                        + " pending=" + result.getInt("POSICIONES_SIN_ACK"));

        iniciarDrenaje("finalizacion_asincrona");
        return result;
    }

    private void iniciarDrenaje(String reason) {
        TrackingForegroundService.start(
                cordova.getContext(),
                reason,
                false);
        TrackingForegroundService.requestImmediateDrain(reason);
    }

    private static long scalarLong(
            TrackingStore store,
            String sql,
            String trackingId) {
        try (Cursor cursor = store.getReadableDatabase().rawQuery(
                sql,
                new String[]{trackingId})) {
            return cursor.moveToFirst() && !cursor.isNull(0)
                    ? cursor.getLong(0)
                    : 0L;
        }
    }

    private static JSONObject error(Exception exception) {
        JSONObject result = new JSONObject();
        try {
            result.put("codigo", "TRACKING_ASYNC_FINALIZATION_ERROR");
            result.put("detalle", exception.getClass().getSimpleName());
        } catch (Exception ignored) {
        }
        return result;
    }

    private static String partial(String value) {
        return value == null ? "" : value.substring(0, Math.min(8, value.length()));
    }
}
