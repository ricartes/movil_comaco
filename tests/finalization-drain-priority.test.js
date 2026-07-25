const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const android = 'plugins-local/cordova-plugin-comaco-tracking/src/android/';
const uploader = read(android + 'TrackingUploader.java');
const priority = read(android + 'TrackingPriorityBatchClaimer.java');
const bridge = read('plugins-local/cordova-plugin-comaco-tracking/www/ComacoTracking.js');
const plugin = read('plugins-local/cordova-plugin-comaco-tracking/plugin.xml');

test('la guía pausada por finalización obtiene lotes dirigidos antes del drenaje global', () => {
    assert.match(priority, /status='PAUSADA_FINALIZACION'/);
    assert.match(priority, /WHERE tracking_id=\? AND state='PENDIENTE'/);
    assert.match(uploader, /priorityClaimer\.claim\(priority\.trackingId, drainCutoffMs\)/);
    assert.ok(
        uploader.indexOf('priorityClaimer.claim(priority.trackingId, drainCutoffMs)')
        < uploader.indexOf('store.claimBatch(drainCutoffMs)')
    );
});

test('la primera preparación recupera estados retenidos sin tocar otras guías', () => {
    assert.match(priority, /state IN \('PENDIENTE','ENVIANDO','ERROR_CREDENCIAL'\)/);
    assert.match(priority, /WHERE tracking_id=\?/);
    assert.match(uploader, /preparedFinalizations\.add\(priority\.key\(\)\)/);
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

test('el helper Android queda incluido en el plugin Cordova', () => {
    assert.match(plugin, /TrackingPriorityBatchClaimer\.java/);
});
