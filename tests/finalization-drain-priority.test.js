const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const android = 'plugins-local/cordova-plugin-comaco-tracking/src/android/';
const uploader = read(android + 'TrackingUploader.java');
const priority = read(android + 'TrackingPriorityBatchClaimer.java');
const service = read(android + 'TrackingForegroundService.java');
const bridge = read('plugins-local/cordova-plugin-comaco-tracking/www/ComacoTracking.js');
const plugin = read('plugins-local/cordova-plugin-comaco-tracking/plugin.xml');

test('la guía pausada por finalización obtiene lotes dirigidos antes del drenaje global', () => {
    assert.match(priority, /status='PAUSADA_FINALIZACION'/);
    assert.match(priority, /WHERE tracking_id=\? AND state='PENDIENTE'/);
    assert.match(
        uploader,
        /priorityClaimer\.claim\([\s\S]*priority\.trackingId,[\s\S]*drainCutoffMs,[\s\S]*priorityLimit\)/
    );
    assert.ok(
        uploader.indexOf('priorityClaimer.claim(')
        < uploader.indexOf('store.claimBatch(drainCutoffMs)')
    );
});

test('la primera preparación recupera cualquier estado no terminal sin tocar otras guías', () => {
    assert.match(priority, /state NOT IN \('CONFIRMADA','FINAL'\)/);
    assert.match(priority, /WHERE tracking_id=\?/);
    assert.match(priority, /pending\.put\("next_retry_ms", 0\)/);
    assert.match(uploader, /preparedFinalizations\.add\(priority\.key\(\)\)/);
});

test('la preparación normaliza campos GPS opcionales que el web rechazaría', () => {
    assert.match(priority, /accuracy > 999999\.99/);
    assert.match(priority, /speed > 99999\.999/);
    assert.match(priority, /bearing > 359\.994/);
    assert.match(priority, /altitude < -1000 OR altitude > 20000/);
    assert.match(priority, /LENGTH\(origin\)>20/);
    assert.match(priority, /values\.putNull\(column\)/);
});

test('una posición esencialmente inválida se descarta y deja de bloquear la finalización', () => {
    assert.match(priority, /INVALID_POSITION_CODE = "DESCARTADA_INVALIDA"/);
    assert.match(priority, /invalid\.put\("state", TrackingStore\.FINAL\)/);
    assert.match(priority, /latitude < -90 OR latitude > 90/);
    assert.match(priority, /longitude < -180 OR longitude > 180/);
    assert.match(priority, /SUBSTR\(TRIM\(date_utc\),-1,1\)<>'Z'/);
    assert.match(priority, /STRFTIME\('%s',TRIM\(date_utc\)\) IS NULL/);
    assert.match(priority, /GPS_FINALIZATION_INVALID_DISCARDED/);
});

test('el drenaje prioritario no bloquea posiciones por una fecha local futura', () => {
    const claim = priority.slice(
        priority.indexOf('TrackingStore.UploadBatch claim'),
        priority.indexOf('private static int normalizeNullable')
    );
    assert.match(claim, /next_retry_ms<=\?/);
    assert.doesNotMatch(claim, /created_ms<=\?/);
    assert.match(claim, /GPS_FINALIZATION_PRIORITY_NO_BATCH/);
});

test('un error propio de una guía no detiene el drenaje de las demás', () => {
    assert.match(uploader, /enum UploadOutcome/);
    assert.match(uploader, /return UploadOutcome\.TRACKING_FAILURE/);
    assert.match(uploader, /if \(outcome == UploadOutcome\.GLOBAL_FAILURE\) break/);
    assert.match(uploader, /if \(priorityBatch && outcome == UploadOutcome\.TRACKING_FAILURE\) priority = null/);
});

test('la finalización usa una ventana coherente y un solo intento HTTP prioritario', () => {
    assert.match(bridge, /Math\.max\(30000, Number\(timeoutMs\) \|\| 30000\)/);
    assert.match(uploader, /batch\.shortRetries = 0/);
});

test('una solicitud concurrente de drenaje se conserva y se ejecuta después del ciclo actual', () => {
    assert.match(uploader, /AtomicBoolean drainRequested/);
    assert.match(uploader, /drainRequested\.set\(true\)/);
    assert.match(uploader, /GPS_DRAIN_QUEUED/);
    assert.match(uploader, /do \{/);
    assert.match(uploader, /while \(drainRequested\.get\(\)\)/);
    assert.match(uploader, /coalesced_after_release/);
    assert.doesNotMatch(uploader, /GPS_DRAIN_SKIPPED/);
});

test('el drenaje urgente invoca directamente al uploader sin depender del handler GPS', () => {
    const immediate = service.slice(
        service.indexOf('static boolean requestImmediateDrain'),
        service.indexOf('public static void start')
    );
    assert.match(immediate, /GPS_IMMEDIATE_DRAIN_REQUESTED/);
    assert.match(immediate, /current\.uploader\.drain\(trigger\)/);
    assert.doesNotMatch(immediate, /handler\.post/);
    assert.doesNotMatch(immediate, /handler == null/);
});

test('la actualización del servicio se antepone a callbacks pendientes durante la finalización', () => {
    const refresh = service.slice(
        service.indexOf('private void requestRefresh'),
        service.indexOf('private final Runnable periodicDrain')
    );
    assert.match(refresh, /postAtFrontOfQueue/);
});

test('un rechazo funcional grande se reintenta en lotes menores sin perder posiciones', () => {
    assert.match(priority, /maximumItems/);
    assert.match(priority, /Math\.min\(configuredLimit, Math\.max\(1, maximumItems\)\)/);
    assert.match(uploader, /PRIORITY_RETRY/);
    assert.match(uploader, /GPS_FINALIZATION_BATCH_REDUCED/);
    assert.match(uploader, /expediteTrackingPending\(batch\.trackingId, "finalization_split"\)/);
    assert.match(uploader, /priorityLimit = Math\.max\(1, previousLimit \/ 2\)/);
});

test('una respuesta funcional sin código deja un diagnóstico estable', () => {
    assert.match(uploader, /if \(code\.isEmpty\(\)\) code = "FALLA_FUNCIONAL"/);
    assert.match(uploader, /GPS_FINALIZATION_POSITION_REJECTED/);
});

test('el helper Android queda incluido en el plugin Cordova', () => {
    assert.match(plugin, /TrackingPriorityBatchClaimer\.java/);
});
