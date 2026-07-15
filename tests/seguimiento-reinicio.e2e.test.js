const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const {
    crearPosiciones,
    crearSqliteTemporal,
    desempaquetarRespuesta,
    ejecutarProceso,
    limpiarSqliteTemporal
} = require('./helpers/seguimiento-procesos');

const HABILITADO = process.env.RUN_E2E_SEGUIMIENTO === '1';

function variableObligatoria(nombre) {
    const valor = String(process.env[nombre] || '').trim();
    if (!valor) {
        throw new Error(`Falta la variable obligatoria ${nombre}.`);
    }
    return valor;
}

function validarConfiguracion() {
    if (process.env.E2E_CONFIRMAR_BD_DESARROLLO !== 'SI') {
        throw new Error('E2E_CONFIRMAR_BD_DESARROLLO debe ser SI antes de crear datos.');
    }

    const endpointTexto = variableObligatoria('E2E_SEGUIMIENTO_URL');
    const idSeguimiento = variableObligatoria('E2E_ID_UNICO_SEGUIMIENTO');
    const uuidDispositivo = variableObligatoria('E2E_UUID_DISPOSITIVO');
    const endpoint = new URL(endpointTexto);
    const hostLocal = ['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname);
    const hostNgrok = /(?:^|\.)ngrok(?:-free)?\.(?:app|io)$/i.test(endpoint.hostname);

    if (endpoint.protocol !== 'https:' && !(hostLocal && process.env.E2E_PERMITIR_HTTP_LOCAL === '1')) {
        throw new Error('E2E_SEGUIMIENTO_URL debe usar HTTPS; HTTP solo se admite en host local con E2E_PERMITIR_HTTP_LOCAL=1.');
    }
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
        throw new Error('E2E_SEGUIMIENTO_URL no puede contener credenciales, parámetros ni fragmentos.');
    }
    if (!hostLocal && !hostNgrok) {
        throw new Error('Por seguridad, la prueba E2E solo admite ngrok o un host local explícito; se rechazó una URL potencialmente productiva.');
    }
    if (!/\/WebServiceProveedor\.asmx\/Recibe_Posiciones_Seguimiento\/?$/i.test(endpoint.pathname)) {
        throw new Error('E2E_SEGUIMIENTO_URL debe apuntar al endpoint completo Recibe_Posiciones_Seguimiento.');
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idSeguimiento)) {
        throw new Error('E2E_ID_UNICO_SEGUIMIENTO no tiene formato UUID válido.');
    }
    if (uuidDispositivo.length > 100) {
        throw new Error('E2E_UUID_DISPOSITIVO supera 100 caracteres.');
    }

    const latitud = Number(process.env.E2E_LATITUD || '-36.748134');
    const longitud = Number(process.env.E2E_LONGITUD || '-72.998278');
    const timeoutMs = Number(process.env.E2E_TIMEOUT_MS || '30000');
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
        throw new Error('E2E_LATITUD no es válida.');
    }
    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
        throw new Error('E2E_LONGITUD no es válida.');
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000) {
        throw new Error('E2E_TIMEOUT_MS debe ser un entero entre 1 y 120000.');
    }

    return {
        endpoint: endpoint.toString(),
        idSeguimiento,
        latitud,
        longitud,
        timeoutMs,
        uuidDispositivo,
        versionApp: String(process.env.E2E_VERSION_APP || '5.0.3-E2E').trim()
    };
}

function enmascarar(valor) {
    if (valor.length <= 8) {
        return `${valor.slice(0, 2)}***${valor.slice(-2)}`;
    }
    return `${valor.slice(0, 4)}***${valor.slice(-4)}`;
}

function estados(resultado) {
    return resultado.POSICIONES.map(function (posicion) {
        return { UUID_POSICION: posicion.UUID_POSICION, ESTADO: posicion.ESTADO };
    });
}

function uuidNormalizados(posiciones) {
    return posiciones.map(function (posicion) {
        return String(posicion.UUID_POSICION).toUpperCase();
    }).sort();
}

test('E2E opt-in: reinicio, cierre antes del DELETE y reenvío idempotente', { skip: !HABILITADO }, function (t) {
    const configuracion = validarConfiguracion();
    const temporal = crearSqliteTemporal('gfe-seguimiento-e2e-');
    const uuidPosiciones = [crypto.randomUUID(), crypto.randomUUID()];
    const ahora = Date.now();
    const fechas = [new Date(ahora).toISOString(), new Date(ahora + 1000).toISOString()];
    const posiciones = crearPosiciones({
        idSeguimiento: configuracion.idSeguimiento,
        uuidPosiciones,
        fechas,
        latitud: configuracion.latitud,
        longitud: configuracion.longitud,
        prefijoGuia: `GUIA-E2E-${ahora}`
    });
    const base = {
        rutaDb: temporal.rutaDb,
        idSeguimiento: configuracion.idSeguimiento,
        uuidDispositivo: configuracion.uuidDispositivo,
        versionApp: configuracion.versionApp,
        endpoint: configuracion.endpoint,
        timeoutMs: configuracion.timeoutMs
    };

    t.diagnostic('ADVERTENCIA: esta prueba crea dos posiciones reales en SQL Server de desarrollo. Use un seguimiento dedicado.');
    t.diagnostic(`SQLite temporal: ${temporal.rutaDb}`);
    t.diagnostic(`UUID_POSICION: ${uuidPosiciones.join(', ')}`);
    t.diagnostic(`E2E_ID_UNICO_SEGUIMIENTO: ${configuracion.idSeguimiento}`);
    t.diagnostic(`E2E_UUID_DISPOSITIVO: ${enmascarar(configuracion.uuidDispositivo)}`);

    try {
        const escritura = ejecutarProceso({ ...base, accion: 'ESCRIBIR', posiciones }, configuracion.timeoutMs + 5000);
        assert.equal(escritura.posiciones.length, 2);

        const offline = ejecutarProceso({ ...base, accion: 'SIN_CONEXION', conectado: false }, configuracion.timeoutMs + 5000);
        assert.equal(offline.solicitudes.length, 0);
        assert.equal(offline.despues.length, 2);
        assert.deepEqual(offline.despues.map(function (p) { return p.UUID_POSICION; }), uuidPosiciones);
        assert.deepEqual(offline.despues.map(function (p) { return p.FECHA_DISPOSITIVO_UTC; }), fechas);

        const primerEnvio = ejecutarProceso({ ...base, accion: 'E2E_PRIMER_ENVIO', conectado: true }, configuracion.timeoutMs + 5000);
        const primerResultado = primerEnvio.resultado;
        assert.equal(primerResultado.EXITO, true);
        assert.equal(primerResultado.POSICIONES.length, 2);
        assert.deepEqual(uuidNormalizados(primerResultado.POSICIONES), uuidPosiciones.map(function (uuid) {
            return uuid.toUpperCase();
        }).sort());
        assert.ok(primerResultado.POSICIONES.every(function (p) {
            return p.ESTADO === 'INSERTADA' || p.ESTADO === 'YA_EXISTIA';
        }));
        assert.equal(primerEnvio.despues.length, 2, 'El primer envío no debe ejecutar el DELETE local.');
        assert.deepEqual(primerEnvio.despues.map(function (p) { return p.UUID_POSICION; }), uuidPosiciones);
        assert.deepEqual(primerEnvio.despues.map(function (p) { return p.FECHA_DISPOSITIVO_UTC; }), fechas);
        t.diagnostic(`Estados del primer envío: ${JSON.stringify(estados(primerResultado))}`);
        t.diagnostic(
            `Cantidades primer envío: recibida=${primerResultado.CANTIDAD_RECIBIDA}, ` +
            `insertada=${primerResultado.CANTIDAD_INSERTADA}, existente=${primerResultado.CANTIDAD_EXISTENTE}`
        );

        const reenvio = ejecutarProceso({ ...base, accion: 'E2E_REENVIO', conectado: true }, configuracion.timeoutMs + 5000);
        assert.equal(reenvio.resumen.ERRORES, 0);
        assert.equal(reenvio.resumen.POSICIONES_CONFIRMADAS, 2);
        assert.equal(reenvio.despues.length, 0);
        assert.equal(reenvio.respuestas.length, 1);
        const resultadoReenvio = desempaquetarRespuesta(reenvio.respuestas[0]);
        assert.equal(resultadoReenvio.EXITO, true);
        assert.deepEqual(uuidNormalizados(resultadoReenvio.POSICIONES), uuidPosiciones.map(function (uuid) {
            return uuid.toUpperCase();
        }).sort());
        assert.ok(resultadoReenvio.POSICIONES.every(function (p) { return p.ESTADO === 'YA_EXISTIA'; }),
            'El reenvío del mismo UUID debe responder YA_EXISTIA.');
        t.diagnostic(`Estados del reenvío: ${JSON.stringify(estados(resultadoReenvio))}`);
        t.diagnostic('SQLite terminó vacía: sí');
        t.diagnostic([
            'Consulta SQL para verificación:',
            'SELECT',
            '    ID_POSICION, UUID_POSICION, ID_SEGUIMIENTO,',
            '    FECHA_DISPOSITIVO_UTC, FECHA_RECEPCION_UTC,',
            '    LATITUD, LONGITUD, ORIGEN_CAPTURA',
            'FROM dbo.GFE_SEGUIMIENTO_POSICION',
            'WHERE UUID_POSICION IN (',
            `    '${uuidPosiciones[0]}',`,
            `    '${uuidPosiciones[1]}'`,
            ')',
            'ORDER BY ID_POSICION;'
        ].join('\n'));
    } finally {
        limpiarSqliteTemporal(temporal);
    }
});
