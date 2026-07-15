const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CHILD = path.join(__dirname, 'seguimiento-reinicio-child.js');
const MARCADOR = 'SEGUIMIENTO_CHILD_RESULT:';

function ejecutarProceso(configuracion, timeoutMs = 30000) {
    const resultado = spawnSync(process.execPath, [CHILD], {
        encoding: 'utf8',
        env: {
            ...process.env,
            SEGUIMIENTO_TEST_PAYLOAD: JSON.stringify(configuracion)
        },
        timeout: timeoutMs
    });

    if (resultado.error) {
        throw resultado.error;
    }
    assert.equal(
        resultado.status,
        0,
        `El child_process falló. stderr=${String(resultado.stderr || '').slice(0, 2000)}`
    );

    const linea = String(resultado.stdout || '')
        .split(/\r?\n/)
        .find(function (valor) { return valor.startsWith(MARCADOR); });
    assert.ok(linea, 'El child_process no devolvió su resultado estructurado.');
    return JSON.parse(linea.slice(MARCADOR.length));
}

function crearSqliteTemporal(prefijo = 'gfe-seguimiento-reinicio-') {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), prefijo));
    return {
        directorio,
        rutaDb: path.join(directorio, 'seguimiento.sqlite')
    };
}

function limpiarSqliteTemporal(temporal) {
    const temporalResuelto = path.resolve(temporal.directorio);
    const raizTemporal = path.resolve(os.tmpdir());
    assert.ok(
        temporalResuelto.startsWith(raizTemporal + path.sep) &&
        path.basename(temporalResuelto).startsWith('gfe-seguimiento-'),
        'Se rechazó limpiar una ruta que no pertenece al directorio temporal de seguimiento.'
    );
    fs.rmSync(temporalResuelto, { recursive: true, force: true });
}

function crearPosiciones(opciones) {
    return opciones.uuidPosiciones.map(function (uuid, indice) {
        return {
            UUID_POSICION: uuid,
            ID_UNICO_MOVIL_GDE: `${opciones.prefijoGuia || 'GUIA-REINICIO'}-${indice + 1}`,
            ID_UNICO_SEGUIMIENTO: opciones.idSeguimiento,
            SECUENCIA_LOCAL: null,
            FECHA_DISPOSITIVO_UTC: opciones.fechas[indice],
            LATITUD: opciones.latitud,
            LONGITUD: opciones.longitud,
            PRECISION_METROS: 4.5 + indice,
            VELOCIDAD_MPS: null,
            RUMBO_GRADOS: null,
            ALTITUD_METROS: null,
            ES_UBICACION_SIMULADA: false,
            ORIGEN_CAPTURA: 'E2E_REINICIO'
        };
    });
}

function proyectarPersistencia(posiciones) {
    return posiciones.map(function (posicion) {
        return {
            UUID_POSICION: posicion.UUID_POSICION,
            ID_UNICO_MOVIL_GDE: posicion.ID_UNICO_MOVIL_GDE,
            ID_UNICO_SEGUIMIENTO: posicion.ID_UNICO_SEGUIMIENTO,
            FECHA_DISPOSITIVO_UTC: posicion.FECHA_DISPOSITIVO_UTC,
            LATITUD: posicion.LATITUD,
            LONGITUD: posicion.LONGITUD,
            INTENTOS_ENVIO: posicion.INTENTOS_ENVIO
        };
    });
}

function desempaquetarRespuesta(respuesta) {
    let resultado = respuesta;
    if (resultado && Object.prototype.hasOwnProperty.call(resultado, 'd')) {
        resultado = resultado.d;
    }
    if (typeof resultado === 'string') {
        resultado = JSON.parse(resultado);
    }
    return resultado;
}

module.exports = {
    crearPosiciones,
    crearSqliteTemporal,
    desempaquetarRespuesta,
    ejecutarProceso,
    limpiarSqliteTemporal,
    proyectarPersistencia
};
