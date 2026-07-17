const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const principal = fs.readFileSync(path.join(raiz, 'www/js/Vistas/Principal.js'), 'utf8');
const impresion = fs.readFileSync(path.join(raiz, 'www/js/Vistas/Impresion.js'), 'utf8');
const webServices = fs.readFileSync(path.join(raiz, 'www/js/WebServices.js'), 'utf8');
const gdeDatos = fs.readFileSync(path.join(raiz, 'www/js/Datos/GDE.js'), 'utf8');

function extraerFuncion(codigo, nombre, siguienteNombre) {
    const inicio = codigo.indexOf(`function ${nombre}`);
    const fin = codigo.indexOf(`function ${siguienteNombre}`, inicio);
    assert.ok(inicio >= 0 && fin > inicio, `No se encontró ${nombre}.`);
    return codigo.slice(inicio, fin);
}

function crearEscenarioCommitCoordenadas() {
    let callbackSentencia;
    let callbackError;
    let callbackCommit;
    const contexto = {
        window: {
            sqlitePlugin: {
                openDatabase() {
                    return {
                        transaction(accion, error, commit) {
                            callbackError = error;
                            callbackCommit = commit;
                            accion({
                                executeSql(sql, parametros, exito) {
                                    callbackSentencia = exito;
                                }
                            });
                        }
                    };
                }
            }
        }
    };
    vm.createContext(contexto);
    vm.runInContext(
        extraerFuncion(gdeDatos, 'DATOS_asigna_coordenadas', 'DATOS_cambiaEstadoCamionVacio'),
        contexto,
        { filename: 'GDE-coordenadas.js' }
    );
    return {
        contexto,
        sentenciaExitosa(resultado = { rowsAffected: 1 }) { callbackSentencia({}, resultado); },
        rollback(error = new Error('rollback')) { callbackError(error); },
        commit() { callbackCommit(); }
    };
}

function estabilizar() {
    return new Promise(resolve => setImmediate(resolve));
}

function crearEscenario(opciones = {}) {
    let siguienteId = 1;
    const intervalos = new Map();
    const timeouts = new Map();
    const listeners = new Map();
    const almacenamiento = {
        rut_activo: '11111111-1',
        user_activo: 'usuario',
        bloqueado: 0
    };
    const llamadas = { guias: 0, evidencias: 0, imagenes: 0, actualizaciones: 0 };
    const logs = [];
    let conectado = opciones.conectado !== false;

    const contexto = {
        Error,
        Number,
        Promise,
        String,
        console: {
            log(valor) { logs.push(String(valor)); },
            warn(valor) { logs.push(String(valor)); },
            error(valor) { logs.push(String(valor)); }
        },
        document: {
            addEventListener(nombre, callback) { listeners.set(nombre, callback); }
        },
        setInterval(callback, demora) {
            const id = siguienteId++;
            intervalos.set(id, { callback, demora });
            return id;
        },
        clearInterval(id) { intervalos.delete(id); },
        setTimeout(callback, demora) {
            const id = siguienteId++;
            timeouts.set(id, { callback, demora: Number(demora) || 0 });
            return id;
        },
        clearTimeout(id) { timeouts.delete(id); },
        Obtener_dato_local(clave) { return almacenamiento[clave]; },
        Guardar_dato_local(clave, valor) { almacenamiento[clave] = valor; },
        checkConnection() { return conectado ? 'WiFi connection' : 'No network connection'; },
        comprueba_conexion(bandera, callback) { callback(conectado ? 1 : 0); },
        enviar_guias_proveedor(bandera, callback) { llamadas.guias++; callback(1); },
        enviar_evidencias_proveedor(bandera, callback) { llamadas.evidencias++; callback(0); },
        enviar_imagenes(bandera, callback) { llamadas.imagenes++; callback(0); },
        enviar_actualizacion_numero_guias(bandera, callback) { llamadas.actualizaciones++; callback(0); }
    };

    vm.createContext(contexto);
    const inicio = principal.indexOf('function ENVIO_DATOS_promesaCallback');
    const fin = principal.indexOf('function compruebaEnviaTrazabilidad');
    assert.ok(inicio >= 0 && fin > inicio, 'No se encontró el bloque del programador de datos.');
    vm.runInContext(`
        var timmerEnvio = null;
        var timeoutSolicitudEnvioDatos = null;
        var cicloEnvioDatosEnCurso = false;
        var envioDatosPendiente = false;
        var programadorEnvioDatosHabilitado = false;
        var listenerOnlineEnvioDatosRegistrado = false;
        var motivoEnvioDatosPendiente = "respaldo";
        var ENVIO_DATOS_INTERVALO_MS = 10000;
        var ENVIO_DATOS_DEBOUNCE_MS = 150;
        var ENVIO_DATOS_TIMEOUT_CICLO_MS = 120000;
        ${principal.slice(inicio, fin)}
    `, contexto, { filename: 'Principal-programador.js' });

    async function ejecutarTimeouts(cota = 1000) {
        for (let vuelta = 0; vuelta < 20; vuelta++) {
            const pendientes = Array.from(timeouts.entries()).filter(([, tarea]) => tarea.demora <= cota);
            if (pendientes.length === 0) break;
            for (const [id, tarea] of pendientes) {
                timeouts.delete(id);
                tarea.callback();
                await estabilizar();
            }
        }
        await estabilizar();
    }

    return {
        contexto,
        almacenamiento,
        llamadas,
        logs,
        intervalos,
        timeouts,
        listeners,
        ejecutarTimeouts,
        conectar(valor) { conectado = valor; }
    };
}

test('inicialización idempotente conserva un único intervalo de diez segundos', () => {
    const escenario = crearEscenario();
    assert.equal(escenario.contexto.inicializarProgramadorEnvioDatos(), true);
    escenario.contexto.inicializarProgramadorEnvioDatos();
    escenario.contexto.inicializarProgramadorEnvioDatos();
    assert.equal(escenario.intervalos.size, 1);
    assert.equal(Array.from(escenario.intervalos.values())[0].demora, 10000);
});

test('solicitud inmediata en primer plano alcanza Recibe_Guia_V2 sin background', async () => {
    const escenario = crearEscenario();
    escenario.contexto.cicloEnvioAutomaticoDatos = function () {
        return escenario.contexto.EnvioAutomatico_segundo_plano(1, 1);
    };
    escenario.contexto.solicitarEnvioAutomaticoDatos('guia_emitida', true);
    await escenario.ejecutarTimeouts();
    assert.equal(escenario.llamadas.guias, 1);
    assert.equal(escenario.llamadas.evidencias, 1);
    assert.ok(escenario.logs.includes('[ENVIO-DATOS][INICIO] motivo=guia_emitida'));
});

test('debounce de solicitudes repetidas ejecuta un solo ciclo', async () => {
    const escenario = crearEscenario();
    let ciclos = 0;
    escenario.contexto.cicloEnvioAutomaticoDatos = async function () { ciclos++; };
    escenario.contexto.solicitarEnvioAutomaticoDatos('respaldo', false);
    escenario.contexto.solicitarEnvioAutomaticoDatos('guia_emitida', false);
    escenario.contexto.solicitarEnvioAutomaticoDatos('resume', false);
    await escenario.ejecutarTimeouts();
    assert.equal(ciclos, 1);
});

test('solicitudes durante un ciclo no se solapan y generan una sola repetición', async () => {
    const escenario = crearEscenario();
    let resolverPrimero;
    let activos = 0;
    let maximo = 0;
    let ciclos = 0;
    escenario.contexto.cicloEnvioAutomaticoDatos = async function () {
        ciclos++;
        activos++;
        maximo = Math.max(maximo, activos);
        if (ciclos === 1) await new Promise(resolve => { resolverPrimero = resolve; });
        activos--;
    };

    escenario.contexto.solicitarEnvioAutomaticoDatos('guia_emitida', true);
    await escenario.ejecutarTimeouts();
    escenario.contexto.solicitarEnvioAutomaticoDatos('resume', true);
    escenario.contexto.solicitarEnvioAutomaticoDatos('conexion_recuperada', true);
    resolverPrimero();
    await estabilizar();
    await escenario.ejecutarTimeouts();

    assert.equal(ciclos, 2);
    assert.equal(maximo, 1);
    assert.equal(escenario.logs.filter(linea => linea === '[ENVIO-DATOS][REPROGRAMADO]').length, 1);
});

test('sin internet no invoca guías y libera el bloqueo local', async () => {
    const escenario = crearEscenario({ conectado: false });
    await escenario.contexto.EnvioAutomatico_segundo_plano(1, 1);
    assert.equal(escenario.llamadas.guias, 0);
    assert.equal(escenario.almacenamiento.bloqueado, 0);
    assert.ok(escenario.logs.includes('[ENVIO-DATOS][SIN_RED]'));
});

test('evento online solicita un reintento inmediato', async () => {
    const escenario = crearEscenario({ conectado: false });
    let ciclos = 0;
    escenario.contexto.cicloEnvioAutomaticoDatos = async function () { ciclos++; };
    escenario.contexto.inicializarProgramadorEnvioDatos();
    escenario.conectar(true);
    escenario.listeners.get('online')();
    await escenario.ejecutarTimeouts();
    assert.equal(ciclos, 1);
    assert.ok(escenario.logs.includes('[ENVIO-DATOS][SOLICITADO] motivo=conexion_recuperada'));
});

test('un error libera el bloqueo y permite el siguiente ciclo', async () => {
    const escenario = crearEscenario();
    let ciclos = 0;
    escenario.contexto.cicloEnvioAutomaticoDatos = async function () {
        ciclos++;
        if (ciclos === 1) throw new Error('fallo simulado');
    };
    escenario.contexto.solicitarEnvioAutomaticoDatos('guia_emitida', true);
    await escenario.ejecutarTimeouts();
    assert.equal(escenario.almacenamiento.bloqueado, 0);
    escenario.contexto.solicitarEnvioAutomaticoDatos('respaldo', true);
    await escenario.ejecutarTimeouts();
    assert.equal(ciclos, 2);
});

test('resume mantiene vivo el programador interactivo sin plugin background genérico', () => {
    const inicio = principal.indexOf('function reanudarProcesosInteractivos()');
    const fin = principal.indexOf('document.addEventListener("resume"', inicio);
    const cuerpo = principal.slice(inicio, fin);
    assert.match(cuerpo, /inicializarProgramadorEnvioDatos\(\)/);
    assert.doesNotMatch(cuerpo, /clearInterval\(timmerEnvio\)/);
    assert.doesNotMatch(cuerpo, /cordova\.plugins/);
});

test('logout detiene sólo el programador interactivo y no el técnico GPS', () => {
    const inicio = principal.indexOf('function logout()');
    const fin = principal.indexOf('async function ok_login', inicio);
    const cuerpo = principal.slice(inicio, fin);
    assert.match(cuerpo, /detenerProgramadorEnvioDatos\("logout"\)/);
    assert.doesNotMatch(cuerpo, /detenerProgramadorEnvioSeguimiento/);
    assert.doesNotMatch(cuerpo, /detenerSeguimientoBootstrap/);
});

test('la última sentencia no continúa la emisión hasta recibir callback de COMMIT', () => {
    const escenario = crearEscenarioCommitCoordenadas();
    let despertares = 0;
    escenario.contexto.DATOS_asigna_coordenadas(
        { GDE_COORDENADA_X: -33.45, GDE_COORDENADA_Y: -70.66, ROWID: 7 },
        function () { despertares++; }
    );

    escenario.sentenciaExitosa();
    assert.equal(despertares, 0);
    escenario.commit();
    assert.equal(despertares, 1);
});

test('rollback posterior a sentencia exitosa no despierta el envío', () => {
    const escenario = crearEscenarioCommitCoordenadas();
    let despertares = 0;
    escenario.contexto.DATOS_asigna_coordenadas(
        { GDE_COORDENADA_X: -33.45, GDE_COORDENADA_Y: -70.66, ROWID: 7 },
        function () { despertares++; }
    );

    escenario.sentenciaExitosa();
    escenario.rollback();
    assert.equal(despertares, 0);
});

test('callbacks internos repetidos producen un solo despertar después del COMMIT', () => {
    const escenario = crearEscenarioCommitCoordenadas();
    let despertares = 0;
    escenario.contexto.DATOS_asigna_coordenadas(
        { GDE_COORDENADA_X: -33.45, GDE_COORDENADA_Y: -70.66, ROWID: 7 },
        function () { despertares++; }
    );

    escenario.sentenciaExitosa();
    escenario.sentenciaExitosa();
    assert.equal(despertares, 0);
    escenario.commit();
    assert.equal(despertares, 1);
});

test('pulpable y aserrable despiertan exactamente una vez después de coordenadas', () => {
    const indiceCoordenadas = impresion.indexOf('DATOS_asigna_coordenadas(gde_actual');
    const indiceFinal = impresion.indexOf('finalizarEmisionGuiaPersistida()', indiceCoordenadas);
    assert.ok(indiceFinal > indiceCoordenadas);
    assert.match(impresion, /solicitarEnvioAutomaticoDatos\("guia_emitida", true\)/);
    assert.equal((impresion.match(/finalizarEmisionGuiaPersistida\(\);/g) || []).length, 2);

    const inicioAnulacion = impresion.indexOf('function anular_guia()');
    const finAnulacion = impresion.indexOf('function despertarEnvioGuiaPersistida()', inicioAnulacion);
    assert.doesNotMatch(impresion.slice(inicioAnulacion, finAnulacion), /despertarEnvioGuiaPersistida/);
});

test('Recibe_Guia_V2 selecciona guías nuevas I y excluye anulaciones N', () => {
    const selector = extraerFuncion(
        gdeDatos,
        'DATOS_seleccionar_gde_proveedor_por_enviar',
        'DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas'
    );
    assert.match(selector, /GDE_ESTADO_MOVIL=\?/);
    assert.match(selector, /Obtener_dato_local\("rut_activo"\), "0", "I"/);
    assert.doesNotMatch(selector, /"N"|IN\s*\(\?,\?\)/);
});

test('una guía ya enviada conserva exclusivamente el endpoint de anulación', () => {
    const inicioAnularWs = webServices.indexOf('function anular_guia_ws');
    const finAnularWs = webServices.indexOf('function comparar_fecha_hora_ws', inicioAnularWs);
    const anulacionWs = webServices.slice(inicioAnularWs, finAnularWs);
    assert.match(anulacionWs, /Webserviceproveedor\.asmx\/anular/);
    assert.doesNotMatch(anulacionWs, /Recibe_Guia_V2/);

    const inicioAnularVista = impresion.indexOf('function anular_guia()');
    const finAnularVista = impresion.indexOf('function despertarEnvioGuiaPersistida()', inicioAnularVista);
    const anulacionVista = impresion.slice(inicioAnularVista, finAnularVista);
    assert.match(anulacionVista, /gde_actual\.ENVIADO == 1/);
    assert.match(anulacionVista, /anular_guia_ws\(/);
    assert.doesNotMatch(anulacionVista, /solicitarEnvioAutomaticoDatos|enviar_guias_proveedor/);
});

test('aceptación confirma persistencia antes de reevaluar GPS y no registra secretos', () => {
    const inicio = webServices.indexOf('function procesarGuiasAceptadasRecibeGuiaV2');
    const fin = webServices.indexOf('function enviar_guias_proveedor', inicio);
    const cuerpo = webServices.slice(inicio, fin);
    assert.ok(cuerpo.indexOf('guardarGuiasAceptadasConSeguimiento') < cuerpo.indexOf('await reevaluarTrackingAhora()'));
    assert.ok(cuerpo.indexOf('await reevaluarTrackingAhora()') < cuerpo.indexOf('solicitarEnvioSeguimiento("guia_aceptada", true)'));
    assert.doesNotMatch(cuerpo, /DATOS_cambiar_estado_envio_gde_individual/);
    assert.doesNotMatch(`${principal}\n${webServices}`, /console\.(?:log|warn|error)\([^\n]*TOKEN_SEGUIMIENTO/i);
    assert.doesNotMatch(`${principal}\n${impresion}\n${webServices}`, /TipoAccionTypes\.(?:ACCION_)?33|accion\s*[:=]\s*33/i);
});
