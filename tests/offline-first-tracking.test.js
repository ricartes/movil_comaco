const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const gde = read('www/js/Datos/GDE.js');
const seguimiento = read('www/js/Datos/Seguimiento.js');
const webServices = read('www/js/WebServices.js');
const bootstrap = read('www/js/Services/SeguimientoBootstrap.js');
const facade = read('www/js/Helper/gpsTracking.js');
const bridge = read('plugins-local/cordova-plugin-comaco-tracking/www/ComacoTracking.js');
const store = read('plugins-local/cordova-plugin-comaco-tracking/src/android/TrackingStore.java');
const plugin = read('plugins-local/cordova-plugin-comaco-tracking/src/android/ComacoTrackingPlugin.java');
const boot = read('plugins-local/cordova-plugin-comaco-tracking/src/android/TrackingBootReceiver.java');

test('emisión local genera una vez UUID seguro y fecha UTC dentro del update durable', () => {
    const actualizar = gde.slice(
        gde.indexOf('function GDE_actualizarEstadoConSeguimiento'),
        gde.indexOf('function DATOS_cambiar_estado_gde')
    );
    assert.match(actualizar, /SEGUIMIENTO_generarUuid\(\)/);
    assert.match(actualizar, /new Date\(\)\.toISOString\(\)/);
    assert.match(actualizar, /COALESCE\(NULLIF\(TRIM\(ID_UNICO_SEGUIMIENTO\),''\),\?\)/);
    assert.match(actualizar, /COALESCE\(NULLIF\(TRIM\(FECHA_INICIO_DISPOSITIVO_UTC\),''\),\?\)/);
    assert.ok(actualizar.indexOf('db.transaction') < actualizar.indexOf('GDE_notificarSeguimientoDespuesCommit'));
});

test('Recibe_Guia_V3 incluye identidad provisional y elimina cualquier token del JSON', () => {
    const selector = gde.slice(
        gde.indexOf('function DATOS_seleccionar_gde_proveedor_por_enviar'),
        gde.indexOf('function DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas')
    );
    const envio = webServices.slice(
        webServices.indexOf('function enviar_guias_proveedor'),
        webServices.indexOf('function enviar_evidencias_proveedor')
    );
    assert.match(selector, /gde\.ID_UNICO_SEGUIMIENTO = rs_datos\.ID_UNICO_SEGUIMIENTO/);
    assert.match(selector, /gde\.FECHA_INICIO_DISPOSITIVO_UTC = rs_datos\.FECHA_INICIO_DISPOSITIVO_UTC/);
    assert.match(envio, /Recibe_Guia_V3/);
    assert.match(envio, /delete guia\.TOKEN_SEGUIMIENTO/);
});

test('registro provisional es explícito, idempotente y arranca el foreground service', () => {
    assert.match(bridge, /registrarSeguimientoLocal/);
    assert.match(plugin, /case "registrarSeguimientoLocal"/);
    assert.match(plugin, /ensureService\("nuevo_seguimiento_local", true\)/);
    assert.match(store, /status", "ACTIVA_LOCAL"/);
    assert.match(store, /TRACK_LOCAL_RECONCILED/);
    assert.match(store, /token_cipher"\)/);
});

test('captura offline conserva UUID, secuencia y outbox para ACTIVA_LOCAL', () => {
    const capture = store.slice(
        store.indexOf('synchronized int capture'),
        store.indexOf('synchronized UploadBatch')
    );
    assert.match(capture, /status IN \('ACTIVA','ACTIVA_LOCAL'\)/);
    assert.match(capture, /long sequence = c\.getLong\(2\) \+ 1/);
    assert.match(capture, /UUID\.randomUUID\(\)\.toString\(\), captureId, trackingId/);
    assert.doesNotMatch(capture, /Connectivity|Network|TOKEN/);
});

test('uploader filtra token antes de elegir seguimiento y no bloquea otros lotes', () => {
    const claim = store.slice(
        store.indexOf('synchronized UploadBatch claimBatch'),
        store.indexOf('synchronized void confirm')
    );
    assert.match(claim, /a\.token_cipher IS NOT NULL AND a\.token_iv IS NOT NULL/);
    assert.ok(claim.indexOf('token_cipher IS NOT NULL') < claim.indexOf('trackingId == null'));
    assert.doesNotMatch(claim.slice(0, claim.indexOf('trackingId == null')), /attempts/);
});

test('autorización rota token en la misma fila y preserva secuencia y fecha inicial', () => {
    const authorize = store.slice(
        store.indexOf('synchronized void upsertTracking'),
        store.indexOf('synchronized void finalizeTracking')
    );
    assert.match(authorize, /SELECT tracking_id,mobile_id,device_uuid,device_started_utc,sequence,created_ms/);
    assert.match(authorize, /sequence = c\.getLong\(4\)/);
    assert.match(authorize, /startedUtc = c\.getString\(3\)/);
    assert.match(authorize, /token_cipher/);
    assert.match(authorize, /status", "ACTIVA"/);
    assert.match(authorize, /CONFLICT_REPLACE/);
    assert.match(authorize, /SEGUIMIENTO_UUID_RESPUESTA_DIFERENTE/);
});

test('resume y boot recuperan provisionales y logout no participa', () => {
    assert.match(bootstrap, /SEGUIMIENTO_reconciliarProvisionalesLocales/);
    assert.match(bootstrap, /SEGUIMIENTO_listarGuiasLocalesPendientes/);
    assert.match(boot, /store\.hasLocalActive\(\)/);
    assert.match(boot, /TrackingForegroundService\.start/);
    assert.match(seguimiento, /GDE_ESTADO_MOVIL = 'I'/);
});

test('anulación local es terminal, conserva diagnóstico y no queda elegible para subir', () => {
    assert.match(gde, /cancelarSeguimientoLocalNativo/);
    assert.match(bridge, /cancelarSeguimientoLocal/);
    assert.match(store, /status", "CANCELADA_LOCAL"/);
    assert.match(store, /TRACK_LOCAL_CANCELLED/);
    assert.doesNotMatch(
        store.slice(store.indexOf('synchronized void cancelLocalTracking'), store.indexOf('synchronized void upsertTracking')),
        /DELETE/
    );
});

test('diagnóstico expone locales, acumuladas, espera de credencial y drenaje autorizado', () => {
    for (const field of [
        'seguimientosLocalesPendientes',
        'posicionesLocalesAcumuladas',
        'seguimientosEsperandoCredencial',
        'seguimientosAutorizadosDrenando'
    ]) assert.match(store, new RegExp(field));
    assert.match(facade, /registrarErrorSeguimientoNativo/);
    assert.match(plugin, /registrarErrorTecnico/);
});

test('envío de guía es single-flight y valida estrictamente el UUID devuelto', () => {
    assert.match(webServices, /ENVIO_GUIAS_enCurso/);
    assert.match(webServices, /ENVIO_GUIAS_callbacksPendientes/);
    assert.match(seguimiento, /SEGUIMIENTO_UUID_RESPUESTA_DIFERENTE/);
    assert.match(seguimiento, /ID_UNICO_SEGUIMIENTO local/);
});
