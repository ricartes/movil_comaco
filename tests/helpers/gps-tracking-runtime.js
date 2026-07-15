const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { crearRuntime } = require('./seguimiento-runtime');

const RAIZ = path.resolve(__dirname, '../..');

function copiar(valor) {
    return JSON.parse(JSON.stringify(valor));
}

function crearGuiaGps(idGuia, idSeguimiento, cambios = {}) {
    return {
        ID_UNICO_MOVIL: idGuia,
        ID_UNICO_SEGUIMIENTO: idSeguimiento,
        GDE_ESTADO_MOVIL: 'I',
        GDE_CONFIRMA_INGRESO_PLANTA: 0,
        FECHA_ANULACION: null,
        GDE_MOTIVO_ANULACION: null,
        GDE_ANULADA: 0,
        GDE_COD_ORIGEN: 'ORIGEN-PRUEBA',
        ...cambios
    };
}

function crearGpsTrackingRuntime(opciones) {
    const runtime = crearRuntime({ rutaDb: opciones.rutaDb });
    const contexto = runtime.contexto;
    const eventosGps = {};
    const ordenPersistencia = [];
    const ordenLegacy = [];
    const guiasPendientes = opciones.guiasPendientes || [];
    const guiaActual = opciones.guiaActual || null;
    let accionesLegacy = 0;
    let intentosLegacy = 0;
    let fallarLegacySiguiente = opciones.fallarLegacySiguiente === true;
    let fallarSqliteSiguiente = opciones.fallarSqliteSiguiente === true;
    let insercionesActivas = 0;
    let maximoInsercionesActivas = 0;
    let llamadasInsercion = 0;
    let servicioNativoActivo = opciones.servicioNativoActivo === true;
    let llamadasStart = 0;
    let llamadasStop = 0;
    let llamadasCheckStatus = 0;

    const obtenerDatoOriginal = contexto.Obtener_dato_local;
    contexto.Obtener_dato_local = function (clave) {
        if (clave === 'user_activo') return opciones.usuarioActivo || 'USUARIO-PRUEBA';
        if (clave === 'rut_activo') return opciones.rutActivo || '11-1';
        if (clave === 'id_proceso_activo') return guiaActual ? 'PROCESO-PRUEBA' : '';
        return obtenerDatoOriginal(clave);
    };

    contexto.HABILITAR_CAPTURA_SEGUIMIENTO_NUEVO = opciones.capturaNuevaHabilitada !== false;
    contexto.HABILITAR_UBICACION_TRAZABILIDAD_LEGACY = opciones.legacyHabilitado !== false;
    contexto.TipoAccionTypes = { CAPTURA_UBICACION: 33 };
    contexto.document = { addEventListener() {} };
    contexto.navigator = {};
    contexto.cordova = { plugins: {} };
    contexto.setTimeout = setTimeout;
    contexto.clearTimeout = clearTimeout;
    if (Array.isArray(opciones.fechasRecepcion) && opciones.fechasRecepcion.length > 0) {
        const fechasRecepcion = opciones.fechasRecepcion.slice();
        const DateReal = Date;
        contexto.Date = class DateGpsControlada extends DateReal {
            constructor(...argumentos) {
                if (argumentos.length === 0 && fechasRecepcion.length > 0) {
                    super(fechasRecepcion.shift());
                } else {
                    super(...argumentos);
                }
            }
        };
    }
    contexto.BackgroundGeolocation = {
        RAW_PROVIDER: 2,
        HIGH_ACCURACY: 0,
        configure() { return Promise.resolve(); },
        on(nombre, callback) { eventosGps[nombre] = callback; },
        getConfig(exito) {
            exito({
                locationProvider: 2,
                desiredAccuracy: 0,
                distanceFilter: 5,
                interval: 5000,
                fastestInterval: 5000,
                startForeground: true,
                stopOnTerminate: false,
                startOnBoot: true,
                notificationsEnabled: true
            });
        },
        checkStatus(exito) {
            llamadasCheckStatus++;
            exito({
                isRunning: servicioNativoActivo,
                authorization: 1,
                locationServicesEnabled: true
            });
        },
        start() {
            llamadasStart++;
            servicioNativoActivo = true;
            return Promise.resolve();
        },
        stop() {
            llamadasStop++;
            servicioNativoActivo = false;
            return Promise.resolve();
        }
    };

    contexto.listarGdeProveedorNoConfirmadas = async function () {
        return guiasPendientes;
    };
    contexto.seleccionarGdeProveedor = async function () {
        return guiaActual;
    };
    contexto.DATOS_seleccionarGdeProveedorConfirmadas = async function () {
        return guiasPendientes;
    };
    contexto.generarDataTrazabilidad = async function (accion) {
        assert.equal(accion, 33);
        return { accion };
    };
    contexto.obtenerUbicacionEInsertarLog = async function (usuario, datos, captura) {
        intentosLegacy++;
        if (fallarLegacySiguiente) {
            fallarLegacySiguiente = false;
            throw new Error('fallo acción 33 simulado');
        }
        accionesLegacy++;
        ordenLegacy.push(captura.time);
    };
    contexto.activarBackgroundModeSeguro = function () {};
    contexto.desactivarBackgroundModeSeguro = function () {};

    const insertarOriginal = contexto.insertarPosicionesSeguimientoPendientes;
    contexto.insertarPosicionesSeguimientoPendientes = async function (posiciones) {
        llamadasInsercion++;
        insercionesActivas++;
        maximoInsercionesActivas = Math.max(maximoInsercionesActivas, insercionesActivas);
        try {
            if (fallarSqliteSiguiente) {
                fallarSqliteSiguiente = false;
                throw new Error('fallo SQLite simulado');
            }
            if (opciones.demoraInsercionMs) {
                await new Promise(function (resolve) {
                    setTimeout(resolve, opciones.demoraInsercionMs);
                });
            }
            const resultado = await insertarOriginal(posiciones);
            ordenPersistencia.push(...posiciones.map(function (posicion) {
                return posicion.FECHA_DISPOSITIVO_UTC;
            }));
            return resultado;
        } finally {
            insercionesActivas--;
        }
    };

    vm.runInContext(
        fs.readFileSync(path.join(RAIZ, 'www/js/Helper/gpsTracking.js'), 'utf8'),
        contexto,
        { filename: 'gpsTracking.js' }
    );

    return {
        contexto,
        eventosGps,
        ordenPersistencia,
        ordenLegacy,
        async inicializar() {
            runtime.db.exec('CREATE TABLE IF NOT EXISTS GDE (ID_UNICO_MOVIL TEXT)');
            await contexto.DATOS_inicializarSeguimientoSqlite();
        },
        async posiciones(idSeguimiento) {
            return Array.from(
                await contexto.listarPosicionesSeguimientoPendientes(idSeguimiento, 200),
                copiar
            );
        },
        accionesLegacy() { return accionesLegacy; },
        intentosLegacy() { return intentosLegacy; },
        llamadasInsercion() { return llamadasInsercion; },
        maximoInsercionesActivas() { return maximoInsercionesActivas; },
        llamadasStart() { return llamadasStart; },
        llamadasStop() { return llamadasStop; },
        llamadasCheckStatus() { return llamadasCheckStatus; },
        servicioNativoActivo() { return servicioNativoActivo; },
        fallarProximaAccionLegacy() { fallarLegacySiguiente = true; },
        fallarProximaInsercionSqlite() { fallarSqliteSiguiente = true; },
        cerrar() { runtime.cerrar(); }
    };
}

module.exports = {
    crearGpsTrackingRuntime,
    crearGuiaGps
};
