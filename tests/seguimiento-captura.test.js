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
    let accionesLegacy = 0;
    let llamadasInsercion = 0;
    const guiaActual = opciones.guiaActual || null;
    const guiasPendientes = opciones.guiasPendientes || [];

    const contexto = {
        Array,
        Date,
        Error,
        HABILITAR_CAPTURA_SEGUIMIENTO_NUEVO: opciones.habilitado !== false,
        JSON,
        Math,
        Number,
        Object,
        Promise,
        String,
        Uint8Array,
        TipoAccionTypes: { CAPTURA_UBICACION: 33 },
        console: {
            log() {},
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
            accionesLegacy++;
        },
        navigator: {},
        cordova: { plugins: {} },
        setTimeout
    };

    vm.createContext(contexto);
    vm.runInContext(
        fs.readFileSync(path.join(raiz, 'www/js/Datos/Seguimiento.js'), 'utf8'),
        contexto,
        { filename: 'Seguimiento.js' }
    );

    contexto.insertarPosicionesSeguimientoPendientes = async function (posiciones) {
        llamadasInsercion++;
        if (opciones.errorSqlite) {
            throw new Error('fallo SQLite simulado');
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
        insertadas,
        advertencias,
        accionesLegacy() { return accionesLegacy; },
        llamadasInsercion() { return llamadasInsercion; }
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
    assert.equal(escenario.advertencias.length, 1);
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

test('mapea campos reales del plugin y normaliza métricas inválidas a NULL', async () => {
    const escenario = crearEscenario();
    const location = crearLocation({
        speed: -1,
        bearing: -1,
        accuracy: -5,
        altitude: 620.25,
        isFromMockProvider: true
    });

    await escenario.contexto.registrarCapturaSeguimientoNueva(location, [crearGuia('GUIA-1')]);

    const posicion = escenario.insertadas[0];
    assert.equal(posicion.VELOCIDAD_MPS, null);
    assert.equal(posicion.RUMBO_GRADOS, null);
    assert.equal(posicion.PRECISION_METROS, null);
    assert.equal(posicion.ALTITUD_METROS, 620.25);
    assert.equal(posicion.ES_UBICACION_SIMULADA, 1);
    assert.equal(posicion.SECUENCIA_LOCAL, null);
    assert.equal(posicion.ORIGEN_CAPTURA, 'GPS');
});

test('timestamp válido del plugin se convierte a ISO-8601 terminado en Z', async () => {
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
