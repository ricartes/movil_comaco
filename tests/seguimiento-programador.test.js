const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const servicio = fs.readFileSync(path.join(raiz, 'www/js/Services/SeguimientoService.js'), 'utf8');
const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const ID_C = '33333333-3333-4333-8333-333333333333';

function uuid(numero) {
    return `aaaaaaaa-aaaa-4aaa-8aaa-${String(numero).padStart(12, '0')}`;
}

function crearReloj() {
    let ahora = Date.parse('2026-07-16T12:00:00.000Z');
    let siguienteId = 1;
    const tareas = new Map();

    class FechaPrueba extends Date {
        constructor(...argumentos) {
            super(argumentos.length === 0 ? ahora : argumentos[0]);
        }
        static now() { return ahora; }
    }

    async function estabilizar() {
        for (let indice = 0; indice < 250; indice++) {
            await Promise.resolve();
        }
    }

    async function avanzar(milisegundos) {
        const destino = ahora + milisegundos;
        while (true) {
            const pendientes = Array.from(tareas.entries())
                .filter(([, tarea]) => tarea.fecha <= destino)
                .sort((a, b) => a[1].fecha - b[1].fecha || a[0] - b[0]);
            if (pendientes.length === 0) {
                break;
            }
            const [id, tarea] = pendientes[0];
            tareas.delete(id);
            ahora = tarea.fecha;
            tarea.callback();
            await estabilizar();
        }
        ahora = destino;
        await estabilizar();
    }

    return {
        FechaPrueba,
        ahora: () => ahora,
        avanzar,
        setTimeout(callback, demora) {
            const id = siguienteId++;
            tareas.set(id, { callback, fecha: ahora + Math.max(0, Number(demora) || 0) });
            return id;
        },
        clearTimeout(id) { tareas.delete(id); },
        cantidadTareas: () => tareas.size
    };
}

function crearEscenario(opciones = {}) {
    const reloj = crearReloj();
    const colas = {};
    const solicitudes = [];
    const intentos = [];
    const listeners = new Map();
    let conectado = opciones.conectado !== false;
    let activoHttp = 0;
    let maximoHttp = 0;
    let respuestaHttp = opciones.respuestaHttp || null;

    function agregar(idSeguimiento, cantidad, inicio = 1) {
        if (!colas[idSeguimiento]) {
            colas[idSeguimiento] = [];
        }
        for (let indice = 0; indice < cantidad; indice++) {
            const numero = inicio + indice;
            colas[idSeguimiento].push({
                ID: numero,
                UUID_POSICION: uuid(numero),
                ID_UNICO_SEGUIMIENTO: idSeguimiento,
                FECHA_DISPOSITIVO_UTC: new reloj.FechaPrueba(reloj.ahora() + numero).toISOString(),
                FECHA_CREACION_UTC: new reloj.FechaPrueba(reloj.ahora() + numero).toISOString(),
                LATITUD: -33.45,
                LONGITUD: -70.66,
                PRECISION_METROS: 5,
                VELOCIDAD_MPS: null,
                RUMBO_GRADOS: null,
                ALTITUD_METROS: null,
                ES_UBICACION_SIMULADA: 0,
                ORIGEN_CAPTURA: 'GPS'
            });
        }
    }

    const contexto = {
        Array,
        Date: reloj.FechaPrueba,
        Error,
        HABILITAR_DIAGNOSTICO_ENVIO_SEGUIMIENTO: true,
        HABILITAR_ENVIO_SEGUIMIENTO_NUEVO: true,
        JSON,
        Math,
        Number,
        Object,
        Promise,
        SEGUIMIENTO_BACKOFF_INICIAL_MS: 5000,
        SEGUIMIENTO_BACKOFF_MAXIMO_MS: 60000,
        SEGUIMIENTO_DEBOUNCE_ENVIO_MS: 3000,
        SEGUIMIENTO_INTERVALO_RESPALDO_MS: 15000,
        SEGUIMIENTO_MAX_LOTES_POR_CICLO: 5,
        SEGUIMIENTO_PAUSA_ENTRE_CICLOS_MS: 1500,
        SEGUIMIENTO_TAMANO_LOTE: 100,
        String,
        clearTimeout: reloj.clearTimeout,
        setTimeout: reloj.setTimeout,
        console: { log() {}, warn() {}, error() {} },
        document: {
            addEventListener(nombre, callback) { listeners.set(nombre, callback); },
            removeEventListener(nombre, callback) {
                if (listeners.get(nombre) === callback) listeners.delete(nombre);
            }
        },
        checkConnection() { return conectado ? 'WiFi connection' : 'No network connection'; },
        Obtener_dato_local(clave) {
            if (clave === 'uid') return 'DISPOSITIVO-PRUEBA';
            if (clave === 'version_app') return '5.0.3';
            if (clave === 'user_activo') return opciones.sinSesion ? null : 'usuario';
            return null;
        },
        SEGUIMIENTO_uuidObligatorio(valor) {
            const texto = String(valor).trim();
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(texto)) {
                throw new Error('UUID inválido');
            }
            return texto;
        },
        SEGUIMIENTO_fechaUtcObligatoria(valor) {
            if (typeof valor !== 'string' || !valor.endsWith('Z') || !Number.isFinite(Date.parse(valor))) {
                throw new Error('Fecha inválida');
            }
            return valor;
        },
        async listarSeguimientosConPosicionesPendientes() {
            return Object.keys(colas).filter(id => colas[id].length > 0);
        },
        async listarResumenSeguimientosConPosicionesPendientes() {
            return Object.keys(colas).filter(id => colas[id].length > 0).map(id => ({
                ID_UNICO_SEGUIMIENTO: id,
                CANTIDAD_PENDIENTE: colas[id].length,
                FECHA_CREACION_UTC_MAS_ANTIGUA: colas[id][0].FECHA_CREACION_UTC
            })).sort((a, b) => a.FECHA_CREACION_UTC_MAS_ANTIGUA.localeCompare(b.FECHA_CREACION_UTC_MAS_ANTIGUA));
        },
        async listarPosicionesSeguimientoPendientes(idSeguimiento, limite) {
            return (colas[idSeguimiento] || []).slice(0, limite);
        },
        async obtenerCredencialSeguimiento(idSeguimiento) {
            return {
                ID_UNICO_SEGUIMIENTO: idSeguimiento,
                UUID_DISPOSITIVO: `DISPOSITIVO-${idSeguimiento.slice(0, 8)}`,
                TOKEN_SEGUIMIENTO: 'A'.repeat(43),
                ESTADO: 'ACTIVA'
            };
        },
        async marcarCredencialSeguimiento() { return 1; },
        async eliminarPosicionesSeguimientoPorUuid(lista) {
            const claves = new Set(lista.map(item => item.toUpperCase()));
            Object.keys(colas).forEach(id => {
                colas[id] = colas[id].filter(item => !claves.has(item.UUID_POSICION.toUpperCase()));
            });
        },
        async registrarIntentoEnvioPosiciones(lista) { intentos.push(lista.slice()); },
        async enviarPosicionesSeguimientoWebService(entrada) {
            activoHttp++;
            maximoHttp = Math.max(maximoHttp, activoHttp);
            solicitudes.push({
                ID_UNICO_SEGUIMIENTO: entrada.ID_UNICO_SEGUIMIENTO,
                CANTIDAD: entrada.POSICIONES.length,
                FECHA_MS: reloj.ahora()
            });
            try {
                if (respuestaHttp) return await respuestaHttp(entrada, solicitudes.length);
                return {
                    EXITO: true,
                    POSICIONES: entrada.POSICIONES.map(item => ({
                        UUID_POSICION: item.UUID_POSICION,
                        ESTADO: 'INSERTADA'
                    }))
                };
            } finally {
                activoHttp--;
            }
        }
    };

    vm.createContext(contexto);
    vm.runInContext(servicio, contexto, { filename: 'SeguimientoService.js' });
    return {
        contexto,
        reloj,
        colas,
        solicitudes,
        intentos,
        agregar,
        iniciar() { return contexto.inicializarProgramadorEnvioSeguimiento(); },
        solicitar(motivo, inmediato) { return contexto.solicitarEnvioSeguimiento(motivo, inmediato); },
        detener() { contexto.detenerProgramadorEnvioSeguimiento(); },
        online() { const listener = listeners.get('online'); if (listener) listener(); },
        listenerCount: () => listeners.size,
        conectar(valor) { conectado = valor; },
        responder(funcion) { respuestaHttp = funcion; },
        maximoHttp: () => maximoHttp
    };
}

test('debounce trailing consolida diez capturas y envía a los tres segundos de la última', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 10);
    escenario.iniciar();
    for (let indice = 0; indice < 10; indice++) {
        escenario.solicitar('nueva_captura', false);
        if (indice < 9) await escenario.reloj.avanzar(100);
    }
    await escenario.reloj.avanzar(2999);
    assert.equal(escenario.solicitudes.length, 0);
    await escenario.reloj.avanzar(1);
    assert.equal(escenario.solicitudes.length, 1);
    assert.equal(escenario.solicitudes[0].CANTIDAD, 10);
});

test('inicio, resume y recuperación de conexión tienen ejecución inmediata', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 1);
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    assert.equal(escenario.solicitudes.length, 1);

    escenario.agregar(ID_A, 1, 20);
    escenario.conectar(false);
    escenario.solicitar('nueva_captura', false);
    await escenario.reloj.avanzar(3000);
    assert.equal(escenario.solicitudes.length, 1);
    escenario.conectar(true);
    escenario.online();
    await escenario.reloj.avanzar(0);
    assert.equal(escenario.solicitudes.length, 2);
});

test('el respaldo de 15 segundos drena pendientes sin solicitud previa', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 1);
    escenario.iniciar();
    await escenario.reloj.avanzar(14999);
    assert.equal(escenario.solicitudes.length, 0);
    await escenario.reloj.avanzar(1);
    assert.equal(escenario.solicitudes.length, 1);
});

test('round-robin sirve A, B y C antes de volver a una cola grande', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 250, 1);
    escenario.agregar(ID_B, 1, 1000);
    escenario.agregar(ID_C, 1, 2000);
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    assert.deepEqual(
        escenario.solicitudes.map(item => item.ID_UNICO_SEGUIMIENTO),
        [ID_A, ID_B, ID_C, ID_A, ID_A]
    );
    assert.equal(escenario.maximoHttp(), 1);
    const lote = escenario.contexto.obtenerDiagnosticoEnvioSeguimiento().EVENTOS.find(item => item.TIPO === 'LOTE');
    for (const campo of ['MOTIVO', 'CANTIDAD_ENVIADA', 'EDAD_POSICION_MAS_ANTIGUA_MS',
        'DEMORA_DESDE_CREACION_HASTA_POST_MS', 'DEMORA_HASTA_POST_MS', 'DURACION_HTTP_MS',
        'INSERTADAS', 'YA_EXISTIAN', 'OMITIDAS', 'CANTIDAD_RESTANTE', 'RESULTADO']) {
        assert.ok(Object.prototype.hasOwnProperty.call(lote, campo), campo);
    }
});

test('cola de 700 usa cinco lotes, pausa 1,5 segundos y termina en siete lotes', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 700);
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    assert.equal(escenario.solicitudes.length, 5);
    assert.equal(escenario.contexto.obtenerDiagnosticoEnvioSeguimiento().TIPO_REINTENTO, 'CONTINUACION');
    await escenario.reloj.avanzar(1499);
    assert.equal(escenario.solicitudes.length, 5);
    await escenario.reloj.avanzar(1);
    assert.equal(escenario.solicitudes.length, 7);
    assert.ok(escenario.solicitudes.every(item => item.CANTIDAD <= 100));
    assert.equal(escenario.colas[ID_A].length, 0);
});

test('solicitudes durante HTTP se coalescen y nunca solapan ciclos', async () => {
    const escenario = crearEscenario();
    let liberar;
    escenario.agregar(ID_A, 1);
    escenario.responder(entrada => new Promise(resolve => {
        liberar = () => resolve({
            EXITO: true,
            POSICIONES: entrada.POSICIONES.map(item => ({ UUID_POSICION: item.UUID_POSICION, ESTADO: 'INSERTADA' }))
        });
    }));
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    escenario.agregar(ID_A, 1, 50);
    escenario.solicitar('nueva_captura', true);
    escenario.solicitar('conexion_recuperada', true);
    assert.equal(escenario.solicitudes.length, 1);
    liberar();
    await escenario.reloj.avanzar(0);
    assert.equal(escenario.solicitudes.length, 2);
    assert.equal(escenario.maximoHttp(), 1);
});

test('fallos aplican backoff exponencial 5, 10, 20, 40 y tope 60 segundos', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 1);
    escenario.responder(async () => { throw new Error('HTTP'); });
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    for (const demora of [5000, 10000, 20000, 40000, 60000, 60000]) {
        await escenario.reloj.avanzar(demora);
    }
    const diferencias = escenario.solicitudes.slice(1).map((item, indice) =>
        item.FECHA_MS - escenario.solicitudes[indice].FECHA_MS
    );
    assert.deepEqual(diferencias, [5000, 10000, 20000, 40000, 60000, 60000]);
    assert.equal(escenario.contexto.obtenerDiagnosticoEnvioSeguimiento().BACKOFF_ACTUAL_MS, 60000);
});

test('un ciclo exitoso restablece el backoff inicial', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 1);
    let intento = 0;
    escenario.responder(async entrada => {
        intento++;
        if (intento === 1) throw new Error('temporal');
        return { EXITO: true, POSICIONES: entrada.POSICIONES.map(item => ({ UUID_POSICION: item.UUID_POSICION, ESTADO: 'INSERTADA' })) };
    });
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    await escenario.reloj.avanzar(5000);
    assert.equal(escenario.solicitudes.length, 2);
    assert.equal(escenario.contexto.obtenerDiagnosticoEnvioSeguimiento().BACKOFF_ACTUAL_MS, 5000);
});

test('seguimiento sin credencial no activa backoff global', () => {
    const escenario = crearEscenario();
    const resumen = escenario.contexto.SEGUIMIENTO_resultadoCiclo();
    resumen.OMITIDO = true;
    resumen.MOTIVO = 'SEGUIMIENTO_SIN_CREDENCIAL';
    resumen.SEGUIMIENTOS_SUSPENDIDOS = 1;

    assert.equal(escenario.contexto.SEGUIMIENTO_resultadoTexto(resumen), 'EXITO');
});

test('una respuesta parcial con progreso conserva omitidas y continúa tras 1,5 segundos', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 2);
    escenario.responder(async entrada => ({
        EXITO: true,
        POSICIONES: [{ UUID_POSICION: entrada.POSICIONES[0].UUID_POSICION, ESTADO: 'INSERTADA' }]
    }));
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    assert.equal(escenario.solicitudes.length, 1);
    assert.equal(escenario.colas[ID_A].length, 1);
    await escenario.reloj.avanzar(1499);
    assert.equal(escenario.solicitudes.length, 1);
    await escenario.reloj.avanzar(1);
    assert.equal(escenario.solicitudes.length, 2);
});

test('offline, debounce y respaldo no incrementan intentos sin POST real', async () => {
    const escenario = crearEscenario({ conectado: false });
    escenario.agregar(ID_A, 1);
    escenario.iniciar();
    escenario.solicitar('nueva_captura', false);
    await escenario.reloj.avanzar(15000);
    assert.equal(escenario.solicitudes.length, 0);
    assert.equal(escenario.intentos.length, 0);
});

test('pérdida de conexión entre lotes detiene el ciclo y conserva las filas restantes', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 250);
    escenario.responder(async entrada => {
        escenario.conectar(false);
        return {
            EXITO: true,
            POSICIONES: entrada.POSICIONES.map(item => ({ UUID_POSICION: item.UUID_POSICION, ESTADO: 'INSERTADA' }))
        };
    });
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    assert.equal(escenario.solicitudes.length, 1);
    assert.equal(escenario.colas[ID_A].length, 150);
    const ciclos = escenario.contexto.obtenerDiagnosticoEnvioSeguimiento().EVENTOS.filter(item => item.TIPO === 'CICLO');
    assert.equal(ciclos.at(-1).RESULTADO, 'OFFLINE');
});

test('HTTP 500 conserva filas y registra un único intento real', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 2);
    escenario.responder(async () => { throw new Error('HTTP 500'); });
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    assert.equal(escenario.colas[ID_A].length, 2);
    assert.equal(escenario.intentos.length, 1);
    assert.equal(escenario.solicitudes.length, 1);
});

test('una fila inválida rechazada antes del POST no incrementa INTENTOS_ENVIO', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 1);
    escenario.colas[ID_A][0].FECHA_DISPOSITIVO_UTC = 'fecha-invalida';
    escenario.iniciar();
    escenario.solicitar('inicio_o_resume', true);
    await escenario.reloj.avanzar(0);
    assert.equal(escenario.solicitudes.length, 0);
    assert.equal(escenario.intentos.length, 0);
    assert.equal(escenario.colas[ID_A].length, 1);
});

test('inicialización es idempotente y detener cancela timers y listener online', async () => {
    const escenario = crearEscenario();
    escenario.agregar(ID_A, 1);
    assert.equal(escenario.iniciar(), true);
    assert.equal(escenario.iniciar(), false);
    assert.equal(escenario.listenerCount(), 1);
    escenario.solicitar('nueva_captura', false);
    escenario.detener();
    assert.equal(escenario.listenerCount(), 0);
    await escenario.reloj.avanzar(60000);
    assert.equal(escenario.solicitudes.length, 0);
    const estado = escenario.contexto.obtenerDiagnosticoEnvioSeguimiento();
    assert.equal(estado.DEBOUNCE_PROGRAMADO, false);
    assert.equal(estado.RESPALDO_PROGRAMADO, false);
    assert.equal(estado.REINTENTO_PROGRAMADO, false);
});

test('diagnóstico conserva máximo 50 eventos y no expone UUID, coordenadas ni dispositivo', async () => {
    const escenario = crearEscenario();
    escenario.iniciar();
    for (let indice = 0; indice < 55; indice++) {
        escenario.solicitar('inicio_o_resume', true);
        await escenario.reloj.avanzar(0);
    }
    const diagnostico = escenario.contexto.obtenerDiagnosticoEnvioSeguimiento();
    assert.equal(diagnostico.EVENTOS.length, 50);
    const serializado = JSON.stringify(diagnostico);
    assert.doesNotMatch(serializado, /11111111-|DISPOSITIVO-PRUEBA|-33\.45|-70\.66/);
    const ciclo = diagnostico.EVENTOS.find(item => item.TIPO === 'CICLO');
    for (const campo of ['MOTIVO', 'DEMORA_DESDE_SOLICITUD_MS', 'INICIO_UTC', 'FIN_UTC', 'DURACION_MS',
        'CONEXION_INICIAL', 'PENDIENTES_ANTES', 'PENDIENTES_DESPUES', 'LOTES_ENVIADOS',
        'POSICIONES_CONFIRMADAS', 'RESULTADO']) {
        assert.ok(Object.prototype.hasOwnProperty.call(ciclo, campo), campo);
    }
});

test('el ciclo de trazabilidad no dispara el pipeline de seguimiento GPS', () => {
    const principal = fs.readFileSync(path.join(raiz, 'www/js/Vistas/Principal.js'), 'utf8');
    const cuerpo = principal.slice(
        principal.indexOf('async function cicloEnvioTrazabilidad'),
        principal.indexOf('function EnvioAutomatico_segundo_plano')
    );
    assert.doesNotMatch(
        cuerpo,
        /solicitarEnvioSeguimiento|enviarPosicionesSeguimientoWebService|enviarPosicionesSeguimientoPendientes/
    );
});

test('gpsTracking avisa sólo después del commit y no realiza HTTP directo', () => {
    const gps = fs.readFileSync(path.join(raiz, 'www/js/Helper/gpsTracking.js'), 'utf8');
    const inicio = gps.indexOf('async function registrarCapturaSeguimiento');
    const fin = gps.indexOf('// Validar si la ubicación es antigua', inicio);
    const cuerpo = gps.slice(inicio, fin);
    const indiceCommit = cuerpo.indexOf('await insertarPosicionesSeguimientoPendientes');
    const indiceSolicitud = cuerpo.indexOf('solicitarEnvioSeguimiento("nueva_captura", false)');
    assert.ok(indiceCommit >= 0 && indiceSolicitud > indiceCommit);
    assert.doesNotMatch(cuerpo, /enviarPosicionesSeguimientoWebService|enviarPosicionesSeguimientoPendientes/);
});
