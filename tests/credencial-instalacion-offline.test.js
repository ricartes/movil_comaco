const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
    path.join(root, 'www/js/Helper/gpsTracking.js'),
    'utf8'
);

function section(start, end) {
    const from = source.indexOf(start);
    const to = end ? source.indexOf(end, from) : source.length;
    assert.ok(from >= 0, `No se encontró ${start}.`);
    assert.ok(to > from, `No se encontró el cierre de ${start}.`);
    return source.slice(from, to);
}

test('gpsTracking conserva sintaxis JavaScript válida', () => {
    vm.runInNewContext(source, {
        document: { addEventListener() {} },
        console: { log() {}, warn() {}, error() {} }
    }, { filename: 'gpsTracking.js' });
});

test('recuperación usa single-flight y backoff', () => {
    const body = section(
        'function CREDENCIAL_asegurarInstalacion',
        'function CREDENCIAL_reintentarEnvioGuias'
    );
    assert.match(body, /if \(CREDENCIAL_asegurarPromesa\) return CREDENCIAL_asegurarPromesa/);
    assert.match(body, /CREDENCIAL_REINTENTO_FALLO_MS/);
    assert.match(body, /\.finally\(function \(\) \{\s*CREDENCIAL_asegurarPromesa = null;/s);
});

test('credencial se confirma en Android antes de continuar', () => {
    const body = section(
        'function CREDENCIAL_asegurarInstalacion',
        'function CREDENCIAL_reintentarEnvioGuias'
    );
    const confirm = body.indexOf('await AUDITORIA_confirmarLoginOnline');
    const verify = body.indexOf('await SEGUIMIENTO_pluginNativo().obtenerCredencialInstalacion()', confirm);
    assert.ok(confirm >= 0, 'No se confirma el token nativo.');
    assert.ok(verify > confirm, 'No se verifica la persistencia después de confirmarla.');
});

test('envío de guías valida y reintenta una sola vez', () => {
    const retry = section(
        'function CREDENCIAL_reintentarEnvioGuias',
        'if (CREDENCIAL_enviarGuiasOriginal)'
    );
    assert.equal(
        (retry.match(/CREDENCIAL_enviarGuiasOriginal\(/g) || []).length,
        2,
        'El flujo debe tener un intento original y un único reintento.'
    );
    const wrapper = section(
        'if (CREDENCIAL_enviarGuiasOriginal)',
        'if (CREDENCIAL_cargaParametrosOriginal)'
    );
    assert.match(wrapper, /CREDENCIAL_asegurarInstalacion\("antes_envio_guias"\)/);
});

test('login online espera reparación y el login local sigue disponible', () => {
    const body = section(
        'if (CREDENCIAL_loginWebOriginal)',
        'document.addEventListener("online"'
    );
    assert.match(body, /CREDENCIAL_asegurarInstalacion\("login_online"/);
    assert.match(body, /resultado\.estado = 0/);
    assert.match(body, /Principal\.js conserva el login local/);
});

test('recuperación no borra guías, auditorías ni posiciones', () => {
    const recovery = source.slice(source.indexOf('// Recuperación durable'));
    assert.doesNotMatch(recovery, /delete\s+from/i);
    assert.doesNotMatch(recovery, /DROP\s+TABLE/i);
    assert.doesNotMatch(recovery, /Borrar_dato_local\(/);
    assert.doesNotMatch(recovery, /DATOS_borra_gde/);
});

test('carga de parámetros y recuperación de red aseguran la credencial', () => {
    const params = section(
        'if (CREDENCIAL_cargaParametrosOriginal)',
        'if (CREDENCIAL_loginWebOriginal)'
    );
    assert.match(params, /CREDENCIAL_asegurarInstalacion\("carga_parametros"/);
    const online = source.slice(source.indexOf('document.addEventListener("online"'));
    assert.match(online, /CREDENCIAL_asegurarInstalacion\("conexion_recuperada"/);
});
