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
const bootstrap = fs.readFileSync(
    path.join(root, 'www/js/Services/SeguimientoBootstrap.js'),
    'utf8'
);

function section(text, start, end) {
    const from = text.indexOf(start);
    const to = end ? text.indexOf(end, from) : text.length;
    assert.ok(from >= 0, `No se encontró ${start}.`);
    assert.ok(to > from, `No se encontró el cierre de ${start}.`);
    return text.slice(from, to);
}

test('scripts de credencial conservan sintaxis JavaScript válida', () => {
    vm.runInNewContext(source, {
        document: { addEventListener() {} },
        console: { log() {}, warn() {}, error() {} }
    }, { filename: 'gpsTracking.js' });
    vm.runInNewContext(bootstrap, {
        document: { addEventListener() {} },
        console: { log() {}, warn() {}, error() {} }
    }, { filename: 'SeguimientoBootstrap.js' });
});

test('recuperación usa single-flight y backoff', () => {
    const body = section(
        source,
        'function CREDENCIAL_asegurarInstalacion',
        'function CREDENCIAL_reintentarEnvioGuias'
    );
    assert.match(body, /if \(CREDENCIAL_asegurarPromesa\) return CREDENCIAL_asegurarPromesa/);
    assert.match(body, /CREDENCIAL_REINTENTO_FALLO_MS/);
    assert.match(body, /\.finally\(function \(\) \{\s*CREDENCIAL_asegurarPromesa = null;/s);
});

test('credencial se confirma en Android antes de continuar', () => {
    const body = section(
        source,
        'function CREDENCIAL_asegurarInstalacion',
        'function CREDENCIAL_reintentarEnvioGuias'
    );
    const confirm = body.indexOf('await AUDITORIA_confirmarLoginOnline');
    const verify = body.indexOf('await SEGUIMIENTO_pluginNativo().obtenerCredencialInstalacion()', confirm);
    assert.ok(confirm >= 0, 'No se confirma el token nativo.');
    assert.ok(verify > confirm, 'No se verifica la persistencia después de confirmarla.');
});

test('validación no envía contraseña hasta que el servidor exige renovación', () => {
    const body = section(
        bootstrap,
        'function CREDENCIAL_instalarValidacionSinPassword',
        '// Login V2 seguro'
    );
    const firstPassword = body.indexOf('password: ""');
    const renewalCode = body.indexOf('CREDENCIAL_REQUIERE_RENOVACION');
    const renewalPassword = body.indexOf('password: passwordRenovacion');
    assert.ok(firstPassword >= 0, 'La primera validación debe omitir la contraseña.');
    assert.ok(renewalCode > firstPassword, 'No se evalúa la solicitud explícita de renovación.');
    assert.ok(renewalPassword > renewalCode, 'La contraseña se usa antes de que el servidor solicite renovación.');
    assert.match(body, /renovacion\.password = ""/);
    assert.match(body, /passwordRenovacion = ""/);
});

test('envío de guías valida y reintenta una sola vez', () => {
    const retry = section(
        source,
        'function CREDENCIAL_reintentarEnvioGuias',
        'if (CREDENCIAL_enviarGuiasOriginal)'
    );
    assert.equal(
        (retry.match(/CREDENCIAL_enviarGuiasOriginal\(/g) || []).length,
        2,
        'El flujo debe tener un intento original y un único reintento.'
    );
    const wrapper = section(
        source,
        'if (CREDENCIAL_enviarGuiasOriginal)',
        'if (CREDENCIAL_cargaParametrosOriginal)'
    );
    assert.match(wrapper, /CREDENCIAL_asegurarInstalacion\("antes_envio_guias"\)/);
});

test('login V2 espera persistencia y no cae a legacy ante respuesta ambigua', () => {
    const body = section(
        bootstrap,
        'function CREDENCIAL_instalarLoginSeguro',
        'CREDENCIAL_instalarValidacionSinPassword();'
    );
    const confirm = body.indexOf('await AUDITORIA_confirmarLoginOnline');
    const verify = body.indexOf('await SEGUIMIENTO_pluginNativo().obtenerCredencialInstalacion()', confirm);
    const successCallback = body.indexOf('callback(u)', verify);
    assert.ok(confirm >= 0, 'El login no espera la confirmación nativa.');
    assert.ok(verify > confirm, 'El login no verifica la persistencia del token.');
    assert.ok(successCallback > verify, 'El callback de login ocurre antes de verificar el token.');
    assert.doesNotMatch(body, /login_web_legacy/);
    assert.match(body, /LOGIN_V2_RESPUESTA_AMBIGUA/);
    assert.match(body, /u\.estado = 0/);
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
        source,
        'if (CREDENCIAL_cargaParametrosOriginal)',
        'if (CREDENCIAL_loginWebOriginal)'
    );
    assert.match(params, /CREDENCIAL_asegurarInstalacion\("carga_parametros"/);
    const online = source.slice(source.indexOf('document.addEventListener("online"'));
    assert.match(online, /CREDENCIAL_asegurarInstalacion\("conexion_recuperada"/);
});
