const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const UUID_SEGUIMIENTO_1 = '11111111-1111-4111-8111-111111111111';
const UUID_SEGUIMIENTO_2 = '22222222-2222-4222-8222-222222222222';

function crearGuia(id, idSeguimiento = UUID_SEGUIMIENTO_1, cambios = {}) {
    return {
        ID_UNICO_MOVIL: id,
        ID_UNICO_SEGUIMIENTO: idSeguimiento,
        GDE_ESTADO_MOVIL: 'I',
        GDE_CONFIRMA_INGRESO_PLANTA: 0,
        FECHA_ANULACION: null,
        GDE_MOTIVO_ANULACION: null,
        GDE_ANULADA: 0,
        GDE_COD_ORIGEN: 'ORIGEN-1',
        ...cambios
    };
}

function crearLocation(cambios = {}) {
    return {
        time: Date.parse('2026-07-14T12:34:56.789Z'),
        latitude: -33.45,
        longitude: -70.66,
        accuracy: 5.5,
        speed: 8.2,
        bearing: 123.4,
        altitude: 540.5,
        isFromMockProvider: false,
        ...cambios
    };
}

function crearEscenario(opciones = {}) {
    const insertadas = [];
    const advertencias = [];
    const logs = [];
    let accionesLegacy = 0;
    let llamadasInsercion = 0;
    let errorSqlite = opciones.errorSqlite === true;
    let servicioNativoActivo = opciones.servicioNativoActivo === true;
    let llamadasStart = 0;
    let llamadasStop = 0;
    let llamadasCheckStatus = 0;
    const eventosGps = {};
    const guiaActual = opciones.guiaActual || null;
    const guiasPendientes = opciones.guiasPendientes || [];

    const BackgroundGeolocation = {
        RAW_PROVIDER: 2,
        HIGH_ACCURACY: 0,
        configure() { return Promise.resolve(); },
        on(evento, callback) { eventosGps[evento] = callback; },
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

    const contexto = {
        Array,
        Date,
        Error,
        HABILITAR_CAPTURA_SEGUIMIENTO_NUEVO: opciones.habilitado !== false,
        HABILITAR_UBICACION_TRAZABILIDAD_LEGACY: opciones.legacyHabilitado !== false,
        JSON,
        Math,
        Number,
        Object,
        Promise,
        String,
        Uint8Array,
        TipoAccionTypes: { CAPTURA_UBICACION: 33 },
        BackgroundGeolocation,
        console: {
            log(...argumentos) { logs.push(argumentos); },
            error() {},
            warn(...argumentos) { advertencias.push(argumentos); }
        },
        document: { addEventListener() {} },
        window: { crypto: crypto.webcrypto },
        Obtener_dato_local(clave) {
            if (clave === 'user_activo') return 'usuario';
            if (clave === 'id_proceso_activo') return guiaActual ? '10' : '';
            return null;
        },
        async listarGdeProveedorNoConfirmadas() {
            return guiasPendientes;
        },
        async seleccionarGdeProveedor() {
            return guiaActual;
        },
        async generarDataTrazabilidad(accion) {
            assert.equal(accion, 33);
            return { accion };
        },
        async obtenerUbicacionEInsertarLog() {
            if (opciones.errorLegacy) {
                throw new Error('fallo legacy simulado');
            }
            accionesLegacy++;
        },
        async DATOS_seleccionarGdeProveedorConfirmadas() {
            return guiasPendientes;
        },
        async validarRequisitosTrackingCordova() {
            return { ok: opciones.permisosValidos !== false };
        },
        activarBackgroundModeSeguro() {},
        desactivarBackgroundModeSeguro() {},
        navigator: {},
        cordova: { plugins: {} },
        setTimeout,
        clearTimeout
    };

    vm.createContext(contexto);
    vm.runInContext(
        fs.readFileSync(path.join(raiz, 'www/js/Datos/Seguimiento.js'), 'utf8'),
        contexto,
        { filename: 'Seguimiento.js' }
    );

    contexto.insertarPosicionesSeguimientoPendientes = async function (posiciones) {
        llamadasInsercion++;
        if (errorSqlite) {
            throw new Error('fallo SQLite simulado');
        }

        if (typeof opciones.antesInsertar === 'function') {
            await opciones.antesInsertar(posiciones, llamadasInsercion);
        }

        return posiciones.map(posicion => {
            const normalizada = contexto.SEGUIMIENTO_normalizarPosicion(posicion);
            insertadas.push(normalizada);
            return {
                ID: insertadas.length,
                UUID_POSICION: normalizada.UUID_POSICION
            };
        });
    };

    vm.runInContext(
        fs.readFileSync(path.join(raiz, 'www/js/Helper/gpsTracking.js'), 'utf8'),
        contexto,
        { filename: 'gpsTracking.js' }
    );

    return {
        contexto,
        eventosGps,
        insertadas,
        advertencias,
        logs,
        accionesLegacy() { return accionesLegacy; },
        llamadasInsercion() { return llamadasInsercion; },
        llamadasStart() { return llamadasStart; },
        llamadasStop() { return llamadasStop; },
        llamadasCheckStatus() { return llamadasCheckStatus; },
        servicioNativoActivo() { return servicioNativoActivo; },
        setErrorSqlite(valor) { errorSqlite = valor; }
    };
}

test('una guía activa crea posición shadow y conserva acción 33', async () => {
    const escenario = crearEscenario({ guiaActual: crearGuia('GUIA-1') });

    await escenario.contexto.saveLocation(crearLocation());

    assert.equal(escenario.accionesLegacy(), 1);
    assert.equal(escenario.insertadas.length, 1);
    assert.equal(escenario.insertadas[0].ID_UNICO_MOVIL_GDE, 'GUIA-1');
    assert.equal(escenario.insertadas[0].ID_UNICO_SEGUIMIENTO, UUID_SEGUIMIENTO_1);
});

test('dos guías activas crean filas con UUID_POSICION diferentes', async () => {
    const escenario = crearEscenario({
        guiasPendientes: [
            crearGuia('GUIA-1', UUID_SEGUIMIENTO_1),
            crearGuia('GUIA-2', UUID_SEGUIMIENTO_2, { GDE_ESTADO_MOVIL: 'E' })
        ]
    });

    await escenario.contexto.saveLocation(crearLocation());

    assert.equal(escenario.accionesLegacy(), 2);
    assert.equal(escenario.insertadas.length, 2);
    assert.notEqual(escenario.insertadas[0].UUID_POSICION, escenario.insertadas[1].UUID_POSICION);
    assert.equal(escenario.llamadasInsercion(), 1);
});

test('una guía repetida entre fuentes genera una sola fila', async () => {
    const guia = crearGuia('GUIA-DUPLICADA');
    const escenario = crearEscenario({
        guiaActual: guia,
        guiasPendientes: [{ ...guia }]
    });

    await escenario.contexto.saveLocation(crearLocation());

    assert.equal(escenario.accionesLegacy(), 1);
    assert.equal(escenario.insertadas.length, 1);
});

test('guía sin seguimiento conserva acción 33, no crea fila y advierte', async () => {
    const escenario = crearEscenario({ guiaActual: crearGuia('GUIA-SIN-SEG', null) });

    await escenario.contexto.saveLocation(crearLocation());

    assert.equal(escenario.accionesLegacy(), 1);
    assert.equal(escenario.insertadas.length, 0);
    assert.ok(escenario.advertencias.length >= 1);
});

test('guías confirmadas, anuladas o con otro estado no crean posiciones nuevas', async () => {
    const casos = [
        crearGuia('CONFIRMADA', UUID_SEGUIMIENTO_1, { GDE_CONFIRMA_INGRESO_PLANTA: 1 }),
        crearGuia('ANULADA', UUID_SEGUIMIENTO_1, { FECHA_ANULACION: '2026-07-14T12:00:00Z' }),
        crearGuia('BORRADOR', UUID_SEGUIMIENTO_1, { GDE_ESTADO_MOVIL: 'B' })
    ];

    for (const guia of casos) {
        const escenario = crearEscenario();
        await escenario.contexto.registrarCapturaSeguimientoNueva(crearLocation(), [guia]);
        assert.equal(escenario.insertadas.length, 0);
        assert.equal(escenario.llamadasInsercion(), 0);
    }
});

test('latitud o longitud inválida no crea ninguna fila', async () => {
    for (const location of [
        crearLocation({ latitude: 91 }),
        crearLocation({ longitude: -181 }),
        crearLocation({ latitude: NaN })
    ]) {
        const escenario = crearEscenario();
        await escenario.contexto.registrarCapturaSeguimientoNueva(location, [crearGuia('GUIA-1')]);
        assert.equal(escenario.insertadas.length, 0);
    }
});

test('mapea campos reales del plugin y normaliza velocidad y rumbo inválidos a NULL', async () => {
    const escenario = crearEscenario();
    const location = crearLocation({
        speed: -1,
        bearing: -1,
        accuracy: 5.5,
        altitude: 620.25,
        isFromMockProvider: true
    });

    await escenario.contexto.registrarCapturaSeguimientoNueva(location, [crearGuia('GUIA-1')]);

    const posicion = escenario.insertadas[0];
    assert.equal(posicion.VELOCIDAD_MPS, null);
    assert.equal(posicion.RUMBO_GRADOS, null);
    assert.equal(posicion.PRECISION_METROS, 5.5);
    assert.equal(posicion.ALTITUD_METROS, 620.25);
    assert.equal(posicion.ES_UBICACION_SIMULADA, 1);
    assert.equal(posicion.SECUENCIA_LOCAL, null);
    assert.equal(posicion.ORIGEN_CAPTURA, 'GPS');
});

test('time válido del plugin se convierte a ISO-8601 terminado en Z', async () => {
    const escenario = crearEscenario();
    await escenario.contexto.registrarCapturaSeguimientoNueva(
        crearLocation({ time: '2026-07-14T08:30:00-04:00' }),
        [crearGuia('GUIA-1')]
    );

    assert.equal(escenario.insertadas[0].FECHA_DISPOSITIVO_UTC, '2026-07-14T12:30:00.000Z');
});

test('fallo del flujo SQLite nuevo no interrumpe el almacenamiento legacy', async () => {
    const escenario = crearEscenario({
        guiaActual: crearGuia('GUIA-1'),
        errorSqlite: true
    });

    await assert.doesNotReject(escenario.contexto.saveLocation(crearLocation()));
    assert.equal(escenario.accionesLegacy(), 1);
    assert.equal(escenario.insertadas.length, 0);
});

test('feature flag de captura desactivado conserva legacy y no toca la tabla nueva', async () => {
    const escenario = crearEscenario({
        guiaActual: crearGuia('GUIA-1'),
        habilitado: false
    });

    await escenario.contexto.saveLocation(crearLocation());

    assert.equal(escenario.accionesLegacy(), 1);
    assert.equal(escenario.llamadasInsercion(), 0);
    assert.equal(escenario.insertadas.length, 0);
});

test('fallo de acción 33 no impide guardar el seguimiento nuevo', async () => {
    const escenario = crearEscenario({
        guiaActual: crearGuia('GUIA-LEGACY-FALLA'),
        errorLegacy: true
    });

    const resultado = await escenario.contexto.saveLocation(crearLocation());

    assert.equal(resultado.nuevoPersistido, true);
    assert.equal(resultado.legacyPersistido, false);
    assert.equal(escenario.insertadas.length, 1);
    assert.equal(escenario.accionesLegacy(), 0);
});

test('normalización rechaza coordenadas antes de calcular distancias', async () => {
    const escenario = crearEscenario({ guiaActual: crearGuia('GUIA-INVALIDA') });
    let calculosDistancia = 0;
    escenario.contexto.calcularDistanciaMetros = function () {
        calculosDistancia++;
        return 0;
    };

    const resultado = await escenario.contexto.procesarCapturaGps(
        crearLocation({ latitude: NaN }),
        new Date('2026-07-14T12:35:00Z')
    );

    assert.equal(resultado.capturaValida, false);
    assert.equal(calculosDistancia, 0);
    assert.equal(escenario.llamadasInsercion(), 0);
    assert.equal(escenario.accionesLegacy(), 0);
});

test('fecha inválida se rechaza y timestamp no sustituye a time', async () => {
    const escenario = crearEscenario({ guiaActual: crearGuia('GUIA-FECHA') });

    const resultado = await escenario.contexto.procesarCapturaGps(
        crearLocation({ time: 'fecha-invalida', timestamp: Date.now() }),
        new Date('2026-07-14T12:35:00Z')
    );

    assert.equal(resultado.capturaValida, false);
    assert.equal(escenario.llamadasInsercion(), 0);
    assert.equal(escenario.accionesLegacy(), 0);
});

test('fecha local sin offset verificable se rechaza', async () => {
    const escenario = crearEscenario({ guiaActual: crearGuia('GUIA-FECHA-LOCAL') });
    const resultado = await escenario.contexto.procesarCapturaGps(
        crearLocation({ time: '2026-07-14T12:35:00' }),
        new Date('2026-07-14T12:35:01Z')
    );

    assert.equal(resultado.capturaValida, false);
    assert.equal(escenario.llamadasInsercion(), 0);
});

test('normalización utiliza time y produce UTC Z sin consultar timestamp', () => {
    const escenario = crearEscenario();
    const captura = escenario.contexto.normalizarCapturaGps(
        crearLocation({
            time: '2026-07-14T08:30:00-04:00',
            timestamp: '2030-01-01T00:00:00Z'
        }),
        new Date('2026-07-14T12:30:01Z')
    );

    assert.equal(captura.time, '2026-07-14T12:30:00.000Z');
    assert.equal(Object.hasOwn(captura, 'timestamp'), false);
});

test('accuracy inválida rechaza la captura completa', async () => {
    const escenario = crearEscenario({ guiaActual: crearGuia('GUIA-ACCURACY') });
    const resultado = await escenario.contexto.procesarCapturaGps(
        crearLocation({ accuracy: -1 }),
        new Date('2026-07-14T12:35:00Z')
    );

    assert.equal(resultado.capturaValida, false);
    assert.equal(escenario.llamadasInsercion(), 0);
    assert.equal(escenario.accionesLegacy(), 0);
});

test('dos callbacks simultáneos se persisten secuencialmente y en orden', async () => {
    let liberarPrimera;
    const bloqueoPrimera = new Promise(resolve => { liberarPrimera = resolve; });
    let insercionesActivas = 0;
    let maximoSimultaneo = 0;
    const orden = [];
    const escenario = crearEscenario({
        guiasPendientes: [crearGuia('GUIA-COLA')],
        legacyHabilitado: false,
        async antesInsertar(posiciones, numeroLlamada) {
            insercionesActivas++;
            maximoSimultaneo = Math.max(maximoSimultaneo, insercionesActivas);
            orden.push(posiciones[0].FECHA_DISPOSITIVO_UTC);
            if (numeroLlamada === 1) {
                await bloqueoPrimera;
            }
            insercionesActivas--;
        }
    });

    const primera = escenario.contexto.encolarCapturaGps(
        crearLocation({ time: '2026-07-14T12:34:56Z' }),
        new Date('2026-07-14T12:34:56Z')
    );
    const segunda = escenario.contexto.encolarCapturaGps(
        crearLocation({ time: '2026-07-14T12:35:02Z', latitude: -33.4499 }),
        new Date('2026-07-14T12:35:02Z')
    );

    await new Promise(resolve => setImmediate(resolve));
    assert.equal(escenario.llamadasInsercion(), 1);
    liberarPrimera();
    await Promise.all([primera, segunda]);

    assert.equal(maximoSimultaneo, 1);
    assert.equal(escenario.llamadasInsercion(), 2);
    assert.deepEqual(orden, [
        '2026-07-14T12:34:56.000Z',
        '2026-07-14T12:35:02.000Z'
    ]);
});

test('un error libera la cola y permite persistir callbacks posteriores', async () => {
    const escenario = crearEscenario({
        guiasPendientes: [crearGuia('GUIA-COLA-ERROR')],
        legacyHabilitado: false,
        errorSqlite: true
    });

    const primera = await escenario.contexto.encolarCapturaGps(
        crearLocation({ time: '2026-07-14T12:34:56Z' }),
        new Date('2026-07-14T12:34:56Z')
    );
    escenario.setErrorSqlite(false);
    const segunda = await escenario.contexto.encolarCapturaGps(
        crearLocation({ time: '2026-07-14T12:35:02Z', latitude: -33.4499 }),
        new Date('2026-07-14T12:35:02Z')
    );

    assert.equal(primera.nuevoPersistido, false);
    assert.equal(segunda.nuevoPersistido, true);
    assert.equal(escenario.insertadas.length, 1);
});

test('rollback SQLite no avanza el estado de filtros del pipeline nuevo', async () => {
    const escenario = crearEscenario({
        guiaActual: crearGuia('GUIA-ROLLBACK'),
        legacyHabilitado: false,
        errorSqlite: true
    });
    const captura = crearLocation({ time: '2026-07-14T12:34:56Z' });

    await escenario.contexto.saveLocation(captura);
    escenario.setErrorSqlite(false);
    const reintento = await escenario.contexto.saveLocation(captura);

    assert.equal(reintento.nuevoPersistido, true);
    assert.equal(escenario.llamadasInsercion(), 2);
    assert.equal(escenario.insertadas.length, 1);
});

test('inicio diferido se cancela al reconciliar sin guías activas', async () => {
    const escenario = crearEscenario();
    escenario.contexto.programarInicioGpsDiferido();

    await escenario.contexto.reconciliarEstadoGpsNativo({
        usuarioActivo: '11-1',
        procesoActual: '',
        guiasActivas: [],
        validacion: { ok: true }
    });
    await new Promise(resolve => setTimeout(resolve, 550));

    assert.equal(escenario.llamadasStart(), 0);
    assert.equal(escenario.servicioNativoActivo(), false);
});

test('reconciliación detecta servicio nativo activo con estado JavaScript falso', async () => {
    const guia = crearGuia('GUIA-NATIVA');
    const escenario = crearEscenario({ servicioNativoActivo: true });

    const resultado = await escenario.contexto.reconciliarEstadoGpsNativo({
        usuarioActivo: '11-1',
        procesoActual: '',
        guiasActivas: [guia],
        validacion: { ok: true }
    });

    assert.equal(resultado.isTrackingEnabled, true);
    assert.equal(escenario.llamadasStart(), 0);
    assert.equal(escenario.llamadasStop(), 0);
});

test('diagnóstico registra exclusivamente configuración y estado técnicos', async () => {
    const escenario = crearEscenario({ servicioNativoActivo: true });
    const diagnostico = await escenario.contexto.registrarDiagnosticoGps();

    assert.deepEqual(Array.from(Object.keys(diagnostico)).sort(), [
        'authorization',
        'desiredAccuracy',
        'distanceFilter',
        'fastestInterval',
        'interval',
        'isRunning',
        'locationProvider',
        'locationServicesEnabled',
        'notificationsEnabled',
        'startForeground',
        'startOnBoot',
        'stopOnTerminate'
    ]);
    assert.equal(diagnostico.locationProvider, 2);
    assert.equal(diagnostico.interval, 5000);
    assert.equal(diagnostico.distanceFilter, 5);
    assert.equal(diagnostico.stopOnTerminate, false);
    assert.equal(diagnostico.startOnBoot, true);
    assert.equal(JSON.stringify(escenario.logs).includes('latitude'), false);
    assert.equal(JSON.stringify(escenario.logs).includes('ID_UNICO'), false);
});

test('stop consulta y detiene el servicio nativo aunque el estado JavaScript sea falso', async () => {
    const escenario = crearEscenario({ servicioNativoActivo: true });

    await escenario.contexto.stopTracking();

    assert.ok(escenario.llamadasCheckStatus() >= 1);
    assert.equal(escenario.llamadasStop(), 1);
    assert.equal(escenario.servicioNativoActivo(), false);
});

test('reconciliaciones repetidas no duplican start ni stop', async () => {
    const guia = crearGuia('GUIA-SIN-DUPLICADOS');
    const escenario = crearEscenario();
    const activo = {
        usuarioActivo: '11-1',
        procesoActual: '',
        guiasActivas: [guia],
        validacion: { ok: true }
    };
    const inactivo = {
        usuarioActivo: '11-1',
        procesoActual: '',
        guiasActivas: [],
        validacion: { ok: true }
    };

    await escenario.contexto.reconciliarEstadoGpsNativo(activo);
    await escenario.contexto.reconciliarEstadoGpsNativo(activo);
    await escenario.contexto.reconciliarEstadoGpsNativo(inactivo);
    await escenario.contexto.reconciliarEstadoGpsNativo(inactivo);

    assert.equal(escenario.llamadasStart(), 1);
    assert.equal(escenario.llamadasStop(), 1);
});

test('estado por guía se limpia cuando deja de estar activa localmente', async () => {
    const escenario = crearEscenario({ legacyHabilitado: false });
    const captura = escenario.contexto.normalizarCapturaGps(
        crearLocation(),
        new Date('2026-07-14T12:34:56Z')
    );

    await escenario.contexto.registrarCapturaSeguimientoNueva(
        captura,
        [crearGuia('GUIA-CERRADA')]
    );
    assert.equal(
        escenario.contexto.puedeRegistrarParaGuia('GUIA-CERRADA', captura, 5000),
        false
    );

    escenario.contexto.limpiarUltimaUbicacionGuiasInactivas([], true);
    assert.equal(
        escenario.contexto.puedeRegistrarParaGuia('GUIA-CERRADA', captura, 5000),
        true
    );
});
