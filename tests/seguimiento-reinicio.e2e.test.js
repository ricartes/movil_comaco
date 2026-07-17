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
const {
    crearGpsTrackingRuntime,
    crearGuiaGps
} = require('./helpers/gps-tracking-runtime');
const { crearRuntime } = require('./helpers/seguimiento-runtime');

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
    const tokenSeguimiento = variableObligatoria('E2E_TOKEN_SEGUIMIENTO');
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
    if (!/^[A-Za-z0-9_-]{43}$/.test(tokenSeguimiento)) {
        throw new Error('E2E_TOKEN_SEGUIMIENTO no tiene el formato Base64URL esperado.');
    }

    const latitud = Number(process.env.E2E_LATITUD || '-36.748134');
    const longitud = Number(process.env.E2E_LONGITUD || '-72.998278');
    const timeoutMs = Number(process.env.E2E_TIMEOUT_MS || '30000');
    const latenciaMaxInicioMs = Number(process.env.E2E_LATENCIA_MAX_INICIO_MS || '8000');
    const latenciaMaxTotalMs = Number(process.env.E2E_LATENCIA_MAX_TOTAL_MS || '20000');
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
        throw new Error('E2E_LATITUD no es válida.');
    }
    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
        throw new Error('E2E_LONGITUD no es válida.');
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000) {
        throw new Error('E2E_TIMEOUT_MS debe ser un entero entre 1 y 120000.');
    }
    if (!Number.isInteger(latenciaMaxInicioMs) || latenciaMaxInicioMs < 3000) {
        throw new Error('E2E_LATENCIA_MAX_INICIO_MS debe ser un entero de al menos 3000.');
    }
    if (!Number.isInteger(latenciaMaxTotalMs) || latenciaMaxTotalMs < latenciaMaxInicioMs) {
        throw new Error('E2E_LATENCIA_MAX_TOTAL_MS debe ser mayor o igual al límite de inicio.');
    }

    return {
        endpoint: endpoint.toString(),
        idSeguimiento,
        latitud,
        longitud,
        latenciaMaxInicioMs,
        latenciaMaxTotalMs,
        timeoutMs,
        tokenSeguimiento,
        uuidDispositivo,
        versionApp: String(process.env.E2E_VERSION_APP || '5.0.3-E2E').trim()
    };
}

function urlBaseDesdeEndpoint(endpoint) {
    return endpoint.replace(/\/WebServiceProveedor\.asmx\/Recibe_Posiciones_Seguimiento\/?$/i, '');
}

async function postHttpE2e(url, cuerpo, timeoutMs) {
    const controlador = new AbortController();
    const temporizador = setTimeout(function () { controlador.abort(); }, timeoutMs);
    try {
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(cuerpo),
            signal: controlador.signal
        });
        const texto = await respuesta.text();
        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status} en la prueba de latencia.`);
        }
        return JSON.parse(texto);
    } finally {
        clearTimeout(temporizador);
    }
}

async function esperarColaVacia(runtime, idSeguimiento, limiteMs) {
    const inicio = Date.now();
    while (Date.now() - inicio <= limiteMs) {
        const pendientes = await runtime.contexto.listarPosicionesSeguimientoPendientes(idSeguimiento, 200);
        if (pendientes.length === 0) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`La cola local no se vació dentro de ${limiteMs} ms.`);
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
        tokenSeguimiento: configuracion.tokenSeguimiento,
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

test('E2E opt-in: callbacks GPS reales del pipeline llegan a HTTPS y vacían SQLite', { skip: !HABILITADO }, async function (t) {
    const configuracion = validarConfiguracion();
    const temporal = crearSqliteTemporal('gfe-seguimiento-e2e-gps-');
    const ahora = Date.now();
    const fechas = [
        new Date(ahora - 12000).toISOString(),
        new Date(ahora - 6000).toISOString(),
        new Date(ahora).toISOString()
    ];
    const guia = crearGuiaGps(
        `GUIA-E2E-GPS-${ahora}`,
        configuracion.idSeguimiento
    );
    const runtime = crearGpsTrackingRuntime({
        rutaDb: temporal.rutaDb,
        guiasPendientes: [guia],
        demoraInsercionMs: 5,
        fechasRecepcion: fechas
    });
    let runtimeCerrado = false;

    t.diagnostic('ADVERTENCIA: esta variante crea tres posiciones sintéticas reales en SQL Server de desarrollo.');
    t.diagnostic(`SQLite temporal GPS: ${temporal.rutaDb}`);

    try {
        await runtime.inicializar();
        runtime.contexto.configureBackgroundGeolocation();
        assert.equal(typeof runtime.eventosGps.location, 'function');
        await Promise.all(fechas.map(function (fecha, indice) {
            return runtime.eventosGps.location({
                time: fecha,
                latitude: configuracion.latitud + (indice * 0.0001),
                longitude: configuracion.longitud + (indice * 0.0001),
                accuracy: 4.5 + indice,
                speed: 8 + indice,
                bearing: 120 + indice,
                altitude: 500 + indice,
                isFromMockProvider: false
            });
        }));

        const posicionesLocales = await runtime.posiciones(configuracion.idSeguimiento);
        assert.equal(posicionesLocales.length, 3);
        assert.equal(runtime.maximoInsercionesActivas(), 1);
        assert.equal(runtime.solicitudesScheduler.length, 3);
        assert.deepEqual(posicionesLocales.map(function (posicion) {
            return posicion.FECHA_DISPOSITIVO_UTC;
        }), fechas);
        const uuidPosiciones = posicionesLocales.map(function (posicion) {
            return posicion.UUID_POSICION;
        });
        assert.equal(new Set(uuidPosiciones).size, 3);
        t.diagnostic(`UUID_POSICION GPS: ${uuidPosiciones.join(', ')}`);

        runtime.cerrar();
        runtimeCerrado = true;

        const envio = ejecutarProceso({
            accion: 'E2E_REENVIO',
            conectado: true,
            rutaDb: temporal.rutaDb,
            idSeguimiento: configuracion.idSeguimiento,
            tokenSeguimiento: configuracion.tokenSeguimiento,
            uuidDispositivo: configuracion.uuidDispositivo,
            versionApp: configuracion.versionApp,
            endpoint: configuracion.endpoint,
            timeoutMs: configuracion.timeoutMs
        }, configuracion.timeoutMs + 5000);

        assert.equal(envio.resumen.ERRORES, 0);
        assert.equal(envio.resumen.POSICIONES_CONFIRMADAS, 3);
        assert.equal(envio.despues.length, 0);
        const resultado = desempaquetarRespuesta(envio.respuestas[0]);
        assert.equal(resultado.EXITO, true);
        assert.deepEqual(uuidNormalizados(resultado.POSICIONES), uuidPosiciones.map(function (uuid) {
            return uuid.toUpperCase();
        }).sort());
        assert.ok(resultado.POSICIONES.every(function (posicion) {
            return posicion.ESTADO === 'INSERTADA' || posicion.ESTADO === 'YA_EXISTIA';
        }));

        t.diagnostic(`Estados HTTPS GPS: ${JSON.stringify(estados(resultado))}`);
        t.diagnostic('SQLite terminó vacía tras confirmación: sí');
        t.diagnostic([
            'Consulta SQL para verificación GPS:',
            'SELECT ID_POSICION, UUID_POSICION, ID_SEGUIMIENTO,',
            '       FECHA_DISPOSITIVO_UTC, LATITUD, LONGITUD, ORIGEN_CAPTURA',
            'FROM dbo.GFE_SEGUIMIENTO_POSICION',
            'WHERE UUID_POSICION IN (',
            uuidPosiciones.map(function (uuid) { return `    '${uuid}'`; }).join(',\n'),
            ')',
            'ORDER BY ID_POSICION;'
        ].join('\n'));
    } finally {
        if (!runtimeCerrado) runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});

test('E2E opt-in: commit SQLite, debounce y confirmación cumplen límites de latencia', { skip: !HABILITADO }, async function (t) {
    const configuracion = validarConfiguracion();
    const temporal = crearSqliteTemporal('gfe-seguimiento-e2e-latencia-');
    const uuidPosicion = crypto.randomUUID();
    const runtime = crearRuntime({
        rutaDb: temporal.rutaDb,
        cargarEnvio: true,
        conectado: true,
        uuidDispositivo: configuracion.uuidDispositivo,
        versionApp: configuracion.versionApp,
        timeoutMs: configuracion.timeoutMs,
        urlBase: urlBaseDesdeEndpoint(configuracion.endpoint),
        post(url, cuerpo) {
            return postHttpE2e(url, cuerpo, configuracion.timeoutMs);
        }
    });

    t.diagnostic('ADVERTENCIA: esta prueba crea una posición real en SQL Server de desarrollo.');
    t.diagnostic(`UUID_POSICION latencia: ${uuidPosicion}`);
    try {
        runtime.db.exec('CREATE TABLE IF NOT EXISTS GDE (ID_UNICO_MOVIL TEXT)');
        await runtime.contexto.DATOS_inicializarSeguimientoSqlite();
        runtime.guardarCredencial({
            idGuia: `GUIA-E2E-LATENCIA-${Date.now()}`,
            idSeguimiento: configuracion.idSeguimiento,
            tokenSeguimiento: configuracion.tokenSeguimiento,
            uuidDispositivo: configuracion.uuidDispositivo
        });
        await runtime.contexto.insertarPosicionSeguimientoPendiente({
            UUID_POSICION: uuidPosicion,
            ID_UNICO_MOVIL_GDE: `GUIA-E2E-LATENCIA-${Date.now()}`,
            ID_UNICO_SEGUIMIENTO: configuracion.idSeguimiento,
            SECUENCIA_LOCAL: 1,
            FECHA_DISPOSITIVO_UTC: new Date().toISOString(),
            LATITUD: configuracion.latitud,
            LONGITUD: configuracion.longitud,
            PRECISION_METROS: 5,
            VELOCIDAD_MPS: null,
            RUMBO_GRADOS: null,
            ALTITUD_METROS: null,
            ES_UBICACION_SIMULADA: false,
            ORIGEN_CAPTURA: 'GPS'
        });
        const fechaCommitMs = Date.now();

        runtime.contexto.inicializarProgramadorEnvioSeguimiento();
        runtime.contexto.solicitarEnvioSeguimiento('e2e_latencia', false);
        await esperarColaVacia(runtime, configuracion.idSeguimiento, configuracion.latenciaMaxTotalMs + 5000);
        const fechaConfirmacionMs = Date.now();

        assert.equal(runtime.solicitudes.length, 1);
        assert.equal(runtime.respuestas.length, 1);
        const solicitud = runtime.solicitudes[0];
        const resultado = desempaquetarRespuesta(runtime.respuestas[0]);
        const posicionResultado = resultado.POSICIONES.find(function (item) {
            return String(item.UUID_POSICION).toUpperCase() === uuidPosicion.toUpperCase();
        });
        assert.ok(posicionResultado);
        assert.ok(posicionResultado.ESTADO === 'INSERTADA' || posicionResultado.ESTADO === 'YA_EXISTIA');

        const commitAInicioPostMs = solicitud.fechaInicioMs - fechaCommitMs;
        const duracionHttpMs = solicitud.fechaFinMs - solicitud.fechaInicioMs;
        const commitAConfirmacionMs = fechaConfirmacionMs - fechaCommitMs;
        assert.ok(commitAInicioPostMs <= configuracion.latenciaMaxInicioMs,
            `Inicio POST ${commitAInicioPostMs} ms supera ${configuracion.latenciaMaxInicioMs} ms.`);
        assert.ok(commitAConfirmacionMs <= configuracion.latenciaMaxTotalMs,
            `Confirmación ${commitAConfirmacionMs} ms supera ${configuracion.latenciaMaxTotalMs} ms.`);

        const pendientes = await runtime.contexto.listarPosicionesSeguimientoPendientes(configuracion.idSeguimiento, 200);
        assert.equal(pendientes.length, 0);
        t.diagnostic(`Latencia commit -> inicio POST: ${commitAInicioPostMs} ms`);
        t.diagnostic(`Duración HTTP: ${duracionHttpMs} ms`);
        t.diagnostic(`Latencia commit -> confirmación local: ${commitAConfirmacionMs} ms`);
        t.diagnostic('SQLite terminó vacía tras confirmación: sí');
    } finally {
        if (typeof runtime.contexto.detenerProgramadorEnvioSeguimiento === 'function') {
            runtime.contexto.detenerProgramadorEnvioSeguimiento();
        }
        runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});
