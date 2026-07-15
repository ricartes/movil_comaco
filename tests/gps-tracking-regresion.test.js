const assert = require('node:assert/strict');
const test = require('node:test');
const {
    crearSqliteTemporal,
    ejecutarProceso,
    limpiarSqliteTemporal
} = require('./helpers/seguimiento-procesos');
const {
    crearGpsTrackingRuntime,
    crearGuiaGps
} = require('./helpers/gps-tracking-runtime');

const ID_SEGUIMIENTO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FECHAS = [
    '2026-07-14T15:00:00.000Z',
    '2026-07-14T15:00:06.000Z',
    '2026-07-14T15:00:12.000Z'
];

function crearUbicacion(indice, cambios = {}) {
    return {
        time: FECHAS[indice],
        latitude: -33.4500 + (indice * 0.0001),
        longitude: -70.6600 + (indice * 0.0001),
        accuracy: 4.5 + indice,
        speed: 8.25 + indice,
        bearing: 120 + indice,
        altitude: 540 + indice,
        isFromMockProvider: false,
        ...cambios
    };
}

function contextoActivo(guia) {
    return {
        usuarioActivo: '11-1',
        procesoActual: '',
        guiasActivas: [guia],
        validacion: { ok: true }
    };
}

test('regresión GPS: tres callbacks simultáneos conservan orden, UUID y SQLite entre procesos', async () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-gps-regresion-');
    const guia = crearGuiaGps('GUIA-GPS-REGRESION', ID_SEGUIMIENTO);
    const runtime = crearGpsTrackingRuntime({
        rutaDb: temporal.rutaDb,
        guiasPendientes: [guia],
        demoraInsercionMs: 10,
        fechasRecepcion: FECHAS
    });
    let cerrado = false;

    try {
        await runtime.inicializar();
        runtime.contexto.configureBackgroundGeolocation();
        assert.equal(typeof runtime.eventosGps.location, 'function');
        const resultados = await Promise.all(FECHAS.map(function (fecha, indice) {
            return runtime.eventosGps.location(crearUbicacion(indice));
        }));

        assert.ok(resultados.every(function (resultado) {
            return resultado.nuevoPersistido && resultado.legacyPersistido;
        }));
        assert.equal(runtime.maximoInsercionesActivas(), 1);
        assert.deepEqual(runtime.ordenPersistencia, FECHAS);
        assert.deepEqual(runtime.ordenLegacy, FECHAS);
        assert.equal(runtime.accionesLegacy(), 3);

        const posiciones = await runtime.posiciones(ID_SEGUIMIENTO);
        assert.equal(posiciones.length, 3);
        assert.deepEqual(posiciones.map(function (posicion) {
            return posicion.FECHA_DISPOSITIVO_UTC;
        }), FECHAS);
        assert.equal(new Set(posiciones.map(function (posicion) {
            return posicion.UUID_POSICION;
        })).size, 3);

        runtime.cerrar();
        cerrado = true;

        const reabierta = ejecutarProceso({
            accion: 'SIN_CONEXION',
            conectado: false,
            rutaDb: temporal.rutaDb,
            idSeguimiento: ID_SEGUIMIENTO,
            uuidDispositivo: 'DISPOSITIVO-REGRESION'
        });
        assert.equal(reabierta.solicitudes.length, 0);
        assert.equal(reabierta.despues.length, 3);
        assert.deepEqual(reabierta.despues.map(function (posicion) {
            return posicion.FECHA_DISPOSITIVO_UTC;
        }), FECHAS);
    } finally {
        if (!cerrado) runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});

test('regresión GPS: fallo de acción 33 no cancela SQLite ni el callback posterior', async () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-gps-legacy-');
    const runtime = crearGpsTrackingRuntime({
        rutaDb: temporal.rutaDb,
        guiasPendientes: [crearGuiaGps('GUIA-LEGACY-FALLA', ID_SEGUIMIENTO)],
        fallarLegacySiguiente: true
    });

    try {
        await runtime.inicializar();
        const primero = await runtime.contexto.encolarCapturaGps(
            crearUbicacion(0),
            new Date(FECHAS[0])
        );
        const segundo = await runtime.contexto.encolarCapturaGps(
            crearUbicacion(1),
            new Date(FECHAS[1])
        );

        assert.equal(primero.nuevoPersistido, true);
        assert.equal(primero.legacyPersistido, false);
        assert.equal(segundo.nuevoPersistido, true);
        assert.equal(segundo.legacyPersistido, true);
        assert.equal(runtime.intentosLegacy(), 2);
        assert.equal(runtime.accionesLegacy(), 1);
        assert.equal((await runtime.posiciones(ID_SEGUIMIENTO)).length, 2);
    } finally {
        runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});

test('regresión GPS: rollback SQLite no avanza filtro y permite reenviar la misma captura', async () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-gps-sqlite-');
    const runtime = crearGpsTrackingRuntime({
        rutaDb: temporal.rutaDb,
        guiasPendientes: [crearGuiaGps('GUIA-SQLITE-FALLA', ID_SEGUIMIENTO)],
        fallarSqliteSiguiente: true
    });
    const captura = crearUbicacion(0);

    try {
        await runtime.inicializar();
        const primero = await runtime.contexto.encolarCapturaGps(captura, new Date(FECHAS[0]));
        const reenvio = await runtime.contexto.encolarCapturaGps(captura, new Date(FECHAS[0]));

        assert.equal(primero.nuevoPersistido, false);
        assert.equal(primero.legacyPersistido, true);
        assert.equal(reenvio.nuevoPersistido, true);
        assert.equal(runtime.llamadasInsercion(), 2);
        assert.equal(runtime.accionesLegacy(), 1);

        const posiciones = await runtime.posiciones(ID_SEGUIMIENTO);
        assert.equal(posiciones.length, 1);
        assert.equal(posiciones[0].FECHA_DISPOSITIVO_UTC, FECHAS[0]);
    } finally {
        runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});

test('regresión GPS: normalización rechaza datos inválidos y usa exclusivamente time', () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-gps-normaliza-');
    const runtime = crearGpsTrackingRuntime({ rutaDb: temporal.rutaDb });

    try {
        assert.throws(function () {
            runtime.contexto.normalizarCapturaGps(
                crearUbicacion(0, { latitude: 91 }),
                new Date(FECHAS[0])
            );
        }, /LATITUD_INVALIDA/);
        assert.throws(function () {
            runtime.contexto.normalizarCapturaGps(
                crearUbicacion(0, { time: 'fecha-invalida' }),
                new Date(FECHAS[0])
            );
        }, /FECHA_CAPTURA_SIN_ZONA|FECHA_CAPTURA_INVALIDA/);
        assert.throws(function () {
            runtime.contexto.normalizarCapturaGps(
                crearUbicacion(0, { accuracy: -1 }),
                new Date(FECHAS[0])
            );
        }, /PRECISION_INVALIDA/);

        const normalizada = runtime.contexto.normalizarCapturaGps(
            crearUbicacion(0, {
                time: '2026-07-14T12:00:00-03:00',
                timestamp: '2030-01-01T00:00:00.000Z',
                speed: -1,
                bearing: 360
            }),
            new Date(FECHAS[0])
        );
        assert.equal(normalizada.time, FECHAS[0]);
        assert.equal(Object.hasOwn(normalizada, 'timestamp'), false);
        assert.equal(normalizada.speed, null);
        assert.equal(normalizada.bearing, null);
    } finally {
        runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});

test('regresión GPS: checkStatus reconcilia estado nativo sin start ni stop duplicados', async () => {
    const temporalActivo = crearSqliteTemporal('gfe-seguimiento-gps-stop-');
    const activo = crearGpsTrackingRuntime({
        rutaDb: temporalActivo.rutaDb,
        servicioNativoActivo: true
    });

    try {
        await activo.contexto.stopTracking();
        assert.ok(activo.llamadasCheckStatus() >= 1);
        assert.equal(activo.llamadasStop(), 1);
        assert.equal(activo.servicioNativoActivo(), false);
    } finally {
        activo.cerrar();
        limpiarSqliteTemporal(temporalActivo);
    }

    const temporalInicio = crearSqliteTemporal('gfe-seguimiento-gps-start-');
    const guia = crearGuiaGps('GUIA-START', ID_SEGUIMIENTO);
    const detenido = crearGpsTrackingRuntime({ rutaDb: temporalInicio.rutaDb });
    try {
        await detenido.contexto.reconciliarEstadoGpsNativo(contextoActivo(guia));
        await detenido.contexto.reconciliarEstadoGpsNativo(contextoActivo(guia));
        assert.equal(detenido.llamadasStart(), 1);
        assert.equal(detenido.llamadasStop(), 0);
    } finally {
        detenido.cerrar();
        limpiarSqliteTemporal(temporalInicio);
    }

    const temporalDiferido = crearSqliteTemporal('gfe-seguimiento-gps-timeout-');
    const diferido = crearGpsTrackingRuntime({ rutaDb: temporalDiferido.rutaDb });
    try {
        diferido.contexto.programarInicioGpsDiferido();
        await diferido.contexto.reconciliarEstadoGpsNativo({
            usuarioActivo: '11-1',
            procesoActual: '',
            guiasActivas: [],
            validacion: { ok: true }
        });
        await new Promise(function (resolve) { setTimeout(resolve, 550); });
        assert.equal(diferido.llamadasStart(), 0);
    } finally {
        diferido.cerrar();
        limpiarSqliteTemporal(temporalDiferido);
    }
});
