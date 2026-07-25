const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const plugin = read('plugins-local/cordova-plugin-comaco-tracking/plugin.xml');
const nativeFinalization = read(
    'plugins-local/cordova-plugin-comaco-tracking/src/android/ComacoTrackingFinalizationPlugin.java'
);
const bridge = read(
    'plugins-local/cordova-plugin-comaco-tracking/www/ComacoTrackingAsyncFinalization.js'
);
const store = read(
    'plugins-local/cordova-plugin-comaco-tracking/src/android/TrackingStore.java'
);

test('el plugin registra la acción y el puente de finalización asíncrona', () => {
    assert.match(plugin, /ComacoTrackingFinalizationPlugin/);
    assert.match(plugin, /ComacoTrackingAsyncFinalization\.js/);
    assert.match(plugin, /<runs\s*\/>/);
});

test('el corte pausa la captura y responde sin esperar ACK', () => {
    assert.match(nativeFinalization, /beginFinalizationPreparation\(trackingId\)/);
    assert.match(nativeFinalization, /new TrackingPriorityBatchClaimer\(store\)\.prepare\(trackingId\)/);
    assert.match(nativeFinalization, /SECUENCIA_FINAL_LOCAL/);
    assert.match(nativeFinalization, /CANTIDAD_DESCARTADA_LOCAL/);
    assert.match(nativeFinalization, /DRENAJE_ASINCRONO/);
    assert.doesNotMatch(nativeFinalization, /SystemClock\.sleep/);
    assert.doesNotMatch(nativeFinalization, /TIMEOUT_MS/);
    assert.match(store, /status IN \('ACTIVA','ACTIVA_LOCAL'\)/);
});

test('el éxito operativo deja el tracking nativo drenando en segundo plano', () => {
    assert.match(nativeFinalization, /"confirmar"\.equals\(action\)/);
    assert.match(nativeFinalization, /store\.finalizeTracking\(trackingId\)/);
    assert.match(nativeFinalization, /finalizacion_asincrona_confirmada/);
    assert.match(store, /v\.put\("status", "FINALIZANDO"\)/);
    assert.match(store, /a\.status IN \('ACTIVA','PAUSADA_FINALIZACION','FINALIZANDO'\)/);
});

test('el puente confirma la guía antes de que termine el drenaje', () => {
    assert.match(bridge, /deviceready/);
    assert.match(bridge, /SeguimientoFinalizacionAsincrona\.asmx\/Solicitar/);
    assert.match(bridge, /uuid:\s*Obtener_dato_local\("uid"\)/);
    assert.match(bridge, /secuenciaFinalLocal: secuenciaFinal/);
    assert.match(bridge, /cantidadDescartadaLocal: descartadas/);
    assert.match(bridge, /await ejecutarNativo\("confirmar", idSeguimiento\)/);
    assert.doesNotMatch(bridge, /ACK_COMPLETO\s*!==\s*true/);
    assert.doesNotMatch(bridge, /POSICIONES_SIN_ACK\s*!==\s*0/);
});

test('un rechazo explícito reanuda captura y un éxito nunca se revierte', () => {
    assert.match(bridge, /if \(!respuestaServidor \|\| respuestaServidor\.STATUS !== true\)/);
    assert.match(bridge, /await ejecutarNativo\("cancelar", idSeguimiento\)/);
    assert.match(bridge, /servidorConfirmado = true/);
    assert.match(bridge, /return respuestaServidor/);
});

test('un timeout ambiguo conserva el mismo corte para un reintento idempotente', () => {
    assert.match(bridge, /var solicitudEnviada = false/);
    assert.match(bridge, /solicitudEnviada = true/);
    assert.match(bridge, /if \(!solicitudEnviada\)/);
    assert.match(bridge, /RESPUESTA_FINALIZACION_INDETERMINADA/);
    assert.match(bridge, /Se conserva PAUSADA_FINALIZACION/);
});
