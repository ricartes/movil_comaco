const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const UUID_SEGUIMIENTO = '11111111-1111-4111-8111-111111111111';
const UUID_SEGUIMIENTO_2 = '22222222-2222-4222-8222-222222222222';

function uuidPosicion(numero) {
    return `aaaaaaaa-aaaa-4aaa-8aaa-${String(numero).padStart(12, '0')}`;
}

function crearPosiciones(cantidad, idSeguimiento = UUID_SEGUIMIENTO, inicio = 1) {
    return Array.from({ length: cantidad }, (_, indice) => ({
        ID: inicio + indice,
        UUID_POSICION: uuidPosicion(inicio + indice),
        ID_UNICO_MOVIL_GDE: `GUIA-${idSeguimiento}-${inicio + indice}`,
        ID_UNICO_SEGUIMIENTO: idSeguimiento,
        SECUENCIA_LOCAL: inicio + indice,
        FECHA_DISPOSITIVO_UTC: '2026-07-14T12:00:00.000Z',
        LATITUD: -33.45,
        LONGITUD: -70.66,
        PRECISION_METROS: 5.5,
        VELOCIDAD_MPS: null,
        RUMBO_GRADOS: null,
        ALTITUD_METROS: null,
        ES_UBICACION_SIMULADA: 0,
        ORIGEN_CAPTURA: 'GPS',
        INTENTOS_ENVIO: 0
    }));
}

function crearEscenario(opciones = {}) {
    const colas = {};
    Object.entries(opciones.colas || {}).forEach(([id, posiciones]) => {
        colas[id] = posiciones.slice();
    });

    const solicitudes = [];
    const intentos = {};
    const eliminados = [];
    const credencialesMarcadas = [];
    let solicitudesActivas = 0;
    let maximoSolicitudesActivas = 0;
    let enviar = opciones.enviar;

    const consola = {
        log() {},
        warn() {},
        error() {}
    };
    const contexto = {
        Array,
        Date,
        Error,
        HABILITAR_ENVIO_SEGUIMIENTO_NUEVO: opciones.habilitado !== false,
        JSON,
        Math,
        Object,
        Promise,
        SEGUIMIENTO_MAX_LOTES_POR_CICLO: opciones.maxLotes || 5,
        SEGUIMIENTO_TAMANO_LOTE: 100,
        SEGUIMIENTO_DEBOUNCE_ENVIO_MS: 3000,
        SEGUIMIENTO_INTERVALO_RESPALDO_MS: 15000,
        SEGUIMIENTO_PAUSA_ENTRE_CICLOS_MS: 1500,
        SEGUIMIENTO_BACKOFF_INICIAL_MS: 5000,
        SEGUIMIENTO_BACKOFF_MAXIMO_MS: 60000,
        HABILITAR_DIAGNOSTICO_ENVIO_SEGUIMIENTO: true,
        String,
        Uint8Array,
        console: consola,
        window: { crypto: crypto.webcrypto },
        checkConnection() {
            return opciones.conexion === false ? 'No network connection' : 'WiFi connection';
        },
        Obtener_dato_local(clave) {
            if (clave === 'uid') {
                return opciones.uuidDispositivo === undefined ? 'DISPOSITIVO-REAL-01' : opciones.uuidDispositivo;
            }
            if (clave === 'version_app') {
                return '5.0.3';
            }
            return null;
        },
        async listarSeguimientosConPosicionesPendientes() {
            return Object.keys(colas).filter(id => colas[id].length > 0);
        },
        async listarResumenSeguimientosConPosicionesPendientes() {
            return Object.keys(colas).filter(id => colas[id].length > 0).map(id => ({
                ID_UNICO_SEGUIMIENTO: id,
                CANTIDAD_PENDIENTE: colas[id].length,
                FECHA_CREACION_UTC_MAS_ANTIGUA: colas[id][0].FECHA_CREACION_UTC || null
            }));
        },
        async listarPosicionesSeguimientoPendientes(idSeguimiento, limite) {
            return (colas[idSeguimiento] || []).slice(0, limite);
        },
        async obtenerCredencialSeguimiento(idSeguimiento) {
            if (opciones.credencialFaltante === idSeguimiento) return null;
            return {
                ID_UNICO_SEGUIMIENTO: idSeguimiento,
                UUID_DISPOSITIVO: `DISPOSITIVO-${idSeguimiento.slice(0, 8)}`,
                TOKEN_SEGUIMIENTO: 'A'.repeat(43),
                ESTADO: 'ACTIVA'
            };
        },
        async marcarCredencialSeguimiento(idSeguimiento, estado) {
            credencialesMarcadas.push({ idSeguimiento, estado });
            return 1;
        },
        async eliminarPosicionesSeguimientoPorUuid(listaUuid) {
            const claves = new Set(listaUuid.map(uuid => uuid.toUpperCase()));
            Object.keys(colas).forEach(id => {
                colas[id] = colas[id].filter(posicion => {
                    if (claves.has(posicion.UUID_POSICION.toUpperCase())) {
                        eliminados.push(posicion.UUID_POSICION);
                        return false;
                    }
                    return true;
                });
            });
            return listaUuid.length;
        },
        async registrarIntentoEnvioPosiciones(listaUuid) {
            listaUuid.forEach(uuid => {
                intentos[uuid] = (intentos[uuid] || 0) + 1;
            });
            return listaUuid.length;
        },
        async enviarPosicionesSeguimientoWebService(entrada) {
            solicitudes.push(JSON.parse(JSON.stringify(entrada)));
            solicitudesActivas++;
            maximoSolicitudesActivas = Math.max(maximoSolicitudesActivas, solicitudesActivas);
            try {
                if (enviar) {
                    return await enviar(entrada, solicitudes.length);
                }
                return {
                    EXITO: true,
                    POSICIONES: entrada.POSICIONES.map(posicion => ({
                        UUID_POSICION: posicion.UUID_POSICION,
                        ESTADO: 'INSERTADA'
                    }))
                };
            } finally {
                solicitudesActivas--;
            }
        }
    };
    const repositorioSimulado = {
        listarSeguimientosConPosicionesPendientes: contexto.listarSeguimientosConPosicionesPendientes,
        listarResumenSeguimientosConPosicionesPendientes: contexto.listarResumenSeguimientosConPosicionesPendientes,
        listarPosicionesSeguimientoPendientes: contexto.listarPosicionesSeguimientoPendientes,
        eliminarPosicionesSeguimientoPorUuid: contexto.eliminarPosicionesSeguimientoPorUuid,
        registrarIntentoEnvioPosiciones: contexto.registrarIntentoEnvioPosiciones
        ,obtenerCredencialSeguimiento: contexto.obtenerCredencialSeguimiento
        ,marcarCredencialSeguimiento: contexto.marcarCredencialSeguimiento
    };

    vm.createContext(contexto);
    vm.runInContext(
        fs.readFileSync(path.join(raiz, 'www/js/Datos/Seguimiento.js'), 'utf8'),
        contexto,
        { filename: 'Seguimiento.js' }
    );
    Object.assign(contexto, repositorioSimulado);
    vm.runInContext(
        fs.readFileSync(path.join(raiz, 'www/js/Services/SeguimientoService.js'), 'utf8'),
        contexto,
        { filename: 'SeguimientoService.js' }
    );

    return {
        contexto,
        colas,
        eliminados,
        intentos,
        credencialesMarcadas,
        solicitudes,
        cambiarEnvio(nuevoEnvio) {
            enviar = nuevoEnvio;
        },
        maximoSolicitudesActivas() {
            return maximoSolicitudesActivas;
        }
    };
}

test('cola vacía, sin conexión y credencial faltante no realizan solicitudes', async () => {
    for (const opciones of [
        {},
        { conexion: false, colas: { [UUID_SEGUIMIENTO]: crearPosiciones(1) } },
        { credencialFaltante: UUID_SEGUIMIENTO, colas: { [UUID_SEGUIMIENTO]: crearPosiciones(1) } },
        { habilitado: false, colas: { [UUID_SEGUIMIENTO]: crearPosiciones(1) } }
    ]) {
        const escenario = crearEscenario(opciones);
        const resultado = await escenario.contexto.enviarPosicionesSeguimientoPendientes();
        assert.equal(resultado.OMITIDO, true);
        assert.equal(escenario.solicitudes.length, 0);
    }
});

test('un lote directo elimina INSERTADA y YA_EXISTIA sin alterar UUID ni fecha', async () => {
    const posiciones = crearPosiciones(2);
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: posiciones },
        enviar: async entrada => ({
            EXITO: true,
            POSICIONES: [
                { UUID_POSICION: entrada.POSICIONES[0].UUID_POSICION, ESTADO: 'INSERTADA' },
                { UUID_POSICION: entrada.POSICIONES[1].UUID_POSICION, ESTADO: 'YA_EXISTIA' }
            ]
        })
    });

    const resultado = await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.equal(resultado.POSICIONES_CONFIRMADAS, 2);
    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 0);
    assert.equal(escenario.solicitudes[0].UUID_DISPOSITIVO, 'DISPOSITIVO-11111111');
    assert.equal(escenario.solicitudes[0].TOKEN_SEGUIMIENTO, 'A'.repeat(43));
    assert.equal(escenario.solicitudes[0].VERSION_APP, '5.0.3');
    assert.equal(escenario.solicitudes[0].POSICIONES[0].UUID_POSICION, posiciones[0].UUID_POSICION);
    assert.equal(escenario.solicitudes[0].POSICIONES[0].FECHA_DISPOSITIVO_UTC, posiciones[0].FECHA_DISPOSITIVO_UTC);
});

test('más de 100 posiciones produce lotes secuenciales de máximo 100', async () => {
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: crearPosiciones(205) },
        enviar: async entrada => {
            await Promise.resolve();
            return {
                EXITO: true,
                POSICIONES: entrada.POSICIONES.map(posicion => ({
                    UUID_POSICION: posicion.UUID_POSICION,
                    ESTADO: 'INSERTADA'
                }))
            };
        }
    });

    await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.deepEqual(escenario.solicitudes.map(solicitud => solicitud.POSICIONES.length), [100, 100, 5]);
    assert.equal(escenario.maximoSolicitudesActivas(), 1);
    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 0);
});

test('procesa seguimientos distintos secuencialmente', async () => {
    const escenario = crearEscenario({
        colas: {
            [UUID_SEGUIMIENTO]: crearPosiciones(1, UUID_SEGUIMIENTO, 1),
            [UUID_SEGUIMIENTO_2]: crearPosiciones(1, UUID_SEGUIMIENTO_2, 2)
        }
    });

    await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.deepEqual(
        escenario.solicitudes.map(solicitud => solicitud.ID_UNICO_SEGUIMIENTO),
        [UUID_SEGUIMIENTO, UUID_SEGUIMIENTO_2]
    );
    assert.equal(escenario.maximoSolicitudesActivas(), 1);
});

test('respuesta parcial elimina solo confirmadas y registra omitidas', async () => {
    const posiciones = crearPosiciones(3);
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: posiciones },
        enviar: async entrada => ({
            EXITO: true,
            POSICIONES: [{ UUID_POSICION: entrada.POSICIONES[1].UUID_POSICION, ESTADO: 'INSERTADA' }]
        })
    });

    await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.deepEqual(escenario.eliminados, [posiciones[1].UUID_POSICION]);
    assert.deepEqual(
        escenario.colas[UUID_SEGUIMIENTO].map(posicion => posicion.UUID_POSICION),
        [posiciones[0].UUID_POSICION, posiciones[2].UUID_POSICION]
    );
    assert.equal(escenario.intentos[posiciones[0].UUID_POSICION], 1);
    assert.equal(escenario.intentos[posiciones[2].UUID_POSICION], 1);
});

test('UUID desconocido se ignora y no elimina posiciones locales', async () => {
    const posiciones = crearPosiciones(1);
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: posiciones },
        enviar: async () => ({
            EXITO: true,
            POSICIONES: [{ UUID_POSICION: uuidPosicion(999999), ESTADO: 'INSERTADA' }]
        })
    });

    await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.equal(escenario.eliminados.length, 0);
    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 1);
    assert.equal(escenario.intentos[posiciones[0].UUID_POSICION], 1);
});

test('UUID duplicado o EXITO falso rechaza la respuesta completa', async () => {
    for (const respuesta of [
        entrada => ({
            EXITO: true,
            POSICIONES: [
                { UUID_POSICION: entrada.POSICIONES[0].UUID_POSICION, ESTADO: 'INSERTADA' },
                { UUID_POSICION: entrada.POSICIONES[0].UUID_POSICION, ESTADO: 'YA_EXISTIA' }
            ]
        }),
        () => ({ EXITO: false, POSICIONES: [] })
    ]) {
        const posiciones = crearPosiciones(1);
        const escenario = crearEscenario({
            colas: { [UUID_SEGUIMIENTO]: posiciones },
            enviar: async entrada => respuesta(entrada)
        });

        await escenario.contexto.enviarPosicionesSeguimientoPendientes();
        assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 1);
        assert.equal(escenario.intentos[posiciones[0].UUID_POSICION], 1);
    }
});

test('timeout conserva el lote e incrementa sus intentos', async () => {
    const posiciones = crearPosiciones(2);
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: posiciones },
        enviar: async () => {
            const error = new Error('timeout');
            error.code = 'ECONNABORTED';
            throw error;
        }
    });

    await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 2);
    assert.equal(escenario.intentos[posiciones[0].UUID_POSICION], 1);
    assert.equal(escenario.intentos[posiciones[1].UUID_POSICION], 1);
});

test('dos ejecuciones simultáneas mantienen una sola solicitud activa', async () => {
    let liberar;
    const respuestaPendiente = new Promise(resolve => { liberar = resolve; });
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: crearPosiciones(1) },
        enviar: async () => respuestaPendiente
    });

    const primerEnvio = escenario.contexto.enviarPosicionesSeguimientoPendientes();
    await new Promise(resolve => setImmediate(resolve));
    const segundoResultado = await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.equal(segundoResultado.MOTIVO, 'ENVIO_EN_CURSO');
    assert.equal(escenario.solicitudes.length, 1);
    liberar({
        EXITO: true,
        POSICIONES: [{ UUID_POSICION: uuidPosicion(1), ESTADO: 'INSERTADA' }]
    });
    await primerEnvio;
});

test('acepta respuesta directa y envoltorio ASMX d como objeto o JSON', async () => {
    for (const envolver of [
        valor => valor,
        valor => ({ d: valor }),
        valor => ({ d: JSON.stringify(valor) })
    ]) {
        const escenario = crearEscenario({
            colas: { [UUID_SEGUIMIENTO]: crearPosiciones(1) },
            enviar: async entrada => envolver({
                EXITO: true,
                POSICIONES: [{ UUID_POSICION: entrada.POSICIONES[0].UUID_POSICION, ESTADO: 'INSERTADA' }]
            })
        });

        await escenario.contexto.enviarPosicionesSeguimientoPendientes();
        assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 0);
    }
});

test('respeta el máximo de lotes configurado por ciclo', async () => {
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: crearPosiciones(601) },
        maxLotes: 5
    });

    const resultado = await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.equal(resultado.LOTES_ENVIADOS, 5);
    assert.equal(escenario.solicitudes.length, 5);
    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 101);
});

test('un error libera el bloqueo y permite reiniciar el envío', async () => {
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: crearPosiciones(1) },
        enviar: async () => { throw new Error('fallo temporal'); }
    });

    await escenario.contexto.enviarPosicionesSeguimientoPendientes();
    escenario.cambiarEnvio(async entrada => ({
        EXITO: true,
        POSICIONES: [{ UUID_POSICION: entrada.POSICIONES[0].UUID_POSICION, ESTADO: 'INSERTADA' }]
    }));
    await escenario.contexto.enviarPosicionesSeguimientoPendientes();

    assert.equal(escenario.solicitudes.length, 2);
    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 0);
});

test('178 posiciones se drenan en lotes 100 y 78 con credencial técnica', async () => {
    const escenario = crearEscenario({
        colas: { [UUID_SEGUIMIENTO]: crearPosiciones(178) }
    });
    await escenario.contexto.enviarPosicionesSeguimientoPendientes();
    assert.deepEqual(escenario.solicitudes.map(item => item.POSICIONES.length), [100, 78]);
    assert.ok(escenario.solicitudes.every(item => item.TOKEN_SEGUIMIENTO === 'A'.repeat(43)));
    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 0);
});

test('credencial faltante suspende solo su seguimiento y conserva posiciones', async () => {
    const escenario = crearEscenario({
        credencialFaltante: UUID_SEGUIMIENTO,
        colas: {
            [UUID_SEGUIMIENTO]: crearPosiciones(2, UUID_SEGUIMIENTO),
            [UUID_SEGUIMIENTO_2]: crearPosiciones(2, UUID_SEGUIMIENTO_2, 20)
        }
    });
    const resultado = await escenario.contexto.enviarPosicionesSeguimientoPendientes();
    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 2);
    assert.equal(escenario.colas[UUID_SEGUIMIENTO_2].length, 0);
    assert.deepEqual(escenario.solicitudes.map(item => item.ID_UNICO_SEGUIMIENTO), [UUID_SEGUIMIENTO_2]);
    assert.equal(resultado.ERRORES, 0);
    assert.equal(resultado.SEGUIMIENTOS_SUSPENDIDOS, 1);
});

test('credencial rechazada bloquea solo su seguimiento y continúa con otro', async () => {
    const escenario = crearEscenario({
        colas: {
            [UUID_SEGUIMIENTO]: crearPosiciones(1, UUID_SEGUIMIENTO),
            [UUID_SEGUIMIENTO_2]: crearPosiciones(1, UUID_SEGUIMIENTO_2, 30)
        },
        enviar: async entrada => {
            if (entrada.ID_UNICO_SEGUIMIENTO === UUID_SEGUIMIENTO) {
                return { EXITO: false, CODIGO: 'CREDENCIAL_NO_AUTORIZADA', POSICIONES: [] };
            }
            return {
                EXITO: true,
                POSICIONES: entrada.POSICIONES.map(item => ({
                    UUID_POSICION: item.UUID_POSICION,
                    ESTADO: 'INSERTADA'
                }))
            };
        }
    });
    const resultado = await escenario.contexto.enviarPosicionesSeguimientoPendientes();
    assert.equal(escenario.colas[UUID_SEGUIMIENTO].length, 1);
    assert.equal(escenario.colas[UUID_SEGUIMIENTO_2].length, 0);
    assert.deepEqual(escenario.credencialesMarcadas, [
        { idSeguimiento: UUID_SEGUIMIENTO, estado: 'BLOQUEADA' }
    ]);
    assert.equal(resultado.ERRORES, 0);
});

test('wrapper HTTP existente envía POST JSON con timeout al ASMX', async () => {
    let solicitud;
    const contexto = {
        Error,
        Promise,
        SEGUIMIENTO_TIMEOUT_HTTP_MS: 15000,
        axios: {
            post(url, cuerpo, configuracion) {
                solicitud = { url, cuerpo, configuracion };
                return Promise.resolve({ data: { d: { EXITO: true } } });
            }
        },
        DATOS_seleccionar_Parametro_movil_por_nombre(empresa, nombre, callback) {
            callback({ PAG_VALOR: 'https://servidor/aplicacion' });
        }
    };
    vm.createContext(contexto);
    vm.runInContext(
        fs.readFileSync(path.join(raiz, 'www/js/WebServices.js'), 'utf8'),
        contexto,
        { filename: 'WebServices.js' }
    );

    await contexto.enviarPosicionesSeguimientoWebService({ ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO });

    assert.equal(
        solicitud.url,
        'https://servidor/aplicacion/Webserviceproveedor.asmx/Recibe_Posiciones_Seguimiento'
    );
    assert.equal(solicitud.cuerpo.entrada.ID_UNICO_SEGUIMIENTO, UUID_SEGUIMIENTO);
    assert.equal(solicitud.configuracion.timeout, 15000);
    assert.equal(solicitud.configuracion.headers['Content-Type'], 'application/json; charset=utf-8');
});
