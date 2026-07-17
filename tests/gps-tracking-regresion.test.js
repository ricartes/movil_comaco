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
        await runtime.contexto.configureBackgroundGeolocation();
        assert.equal(typeof runtime.eventosGps.location, 'function');
        const resultados = await Promise.all(FECHAS.map(function (fecha, indice) {
            return runtime.eventosGps.location(crearUbicacion(indice));
        }));

        assert.ok(resultados.every(function (resultado) {
            return resultado.persistido;
        }));
        assert.equal(runtime.maximoInsercionesActivas(), 1);
        assert.deepEqual(runtime.ordenPersistencia, FECHAS);
        assert.equal(runtime.solicitudesScheduler.length, 3);

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

test('regresión GPS: un error del scheduler no cancela SQLite ni capturas posteriores', async () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-gps-scheduler-');
    const runtime = crearGpsTrackingRuntime({
        rutaDb: temporal.rutaDb,
        guiasPendientes: [crearGuiaGps('GUIA-SCHEDULER-FALLA', ID_SEGUIMIENTO)],
        fallarSchedulerSiguiente: true
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

        assert.equal(primero.persistido, true);
        assert.equal(segundo.persistido, true);
        assert.deepEqual(runtime.solicitudesScheduler, [
            { motivo: 'nueva_captura', inmediato: false }
        ]);
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

        assert.equal(primero.persistido, false);
        assert.equal(reenvio.persistido, true);
        assert.equal(runtime.llamadasInsercion(), 2);
        assert.equal(runtime.solicitudesScheduler.length, 1);

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

test('configuración GPS es esperable e idempotente y registra listeners una vez', async () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-gps-config-');
    const runtime = crearGpsTrackingRuntime({ rutaDb: temporal.rutaDb });

    try {
        const primera = runtime.contexto.configureBackgroundGeolocation();
        const segunda = runtime.contexto.configureBackgroundGeolocation();
        assert.equal(typeof primera.then, 'function');
        assert.equal(primera, segunda);
        await Promise.all([primera, segunda]);
        assert.equal(runtime.llamadasConfigure(), 1);
        assert.equal(runtime.llamadasOn(), 3);
    } finally {
        runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});

test('reconciliación sin sesión conserva GPS por guía, posiciones o cierre técnico', async () => {
    const casos = [
        {
            nombre: 'guia',
            contexto: {
                usuarioActivo: null,
                guiasActivas: [crearGuiaGps('GUIA-SIN-SESION', ID_SEGUIMIENTO)],
                hayPosicionesPendientes: false,
                hayCierreTecnicoPendiente: false,
                validacion: { ok: true }
            }
        },
        {
            nombre: 'posiciones',
            contexto: {
                usuarioActivo: null,
                guiasActivas: [],
                hayPosicionesPendientes: true,
                hayCierreTecnicoPendiente: false,
                validacion: { ok: true }
            }
        },
        {
            nombre: 'cierre',
            contexto: {
                usuarioActivo: null,
                guiasActivas: [],
                hayPosicionesPendientes: false,
                hayCierreTecnicoPendiente: true,
                validacion: { ok: true }
            }
        }
    ];

    for (const caso of casos) {
        const temporal = crearSqliteTemporal('gfe-seguimiento-gps-' + caso.nombre + '-');
        const runtime = crearGpsTrackingRuntime({ rutaDb: temporal.rutaDb });
        try {
            const resultado = await runtime.contexto.reconciliarEstadoGpsNativo(caso.contexto);
            assert.equal(resultado.debeEstarActivo, true, caso.nombre);
            assert.equal(runtime.llamadasStart(), 1, caso.nombre);
        } finally {
            runtime.cerrar();
            limpiarSqliteTemporal(temporal);
        }
    }
});

test('reconciliación detiene GPS solo sin guías, posiciones ni cierre pendiente', async () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-gps-sin-trabajo-');
    const runtime = crearGpsTrackingRuntime({
        rutaDb: temporal.rutaDb,
        servicioNativoActivo: true,
        usuarioActivo: null,
        rutActivo: null
    });

    try {
        const resultado = await runtime.contexto.reconciliarEstadoGpsNativo({
            usuarioActivo: null,
            guiasActivas: [],
            hayPosicionesPendientes: false,
            hayCierreTecnicoPendiente: false,
            validacion: { ok: true }
        });
        assert.equal(resultado.debeEstarActivo, false);
        assert.equal(runtime.llamadasStop(), 1);
    } finally {
        runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});

test('permisos inválidos no detienen un GPS con trabajo técnico pendiente', async () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-gps-permisos-');
    const runtime = crearGpsTrackingRuntime({
        rutaDb: temporal.rutaDb,
        servicioNativoActivo: true,
        usuarioActivo: null,
        rutActivo: null
    });

    try {
        const resultado = await runtime.contexto.reconciliarEstadoGpsNativo({
            usuarioActivo: null,
            guiasActivas: [crearGuiaGps('GUIA-PERMISOS', ID_SEGUIMIENTO)],
            hayPosicionesPendientes: false,
            hayCierreTecnicoPendiente: false,
            validacion: { ok: false }
        });
        assert.equal(resultado.debeEstarActivo, true);
        assert.equal(resultado.permisosValidos, false);
        assert.equal(runtime.llamadasStart(), 0);
        assert.equal(runtime.llamadasStop(), 0);
        assert.equal(runtime.servicioNativoActivo(), true);
    } finally {
        runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});
