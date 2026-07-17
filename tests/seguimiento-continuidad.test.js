const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {
    crearSqliteTemporal,
    limpiarSqliteTemporal
} = require('./helpers/seguimiento-procesos');
const {
    crearGpsTrackingRuntime,
    crearGuiaGps
} = require('./helpers/gps-tracking-runtime');

const raiz = path.resolve(__dirname, '..');

test('consulta técnica usa dispositivo y credencial sin depender de sesión interactiva', async () => {
    const fuente = fs.readFileSync(path.join(raiz, 'www/js/Datos/GDE.js'), 'utf8');
    const consultas = [];
    const filas = [
        {
            rowid: 44,
            ID_UNICO_MOVIL: 'GUIA-44',
            ID_UNICO_SEGUIMIENTO: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            GDE_ESTADO_MOVIL: 'E',
            GDE_CONFIRMA_INGRESO_PLANTA: 0
        },
        {
            rowid: 45,
            ID_UNICO_MOVIL: 'GUIA-45',
            ID_UNICO_SEGUIMIENTO: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            GDE_ESTADO_MOVIL: 'E',
            GDE_CONFIRMA_INGRESO_PLANTA: 0
        }
    ];
    const contexto = {
        Promise,
        CL_GDE: function CL_GDE() {},
        Obtener_dato_local(clave) {
            if (clave === 'uid') return 'DISPOSITIVO-TECNICO';
            if (clave === 'rut_activo') return null;
            return null;
        },
        window: {
            sqlitePlugin: {
                openDatabase() {
                    return {
                        transaction(operacion) {
                            operacion({
                                executeSql(sql, parametros, exito) {
                                    consultas.push({ sql, parametros });
                                    exito(null, {
                                        rows: {
                                            length: filas.length,
                                            item(indice) { return filas[indice]; }
                                        }
                                    });
                                }
                            });
                        }
                    };
                }
            }
        }
    };

    vm.createContext(contexto);
    vm.runInContext(fuente, contexto, { filename: 'GDE.js' });
    const resultado = await contexto.DATOS_seleccionarGuiasSeguimientoTecnicoActivas();

    assert.equal(resultado.length, 2);
    assert.deepEqual(Array.from(consultas[0].parametros), ['DISPOSITIVO-TECNICO']);
    assert.doesNotMatch(consultas[0].sql, /GDE_COD_DESPACHADOR|rut_activo/i);
    assert.match(consultas[0].sql, /C\.ESTADO = 'ACTIVA'/);
    assert.match(consultas[0].sql, /C\.UUID_DISPOSITIVO/);
    assert.match(consultas[0].sql, /NOT GLOB '\*\[\^0-9a-f\]\*'/);
});

test('confirmar logout abre login, detiene solo envío interactivo y reconcilia GPS', async () => {
    const principal = fs.readFileSync(path.join(raiz, 'www/js/Vistas/Principal.js'), 'utf8');
    const inicio = principal.indexOf('function logout()');
    const fin = principal.indexOf('async function ok_login', inicio);
    const fuenteLogout = principal.slice(inicio, fin);
    const locales = new Map([
        ['user_activo', 'USUARIO-PRUEBA'],
        ['rut_activo', '11-1'],
        ['empresa_activo', 'EMPRESA-1']
    ]);
    const llamadas = [];
    const errores = [];
    let confirmar;
    let resolverSolicitud;
    const solicitudRealizada = new Promise(function (resolve) {
        resolverSolicitud = resolve;
    });
    const contexto = {
        Promise,
        TipoAccionTypes: { CIERRE_SESION: 9 },
        console: {
            log() {},
            warn() {},
            error(...argumentos) { errores.push(argumentos); }
        },
        app: {
            dialog: {
                confirm(mensaje, titulo, callback) { confirmar = callback; }
            }
        },
        ls: { open() { llamadas.push('login'); } },
        Obtener_dato_local(clave) { return locales.get(clave); },
        Borrar_dato_local(clave) { locales.delete(clave); },
        detenerProgramadorEnvioDatos(motivo) { llamadas.push('interactivo:' + motivo); },
        async generarDataTrazabilidad() { throw new Error('trazabilidad simulada'); },
        async obtenerUbicacionEInsertarLog() {},
        async inicializarSeguimientoBootstrap() { llamadas.push('bootstrap'); },
        async reevaluarTrackingAhora() { llamadas.push('reconciliar'); return true; },
        solicitarEnvioSeguimiento(motivo, inmediato) {
            llamadas.push('tecnico:' + motivo + ':' + inmediato);
            resolverSolicitud();
        }
    };

    vm.createContext(contexto);
    vm.runInContext(fuenteLogout, contexto, { filename: 'Principal.logout.js' });
    contexto.logout();
    assert.doesNotThrow(function () { confirmar(); });
    await solicitudRealizada;
    await Promise.resolve();

    assert.equal(locales.has('user_activo'), false);
    assert.equal(locales.has('rut_activo'), false);
    assert.equal(locales.has('empresa_activo'), false);
    assert.deepEqual(llamadas, [
        'interactivo:logout',
        'login',
        'bootstrap',
        'reconciliar',
        'tecnico:logout:true'
    ]);
    assert.ok(errores.some(function (entrada) {
        return entrada[0] === '[LOGOUT][TRAZABILIDAD_ERROR]';
    }));
});

test('dos guías continúan generando posiciones después de eliminar la sesión', async () => {
    const temporal = crearSqliteTemporal('gfe-seguimiento-logout-captura-');
    const seguimiento44 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const seguimiento45 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const runtime = crearGpsTrackingRuntime({
        rutaDb: temporal.rutaDb,
        usuarioActivo: null,
        rutActivo: null,
        guiasPendientes: [
            crearGuiaGps('GUIA-44', seguimiento44),
            crearGuiaGps('GUIA-45', seguimiento45)
        ]
    });

    try {
        await runtime.inicializar();
        const resultado = await runtime.contexto.encolarCapturaGps({
            time: '2026-07-17T15:00:00.000Z',
            latitude: -33.45,
            longitude: -70.66,
            accuracy: 4,
            speed: 3,
            bearing: 90,
            altitude: 500,
            isFromMockProvider: false
        }, new Date('2026-07-17T15:00:00.000Z'));

        assert.equal(resultado.persistido, true);
        assert.equal((await runtime.posiciones(seguimiento44)).length, 1);
        assert.equal((await runtime.posiciones(seguimiento45)).length, 1);
    } finally {
        runtime.cerrar();
        limpiarSqliteTemporal(temporal);
    }
});

test('pipeline corregido no invoca acción 33 ni usa consulta interactiva para GPS', () => {
    const archivos = [
        'www/js/Vistas/Principal.js',
        'www/js/Helper/gpsTracking.js',
        'www/js/Services/SeguimientoBootstrap.js'
    ].map(function (ruta) {
        return fs.readFileSync(path.join(raiz, ruta), 'utf8');
    }).join('\n');

    assert.doesNotMatch(archivos, /TipoAccionTypes\.(?:ACCION_)?33|accion\s*[:=]\s*33/i);
    assert.doesNotMatch(archivos, /DATOS_seleccionarGdeProveedorConfirmadas/);
});
