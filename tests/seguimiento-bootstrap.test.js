const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(raiz, 'www/js/Services/SeguimientoBootstrap.js'), 'utf8');

function crearEscenario() {
    const listeners = new Map();
    const llamadas = { tablas: 0, scheduler: 0, envios: 0, gps: 0, resumeInteractivo: 0 };
    const contexto = {
        Promise,
        console: { log() {}, warn() {}, error() {} },
        document: {
            addEventListener(nombre, callback) {
                if (!listeners.has(nombre)) listeners.set(nombre, []);
                listeners.get(nombre).push(callback);
            }
        },
        async Tablas_crear_tablas() { llamadas.tablas++; },
        async listarCredencialesSeguimientoActivas() { return []; },
        inicializarProgramadorEnvioSeguimiento() { llamadas.scheduler++; },
        solicitarEnvioSeguimiento() { llamadas.envios++; },
        async reevaluarTrackingAhora() { llamadas.gps++; },
        async manejarResumeInteractivo() { llamadas.resumeInteractivo++; }
    };
    vm.createContext(contexto);
    vm.runInContext(bootstrap, contexto, { filename: 'SeguimientoBootstrap.js' });
    return { contexto, listeners, llamadas };
}

test('bootstrap desde login es idempotente y no requiere sesión', async () => {
    const escenario = crearEscenario();
    await Promise.all([
        escenario.contexto.inicializarSeguimientoBootstrap(),
        escenario.contexto.inicializarSeguimientoBootstrap(),
        escenario.contexto.inicializarSeguimientoBootstrap()
    ]);
    assert.equal(escenario.llamadas.tablas, 1);
    assert.equal(escenario.llamadas.scheduler, 1);
    assert.equal(escenario.llamadas.envios, 1);
    assert.equal((escenario.listeners.get('resume') || []).length, 1);
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

test('logout conserva scheduler, GPS y background mode técnico', () => {
    const principal = fs.readFileSync(path.join(raiz, 'www/js/Vistas/Principal.js'), 'utf8');
    const inicio = principal.indexOf('function logout()');
    const fin = principal.indexOf('async function ok_login', inicio);
    const cuerpo = principal.slice(inicio, fin);
    assert.doesNotMatch(cuerpo, /detenerProgramadorEnvioSeguimiento/);
    assert.doesNotMatch(cuerpo, /stopTracking\s*\(/);
    assert.doesNotMatch(cuerpo, /desactivarBackgroundModeSeguro/);
    assert.match(cuerpo, /inicializarSeguimientoBootstrap/);
});
