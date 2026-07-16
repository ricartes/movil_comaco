const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

const RAIZ = path.resolve(__dirname, '../..');

function filasCordova(filas) {
    return {
        length: filas.length,
        item(indice) {
            return filas[indice];
        }
    };
}

function crearAdaptadorCordova(db) {
    return {
        openDatabase() {
            return {
                transaction(accion, alError, alCompletar) {
                    try {
                        db.exec('BEGIN TRANSACTION');
                        const transaccion = {
                            executeSql(sql, parametros, alExito, alErrorSql) {
                                const valores = Array.isArray(parametros) ? parametros : [];
                                try {
                                    const sentencia = db.prepare(sql);
                                    const esConsulta = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);
                                    let resultado;

                                    if (esConsulta) {
                                        resultado = {
                                            rows: filasCordova(sentencia.all(...valores)),
                                            rowsAffected: 0
                                        };
                                    } else {
                                        const ejecucion = sentencia.run(...valores);
                                        resultado = {
                                            rows: filasCordova([]),
                                            rowsAffected: Number(ejecucion.changes),
                                            insertId: Number(ejecucion.lastInsertRowid)
                                        };
                                    }

                                    if (typeof alExito === 'function') {
                                        alExito(transaccion, resultado);
                                    }
                                } catch (error) {
                                    if (typeof alErrorSql === 'function') {
                                        alErrorSql(transaccion, error);
                                    }
                                    throw error;
                                }
                            }
                        };

                        accion(transaccion);
                        db.exec('COMMIT');
                        if (typeof alCompletar === 'function') {
                            alCompletar();
                        }
                    } catch (error) {
                        if (db.isTransaction) {
                            db.exec('ROLLBACK');
                        }
                        if (typeof alError === 'function') {
                            alError(error);
                        }
                    }
                }
            };
        }
    };
}

function ejecutarScript(contexto, rutaRelativa) {
    const ruta = path.join(RAIZ, rutaRelativa);
    vm.runInContext(fs.readFileSync(ruta, 'utf8'), contexto, { filename: rutaRelativa });
}

function crearRuntime(opciones) {
    const db = new DatabaseSync(opciones.rutaDb);
    const solicitudes = [];
    const respuestas = [];
    const mensajes = [];
    const post = opciones.post || (async function () {
        throw new Error('La prueba no configuró el transporte HTTP.');
    });
    const listeners = new Map();

    const contexto = {
        AbortController,
        Array,
        Date,
        Error,
        HABILITAR_ENVIO_SEGUIMIENTO_NUEVO: true,
        JSON,
        Math,
        Number,
        Object,
        Promise,
        SEGUIMIENTO_MAX_LOTES_POR_CICLO: 5,
        SEGUIMIENTO_TAMANO_LOTE: 100,
        SEGUIMIENTO_DEBOUNCE_ENVIO_MS: 3000,
        SEGUIMIENTO_INTERVALO_RESPALDO_MS: 15000,
        SEGUIMIENTO_PAUSA_ENTRE_CICLOS_MS: 1500,
        SEGUIMIENTO_BACKOFF_INICIAL_MS: 5000,
        SEGUIMIENTO_BACKOFF_MAXIMO_MS: 60000,
        HABILITAR_DIAGNOSTICO_ENVIO_SEGUIMIENTO: true,
        SEGUIMIENTO_TIMEOUT_HTTP_MS: opciones.timeoutMs || 15000,
        String,
        Uint8Array,
        clearTimeout,
        setTimeout,
        console: {
            log(...argumentos) { mensajes.push({ nivel: 'log', argumentos }); },
            warn(...argumentos) { mensajes.push({ nivel: 'warn', argumentos }); },
            error(...argumentos) { mensajes.push({ nivel: 'error', argumentos }); }
        },
        window: {
            crypto: crypto.webcrypto,
            sqlitePlugin: crearAdaptadorCordova(db)
        },
        document: {
            addEventListener(nombre, callback) { listeners.set(nombre, callback); },
            removeEventListener(nombre, callback) {
                if (listeners.get(nombre) === callback) listeners.delete(nombre);
            }
        },
        checkConnection() {
            return opciones.conectado === false ? 'No network connection' : 'WiFi connection';
        },
        Obtener_dato_local(clave) {
            if (clave === 'uid') {
                return opciones.uuidDispositivo || 'DISPOSITIVO-PRUEBA-01';
            }
            if (clave === 'version_app') {
                return opciones.versionApp || '5.0.3-TEST';
            }
            if (clave === 'user_activo') {
                return opciones.userActivo === undefined ? 'usuario-prueba' : opciones.userActivo;
            }
            return null;
        },
        DATOS_seleccionar_Parametro_movil_por_nombre(empresa, nombre, callback) {
            callback({ PAG_VALOR: opciones.urlBase || 'https://seguimiento.test' });
        },
        axios: {
            async post(url, cuerpo, configuracion) {
                const solicitud = {
                    url,
                    cuerpo: JSON.parse(JSON.stringify(cuerpo)),
                    configuracion: JSON.parse(JSON.stringify(configuracion || {})),
                    fechaInicioMs: Date.now(),
                    fechaFinMs: null
                };
                solicitudes.push(solicitud);
                const data = await post(url, cuerpo, configuracion || {});
                solicitud.fechaFinMs = Date.now();
                respuestas.push(JSON.parse(JSON.stringify(data)));
                return { data };
            }
        }
    };

    vm.createContext(contexto);
    ejecutarScript(contexto, 'www/js/Datos/Seguimiento.js');
    if (opciones.cargarEnvio) {
        ejecutarScript(contexto, 'www/js/WebServices.js');
        ejecutarScript(contexto, 'www/js/Services/SeguimientoService.js');
    }

    return {
        contexto,
        db,
        mensajes,
        respuestas,
        solicitudes,
        cerrar() {
            db.close();
        }
    };
}

module.exports = {
    crearRuntime
};
