const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const manual = read('www/js/Vistas/FinalizacionManual.js');
const ingreso = read('www/js/Vistas/IngresoPlanta.js');
const servicios = read('www/js/Services/EnvioControlService.js');
const webServices = read('www/js/WebServices.js');
const index = read('www/index.html');
const plugin = read('plugins-local/cordova-plugin-comaco-tracking/src/android/ComacoTrackingPlugin.java');
const store = read('plugins-local/cordova-plugin-comaco-tracking/src/android/TrackingStore.java');
const service = read('plugins-local/cordova-plugin-comaco-tracking/src/android/TrackingForegroundService.java');

function escenarioManual() {
    const ui = { alertas: [], atras: 0 };
    function selector() {
        return {
            show() {}, hide() {}, on() {}, text() {},
            addClass() {}, removeClass() {}, attr() {}
        };
    }
    const contexto = {
        console: { log() {}, warn() {}, error() {} },
        document: { addEventListener() {} },
        Promise,
        setTimeout,
        clearTimeout,
        $$: selector,
        app: {
            dialog: {
                alert(mensaje, titulo, callback) {
                    ui.alertas.push({ mensaje, titulo });
                    if (callback) callback();
                },
                confirm() {}, prompt() {}, preloader() {}, close() {}
            }
        },
        mainView: { router: { navigate() {} } },
        checkConnection: () => 'WiFi connection',
        comprueba_conexion: (valor, callback) => callback(1),
        Obtener_dato_local: () => '0',
        validarEvidenciasIngresoPlantaLocales: async () => ({ valido: true }),
        evaluarGeocercaConfirmacionIngreso: async () => ({ cierra: true }),
        enviarConfirmacionIngresoPlantaService: async () => ({ total: 1, exitosos: 1, erroneos: 0, detalle: [{}] }),
        ir_atras_boton: () => { ui.atras++; },
        gdeSeleccionadaIngresoPlanta: { ROWID: 7, ID_UNICO_MOVIL: 'GUIA-7', GDE_COD_DESTINO: 'DESTINO' }
    };
    vm.createContext(contexto);
    vm.runInContext(manual, contexto, { filename: 'FinalizacionManual.js' });
    contexto.FINALIZACION_MANUAL_debugHabilitado = true;
    contexto.FINALIZACION_MANUAL_modoActivo = true;
    return { contexto, ui };
}

test('opción separada se controla por FLAG_DEBUGGABLE', () => {
    assert.match(index, /rowFinalizarFueraGeocercaDebug[^>]*display:none/);
    assert.match(manual, /info && info\.DEBUG === true/);
    assert.match(plugin, /ApplicationInfo\.FLAG_DEBUGGABLE/);
    assert.match(index, /Finalizar fuera de geocerca/i);
});

test('cancelar la primera confirmación no inicia finalización', async () => {
    const { contexto } = escenarioManual();
    let enviados = 0;
    contexto.FINALIZACION_MANUAL_confirmar = async () => false;
    contexto.enviarConfirmacionIngresoPlantaService = async () => { enviados++; };
    assert.equal(await contexto.confirmarIngresoPlantaManual(), false);
    assert.equal(enviados, 0);
});

test('cancelar la segunda confirmación no inicia finalización', async () => {
    const { contexto } = escenarioManual();
    const respuestas = [true, false];
    let enviados = 0;
    contexto.FINALIZACION_MANUAL_confirmar = async () => respuestas.shift();
    contexto.enviarConfirmacionIngresoPlantaService = async () => { enviados++; };
    assert.equal(await contexto.confirmarIngresoPlantaManual(), false);
    assert.equal(enviados, 0);
});

test('motivo vacío es rechazado antes de tocar servidor', async () => {
    const { contexto, ui } = escenarioManual();
    let enviados = 0;
    contexto.FINALIZACION_MANUAL_confirmar = async () => true;
    contexto.FINALIZACION_MANUAL_solicitarMotivo = async () => '';
    contexto.enviarConfirmacionIngresoPlantaService = async () => { enviados++; };
    assert.equal(await contexto.confirmarIngresoPlantaManual(), false);
    assert.equal(enviados, 0);
    assert.match(ui.alertas.at(-1).mensaje, /motivo/i);
});

test('doble clic queda bloqueado por single-flight de interfaz', async () => {
    const { contexto } = escenarioManual();
    contexto.FINALIZACION_MANUAL_finalizando = true;
    assert.equal(await contexto.confirmarIngresoPlantaManual(), false);
});

test('finalización manual envía origen y motivo sin usar anulación', async () => {
    const { contexto } = escenarioManual();
    let opciones;
    contexto.FINALIZACION_MANUAL_confirmar = async () => true;
    contexto.FINALIZACION_MANUAL_solicitarMotivo = async () => 'Prueba excepcional';
    contexto.enviarConfirmacionIngresoPlantaService = async (gde, input) => {
        opciones = input;
        return { total: 1, exitosos: 1, erroneos: 0, detalle: [{}] };
    };
    assert.equal(await contexto.confirmarIngresoPlantaManual(), true);
    assert.equal(opciones.ORIGEN_FINALIZACION, 'MANUAL_FUERA_GEOCERCA');
    assert.equal(opciones.MOTIVO_FINALIZACION, 'Prueba excepcional');
    assert.doesNotMatch(manual, /ControlServiceAnular|Recibe_AnulacionGuia/);
});

test('error servidor informa fallo y conserva la ruta de reintento', async () => {
    const { contexto, ui } = escenarioManual();
    contexto.FINALIZACION_MANUAL_confirmar = async () => true;
    contexto.FINALIZACION_MANUAL_solicitarMotivo = async () => 'Prueba HTTP';
    contexto.enviarConfirmacionIngresoPlantaService = async () => { throw new Error('HTTP_500'); };
    assert.equal(await contexto.confirmarIngresoPlantaManual(), false);
    assert.match(ui.alertas.at(-1).mensaje, /tracking y las posiciones se conservaron/i);
    assert.equal(contexto.FINALIZACION_MANUAL_finalizando, false);
});

test('normal rechaza geocerca bloqueante y usa origen GEOCERCA', () => {
    const inicio = ingreso.indexOf('function confirmarIngresoPlanta()');
    const fin = ingreso.indexOf('async function evaluarGeocercaConfirmacionIngreso', inicio);
    const cuerpo = ingreso.slice(inicio, fin);
    assert.match(cuerpo, /if \(resumenGeocerca\.cierra\)/);
    assert.match(cuerpo, /ORIGEN_FINALIZACION: "GEOCERCA"/);
    assert.doesNotMatch(cuerpo, /aplicarAnulacionPorGeocercaEnConfirmacion/);
});

test('drenaje pausa solo el seguimiento, espera ACK y reanuda ante error', () => {
    assert.match(store, /PAUSADA_FINALIZACION/);
    assert.match(store, /tracking_id=\? AND status='ACTIVA'/);
    assert.match(store, /POSICIONES_SIN_ACK/);
    assert.match(store, /recoverStaleFinalizationPreparations/);
    assert.match(service, /recoverStaleFinalizationPreparations\(60000L\)/);
    assert.match(plugin, /preparationTimeoutMs/);
    assert.match(service, /requestImmediateDrain/);
    assert.ok(webServices.indexOf('prepararFinalizacionSeguimientoNativo') < webServices.indexOf('Recibe_ConfirmacionIngresoPlanta_V2'));
    assert.match(webServices, /cancelarPreparacionFinalizacionSeguimientoNativo/);
    assert.match(webServices, /servidorConfirmado/);
});

test('el servicio actualiza SQLite solo después del éxito del servidor', () => {
    const inicio = servicios.indexOf('async function enviarConfirmacionIngresoPlantaService');
    const fin = servicios.indexOf('async function enviarMotivoAnulacion', inicio);
    const cuerpo = servicios.slice(inicio, fin);
    assert.ok(cuerpo.indexOf('STATUS === true') < cuerpo.indexOf('DATOS_confirmaIngresoPlanta'));
    assert.match(cuerpo, /origen_finalizacion/);
});
