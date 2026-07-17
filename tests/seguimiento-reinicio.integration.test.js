const assert = require('node:assert/strict');
const test = require('node:test');
const {
    crearPosiciones,
    crearSqliteTemporal,
    ejecutarProceso,
    limpiarSqliteTemporal,
    proyectarPersistencia
} = require('./helpers/seguimiento-procesos');

const ID_SEGUIMIENTO = '33333333-3333-4333-8333-333333333333';
const UUID_DISPOSITIVO = 'DISPOSITIVO-INTEGRACION-01';
const TOKEN_SEGUIMIENTO_PRUEBA = 'A'.repeat(43);
const UUID_POSICIONES = [
    'cccccccc-cccc-4ccc-8ccc-000000000001',
    'cccccccc-cccc-4ccc-8ccc-000000000002'
];
const FECHAS = ['2026-07-14T14:00:00.000Z', '2026-07-14T14:00:01.000Z'];

function configuracionBase(temporal) {
    return {
        rutaDb: temporal.rutaDb,
        idSeguimiento: ID_SEGUIMIENTO,
        uuidDispositivo: UUID_DISPOSITIVO,
        tokenSeguimiento: TOKEN_SEGUIMIENTO_PRUEBA,
        versionApp: '5.0.3-INTEGRACION',
        timeoutMs: 5000
    };
}

function posicionesDeterministas() {
    return crearPosiciones({
        idSeguimiento: ID_SEGUIMIENTO,
        uuidPosiciones: UUID_POSICIONES,
        fechas: FECHAS,
        latitud: -36.748134,
        longitud: -72.998278,
        prefijoGuia: 'GUIA-INTEGRACION'
    });
}

test('SQLite física sobrevive reinicios reales y se vacía tras HTTP simulado exitoso', function (t) {
    const temporal = crearSqliteTemporal();
    const posiciones = posicionesDeterministas();
    t.diagnostic(`SQLite temporal de integración: ${temporal.rutaDb}`);

    try {
        const escritor = ejecutarProceso({
            ...configuracionBase(temporal),
            accion: 'ESCRIBIR',
            posiciones
        });
        assert.equal(escritor.posiciones.length, 2);
        assert.deepEqual(
            proyectarPersistencia(escritor.posiciones),
            proyectarPersistencia(posiciones).map(function (posicion) {
                return { ...posicion, INTENTOS_ENVIO: 0 };
            })
        );

        const reinicioOffline = ejecutarProceso({
            ...configuracionBase(temporal),
            accion: 'SIN_CONEXION',
            conectado: false
        });
        assert.equal(reinicioOffline.resumen.OMITIDO, true);
        assert.equal(reinicioOffline.resumen.MOTIVO, 'SIN_CONEXION');
        assert.equal(reinicioOffline.solicitudes.length, 0);
        assert.deepEqual(
            proyectarPersistencia(reinicioOffline.despues),
            proyectarPersistencia(escritor.posiciones)
        );

        const recuperacion = ejecutarProceso({
            ...configuracionBase(temporal),
            accion: 'ENVIAR_SIMULADO',
            conectado: true,
            formatoRespuesta: 'D_STRING'
        });
        assert.equal(recuperacion.solicitudes.length, 1);
        const entrada = recuperacion.solicitudes[0].cuerpo.entrada;
        assert.deepEqual(
            entrada.POSICIONES.map(function (posicion) { return posicion.UUID_POSICION; }),
            UUID_POSICIONES
        );
        assert.deepEqual(
            entrada.POSICIONES.map(function (posicion) { return posicion.FECHA_DISPOSITIVO_UTC; }),
            FECHAS
        );
        assert.equal(entrada.ID_UNICO_SEGUIMIENTO, ID_SEGUIMIENTO);
        assert.equal(entrada.UUID_DISPOSITIVO, UUID_DISPOSITIVO);
        assert.equal(recuperacion.resumen.POSICIONES_CONFIRMADAS, 2);
        assert.equal(recuperacion.resumen.ERRORES, 0);
        assert.equal(recuperacion.despues.length, 0);
    } finally {
        limpiarSqliteTemporal(temporal);
    }
});

test('timeout conserva UUID y fechas, incrementa intentos y permite recuperar en otro proceso', function (t) {
    const temporal = crearSqliteTemporal('gfe-seguimiento-error-');
    const posiciones = posicionesDeterministas();
    t.diagnostic(`SQLite temporal del escenario de error: ${temporal.rutaDb}`);

    try {
        const escritor = ejecutarProceso({
            ...configuracionBase(temporal),
            accion: 'ESCRIBIR',
            posiciones
        });

        const timeout = ejecutarProceso({
            ...configuracionBase(temporal),
            accion: 'ENVIAR_ERROR',
            conectado: true,
            respuestaHttp: 'ERROR'
        });
        assert.equal(timeout.solicitudes.length, 1);
        assert.equal(timeout.resumen.ERRORES, 1);
        assert.equal(timeout.despues.length, 2);
        assert.deepEqual(
            timeout.despues.map(function (posicion) { return posicion.UUID_POSICION; }),
            UUID_POSICIONES
        );
        assert.deepEqual(
            timeout.despues.map(function (posicion) { return posicion.FECHA_DISPOSITIVO_UTC; }),
            FECHAS
        );
        assert.deepEqual(
            timeout.despues.map(function (posicion) { return posicion.INTENTOS_ENVIO; }),
            [1, 1]
        );
        assert.deepEqual(
            proyectarPersistencia(escritor.posiciones).map(function (posicion) {
                return { ...posicion, INTENTOS_ENVIO: 1 };
            }),
            proyectarPersistencia(timeout.despues)
        );

        const recuperacion = ejecutarProceso({
            ...configuracionBase(temporal),
            accion: 'ENVIAR_SIMULADO',
            conectado: true,
            formatoRespuesta: 'D_OBJETO'
        });
        assert.deepEqual(
            recuperacion.solicitudes[0].cuerpo.entrada.POSICIONES.map(function (posicion) {
                return posicion.UUID_POSICION;
            }),
            UUID_POSICIONES
        );
        assert.equal(recuperacion.resumen.POSICIONES_CONFIRMADAS, 2);
        assert.equal(recuperacion.despues.length, 0);
    } finally {
        limpiarSqliteTemporal(temporal);
    }
});
