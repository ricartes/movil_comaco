const { crearRuntime } = require('./seguimiento-runtime');

const MARCADOR = 'SEGUIMIENTO_CHILD_RESULT:';

function leerConfiguracion() {
    if (!process.env.SEGUIMIENTO_TEST_PAYLOAD) {
        throw new Error('Falta SEGUIMIENTO_TEST_PAYLOAD.');
    }
    return JSON.parse(process.env.SEGUIMIENTO_TEST_PAYLOAD);
}

function urlBaseDesdeEndpoint(endpoint) {
    return endpoint.replace(/\/WebServiceProveedor\.asmx\/Recibe_Posiciones_Seguimiento\/?$/i, '');
}

function limitarTexto(texto, maximo) {
    return String(texto || '').replace(/[\r\n\t]+/g, ' ').slice(0, maximo);
}

async function postHttpReal(url, cuerpo, configuracion, opciones) {
    const timeoutMs = opciones.timeoutMs;
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
            let cuerpoSeguro = limitarTexto(texto, 800)
                .replaceAll(opciones.uuidDispositivo, '[UUID_DISPOSITIVO]');
            if (opciones.tokenSeguimiento) {
                cuerpoSeguro = cuerpoSeguro.replaceAll(opciones.tokenSeguimiento, '[TOKEN_SEGUIMIENTO]');
            }
            throw new Error(
                `HTTP ${respuesta.status} en ${new URL(url).origin}${new URL(url).pathname}; ` +
                `timeout=${timeoutMs}ms; respuesta=${cuerpoSeguro}`
            );
        }
        try {
            return JSON.parse(texto);
        } catch (error) {
            throw new Error(`Respuesta HTTP no JSON desde ${new URL(url).origin}${new URL(url).pathname}.`);
        }
    } catch (error) {
        if (error && error.name === 'AbortError') {
            throw new Error(`Timeout HTTP tras ${timeoutMs}ms en ${new URL(url).origin}${new URL(url).pathname}.`);
        }
        throw error;
    } finally {
        clearTimeout(temporizador);
    }
}

async function preparar(runtime) {
    runtime.db.exec('CREATE TABLE IF NOT EXISTS GDE (ID_UNICO_MOVIL TEXT)');
    await runtime.contexto.DATOS_inicializarSeguimientoSqlite();
}

async function obtenerPosiciones(runtime, idSeguimiento) {
    return Array.from(
        await runtime.contexto.listarPosicionesSeguimientoPendientes(idSeguimiento, 200),
        function (posicion) { return JSON.parse(JSON.stringify(posicion)); }
    );
}

function crearPostSimulado(configuracion) {
    if (configuracion.respuestaHttp === 'ERROR') {
        return async function () {
            const error = new Error('Timeout HTTP simulado.');
            error.code = 'ETIMEDOUT';
            throw error;
        };
    }

    return async function (url, cuerpo) {
        const posiciones = cuerpo.entrada.POSICIONES;
        const resultado = {
            EXITO: true,
            CANTIDAD_RECIBIDA: posiciones.length,
            CANTIDAD_INSERTADA: 1,
            CANTIDAD_EXISTENTE: posiciones.length - 1,
            POSICIONES: posiciones.map(function (posicion, indice) {
                return {
                    UUID_POSICION: posicion.UUID_POSICION,
                    ESTADO: indice === 0 ? 'INSERTADA' : 'YA_EXISTIA'
                };
            })
        };

        if (configuracion.formatoRespuesta === 'D_OBJETO') {
            return { d: resultado };
        }
        if (configuracion.formatoRespuesta === 'DIRECTA') {
            return resultado;
        }
        return { d: JSON.stringify(resultado) };
    };
}

async function ejecutar(configuracion) {
    const esHttpReal = configuracion.accion === 'E2E_PRIMER_ENVIO' || configuracion.accion === 'E2E_REENVIO';
    const runtime = crearRuntime({
        rutaDb: configuracion.rutaDb,
        cargarEnvio: configuracion.accion !== 'ESCRIBIR',
        conectado: configuracion.conectado,
        uuidDispositivo: configuracion.uuidDispositivo,
        versionApp: configuracion.versionApp,
        timeoutMs: configuracion.timeoutMs,
        urlBase: configuracion.endpoint ? urlBaseDesdeEndpoint(configuracion.endpoint) : undefined,
        post: esHttpReal
            ? function (url, cuerpo, opcionesHttp) {
                return postHttpReal(url, cuerpo, opcionesHttp, configuracion);
            }
            : crearPostSimulado(configuracion)
    });

    try {
        await preparar(runtime);
        if (configuracion.tokenSeguimiento) {
            runtime.guardarCredencial(configuracion);
        }

        if (configuracion.accion === 'ESCRIBIR') {
            const insertadas = await runtime.contexto.insertarPosicionesSeguimientoPendientes(configuracion.posiciones);
            return {
                insertadas: Array.from(insertadas, function (fila) { return JSON.parse(JSON.stringify(fila)); }),
                posiciones: await obtenerPosiciones(runtime, configuracion.idSeguimiento)
            };
        }

        const antes = await obtenerPosiciones(runtime, configuracion.idSeguimiento);

        if (configuracion.accion === 'E2E_PRIMER_ENVIO') {
            const posicionesEntrada = antes.map(runtime.contexto.SEGUIMIENTO_posicionParaEnviar);
            const respuesta = await runtime.contexto.enviarPosicionesSeguimientoWebService({
                ID_UNICO_SEGUIMIENTO: configuracion.idSeguimiento,
                UUID_DISPOSITIVO: configuracion.uuidDispositivo,
                TOKEN_SEGUIMIENTO: configuracion.tokenSeguimiento,
                VERSION_APP: configuracion.versionApp,
                POSICIONES: posicionesEntrada
            });
            const resultado = runtime.contexto.SEGUIMIENTO_desempaquetarRespuesta(respuesta);
            const confirmaciones = runtime.contexto.SEGUIMIENTO_analizarConfirmaciones(respuesta, posicionesEntrada);
            return {
                antes,
                despues: await obtenerPosiciones(runtime, configuracion.idSeguimiento),
                confirmaciones: JSON.parse(JSON.stringify(confirmaciones)),
                resultado: JSON.parse(JSON.stringify(resultado)),
                respuestas: runtime.respuestas,
                solicitudes: runtime.solicitudes
            };
        }

        const resumen = await runtime.contexto.enviarPosicionesSeguimientoPendientes();
        return {
            antes,
            despues: await obtenerPosiciones(runtime, configuracion.idSeguimiento),
            resumen: JSON.parse(JSON.stringify(resumen)),
            respuestas: runtime.respuestas,
            solicitudes: runtime.solicitudes
        };
    } finally {
        runtime.cerrar();
    }
}

(async function () {
    try {
        const resultado = await ejecutar(leerConfiguracion());
        process.stdout.write(`${MARCADOR}${JSON.stringify(resultado)}\n`);
    } catch (error) {
        process.stderr.write(`${limitarTexto(error && error.stack ? error.stack : error, 2000)}\n`);
        process.exitCode = 1;
    }
})();
