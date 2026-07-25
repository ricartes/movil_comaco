const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const uploader = fs.readFileSync(
    path.join(
        root,
        'plugins-local/cordova-plugin-comaco-tracking/src/android/TrackingUploader.java'
    ),
    'utf8'
);

test('una posición posterior al corte recibe un ACK terminal', () => {
    const acknowledge = uploader.slice(
        uploader.indexOf('private void acknowledge'),
        uploader.indexOf('private static boolean isSplittablePriorityFailure')
    );

    assert.match(acknowledge, /DESCARTADA_FUERA_CORTE/);
    assert.match(acknowledge, /terminal\.add\(id\)/);
    assert.match(acknowledge, /store\.confirm\(terminal, batch\.items\)/);
    assert.doesNotMatch(acknowledge, /store\.fail/);
});

test('el descarte queda registrado para diagnóstico sin exponer el UUID completo', () => {
    assert.match(uploader, /GPS_POSITION_DISCARDED_AFTER_CUTOFF/);
    assert.match(uploader, /tracking=" \+ partial\(batch\.trackingId\)/);
    assert.doesNotMatch(uploader, /GPS_POSITION_DISCARDED_AFTER_CUTOFF[\s\S]*uuidPosition/);
});
