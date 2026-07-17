const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(raiz, 'www/js/Services/SeguimientoBootstrap.js'), 'utf8');

function crearEscenario(opciones = {}) {
    const listeners = new Map();
    const orden = [];
    const llamadas = {
        configurar: 0,
        tablas: 0,
        migraciones: 0,
        scheduler: 0,
        envios: 0,
        gps: 0,
        consultaTecnica: 0,
        resumeInteractivo: 0
    };
    const contexto = {
        Promise,
        console: { log() {}, warn() {}, error() {} },
        document: {
            addEventListener(nombre, callback) {
                if (!listeners.has(nombre)) listeners.set(nombre, []);
                listeners.get(nombre).push(callback);
            }
        },
        async configureBackgroundGeolocation() {
            llamadas.configurar++;
            orden.push('configurar');
            if (opciones.promesaConfiguracion) await opciones.promesaConfiguracion;
        },
        async Tablas_crear_tablas() { llamadas.tablas++; orden.push('tablas'); },
        async comprobarActualizarEsquema() { llamadas.migraciones++; orden.push('migraciones'); },
        async listarCredencialesSeguimientoActivas() {
            return opciones.credencialesActivas || [];
        },
        async DATOS_seleccionarGuiasSeguimientoTecnicoActivas() {
            llamadas.consultaTecnica++;
            return opciones.guiasTecnicas || [];
        },
        inicializarProgramadorEnvioSeguimiento() { llamadas.scheduler++; orden.push('scheduler'); },
        solicitarEnvioSeguimiento() { llamadas.envios++; },
        async reevaluarTrackingAhora() {
            llamadas.gps++;
            orden.push('gps');
            return opciones.gpsIniciado === true;
        },
        async manejarResumeInteractivo() { llamadas.resumeInteractivo++; }
    };
    vm.createContext(contexto);
    vm.runInContext(bootstrap, contexto, { filename: 'SeguimientoBootstrap.js' });
    return { contexto, listeners, llamadas, orden };
}

test('bootstrap desde login es idempotente y no requiere sesión', async () => {
    const escenario = crearEscenario();
    await Promise.all([
        escenario.contexto.inicializarSeguimientoBootstrap(),
        escenario.contexto.inicializarSeguimientoBootstrap(),
        escenario.contexto.inicializarSeguimientoBootstrap()
    ]);
    assert.equal(escenario.llamadas.tablas, 1);
    assert.equal(escenario.llamadas.migraciones, 1);
    assert.equal(escenario.llamadas.configurar, 1);
    assert.equal(escenario.llamadas.scheduler, 1);
    assert.equal(escenario.llamadas.envios, 1);
    assert.equal((escenario.listeners.get('resume') || []).length, 1);
    assert.equal((escenario.listeners.get('deviceready') || []).length, 0);
});

test('resume reutiliza bootstrap y mantiene una suscripción técnica', async () => {
    const escenario = crearEscenario();
    await escenario.contexto.inicializarSeguimientoBootstrap();
    await escenario.contexto.SEGUIMIENTO_alResumeTecnico();
    await escenario.contexto.SEGUIMIENTO_alResumeTecnico();
    assert.equal(escenario.llamadas.tablas, 1);
    assert.equal(escenario.llamadas.scheduler, 1);
    assert.equal(escenario.llamadas.resumeInteractivo, 2);
    assert.equal((escenario.listeners.get('resume') || []).length, 1);
});

test('bootstrap espera la configuración GPS antes de migrar y reconciliar', async () => {
    let liberarConfiguracion;
    const promesaConfiguracion = new Promise(function (resolve) {
        liberarConfiguracion = resolve;
    });
    const escenario = crearEscenario({ promesaConfiguracion });
    const inicializacion = escenario.contexto.inicializarSeguimientoBootstrap();

    await Promise.resolve();
    assert.deepEqual(escenario.orden, ['configurar']);

    liberarConfiguracion();
    await inicializacion;
    assert.deepEqual(
        escenario.orden,
        ['configurar', 'tablas', 'migraciones', 'scheduler', 'gps']
    );
});

test('cold start sin sesión consulta guías técnicas y solicita drenaje', async () => {
    const escenario = crearEscenario({
        guiasTecnicas: [{ ID_UNICO_MOVIL: 'GUIA-1' }],
        credencialesActivas: [{ ESTADO: 'ACTIVA' }],
        gpsIniciado: true
    });

    await escenario.contexto.inicializarSeguimientoBootstrap();
    assert.equal(escenario.llamadas.consultaTecnica, 1);
    assert.equal(escenario.llamadas.gps, 1);
    assert.equal(escenario.llamadas.envios, 1);
});

test('logout conserva scheduler, GPS y background mode técnico', () => {
    const principal = fs.readFileSync(path.join(raiz, 'www/js/Vistas/Principal.js'), 'utf8');
    const inicio = principal.indexOf('function logout()');
    const fin = principal.indexOf('async function ok_login', inicio);
    const cuerpo = principal.slice(inicio, fin);
    assert.doesNotMatch(cuerpo, /detenerProgramadorEnvioSeguimiento/);
    assert.doesNotMatch(cuerpo, /stopTracking\s*\(/);
    assert.doesNotMatch(cuerpo, /desactivarBackgroundModeSeguro/);
    assert.match(cuerpo, /inicializarSeguimientoBootstrap/);
    assert.match(cuerpo, /reevaluarTrackingAhora/);
    assert.match(cuerpo, /solicitarEnvioSeguimiento\("logout", true\)/);
});
