// ================== DATOS SEGUIMIENTO GPS ==================

var SEGUIMIENTO_SQL_CREAR_POSICIONES_PENDIENTES = `CREATE TABLE IF NOT EXISTS SEGUIMIENTO_POSICION_PENDIENTE (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    UUID_POSICION TEXT NOT NULL UNIQUE,
    ID_UNICO_MOVIL_GDE TEXT NOT NULL,
    ID_UNICO_SEGUIMIENTO TEXT NOT NULL,
    SECUENCIA_LOCAL INTEGER NULL,
    FECHA_DISPOSITIVO_UTC TEXT NOT NULL,
    LATITUD REAL NOT NULL,
    LONGITUD REAL NOT NULL,
    PRECISION_METROS REAL NULL,
    VELOCIDAD_MPS REAL NULL,
    RUMBO_GRADOS REAL NULL,
    ALTITUD_METROS REAL NULL,
    ES_UBICACION_SIMULADA INTEGER NOT NULL DEFAULT 0,
    ORIGEN_CAPTURA TEXT NOT NULL DEFAULT 'GPS',
    INTENTOS_ENVIO INTEGER NOT NULL DEFAULT 0,
    FECHA_ULTIMO_INTENTO_UTC TEXT NULL,
    FECHA_CREACION_UTC TEXT NOT NULL
)`;

var SEGUIMIENTO_SQL_CREAR_INDICE_PENDIENTES = `CREATE INDEX IF NOT EXISTS IX_SEG_POS_PENDIENTE_SEGUIMIENTO_ID
    ON SEGUIMIENTO_POSICION_PENDIENTE (ID_UNICO_SEGUIMIENTO, ID)`;

// Limitación Hito 1: el token queda encapsulado en SQLite. En una fase futura
// este repositorio podrá sustituirse por Android Keystore sin cambiar el emisor.
var SEGUIMIENTO_SQL_CREAR_CREDENCIALES = `CREATE TABLE IF NOT EXISTS SEGUIMIENTO_CREDENCIAL (
    ID_UNICO_SEGUIMIENTO TEXT PRIMARY KEY,
    ID_UNICO_MOVIL_GDE TEXT NOT NULL,
    UUID_DISPOSITIVO TEXT NOT NULL,
    TOKEN_SEGUIMIENTO TEXT NOT NULL,
    ESTADO TEXT NOT NULL,
    FECHA_EMISION_UTC TEXT NULL,
    FECHA_ACTUALIZACION_UTC TEXT NOT NULL
)`;

var SEGUIMIENTO_SQL_CREAR_INDICE_CREDENCIALES_ESTADO = `CREATE INDEX IF NOT EXISTS IX_SEG_CREDENCIAL_ESTADO
    ON SEGUIMIENTO_CREDENCIAL (ESTADO, ID_UNICO_SEGUIMIENTO)`;

function SEGUIMIENTO_abrirBaseDatos() {
    return window.sqlitePlugin.openDatabase({
        name: "bd.db",
        location: "default",
        androidDatabaseImplementation: "system"
    });
}

function DATOS_inicializarSeguimientoSqlite() {
    return new Promise(function (resolve, reject) {
        var db = SEGUIMIENTO_abrirBaseDatos();

        db.transaction(function (tr) {
            tr.executeSql(SEGUIMIENTO_SQL_CREAR_POSICIONES_PENDIENTES);
            tr.executeSql(SEGUIMIENTO_SQL_CREAR_INDICE_PENDIENTES);
            tr.executeSql(SEGUIMIENTO_SQL_CREAR_CREDENCIALES);
            tr.executeSql(SEGUIMIENTO_SQL_CREAR_INDICE_CREDENCIALES_ESTADO);
            tr.executeSql("PRAGMA table_info(GDE)", [], function (tr, rs) {
                var existeColumna = false;

                for (var i = 0; i < rs.rows.length; i++) {
                    if (String(rs.rows.item(i).name).toUpperCase() === "ID_UNICO_SEGUIMIENTO") {
                        existeColumna = true;
                        break;
                    }
                }

                if (!existeColumna) {
                    tr.executeSql("ALTER TABLE GDE ADD COLUMN ID_UNICO_SEGUIMIENTO TEXT NULL");
                }
            });
        }, reject, resolve);
    });
}

function SEGUIMIENTO_textoObligatorio(valor, nombre) {
    if (typeof valor !== "string") {
        throw new Error(nombre + " es obligatorio.");
    }

    var texto = valor.trim();
    var textoMinuscula = texto.toLowerCase();
    if (texto === "" || textoMinuscula === "undefined" || textoMinuscula === "null") {
        throw new Error(nombre + " es obligatorio.");
    }

    return texto;
}

function SEGUIMIENTO_uuidObligatorio(valor, nombre) {
    var uuid = SEGUIMIENTO_textoObligatorio(valor, nombre);
    var expresionUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!expresionUuid.test(uuid)) {
        throw new Error(nombre + " no tiene formato UUID válido.");
    }

    return uuid;
}

function SEGUIMIENTO_fechaUtcObligatoria(valor, nombre) {
    var fecha = SEGUIMIENTO_textoObligatorio(valor, nombre);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/i.test(fecha) || isNaN(Date.parse(fecha))) {
        throw new Error(nombre + " debe ser una fecha ISO-8601 UTC.");
    }

    return fecha;
}

function SEGUIMIENTO_numeroObligatorio(valor, nombre) {
    if (typeof valor !== "number" || !isFinite(valor)) {
        throw new Error(nombre + " es obligatorio y debe ser numérico.");
    }
    return valor;
}

function SEGUIMIENTO_numeroNullable(valor, nombre) {
    if (valor === undefined || valor === null || valor === "") {
        return null;
    }
    return SEGUIMIENTO_numeroObligatorio(valor, nombre);
}

function SEGUIMIENTO_enteroNullable(valor, nombre) {
    var numero = SEGUIMIENTO_numeroNullable(valor, nombre);
    if (numero !== null && Math.floor(numero) !== numero) {
        throw new Error(nombre + " debe ser entero.");
    }
    return numero;
}

function SEGUIMIENTO_generarUuid() {
    var cryptoDisponible = window.crypto || window.msCrypto;
    if (cryptoDisponible && typeof cryptoDisponible.randomUUID === "function") {
        return cryptoDisponible.randomUUID();
    }

    if (!cryptoDisponible || typeof cryptoDisponible.getRandomValues !== "function") {
        throw new Error("El dispositivo no permite generar un UUID criptográficamente seguro.");
    }

    var bytes = new Uint8Array(16);
    cryptoDisponible.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;

    var hexadecimal = [];
    for (var i = 0; i < bytes.length; i++) {
        hexadecimal.push((bytes[i] + 256).toString(16).slice(1));
    }

    return hexadecimal.slice(0, 4).join("") + "-" +
        hexadecimal.slice(4, 6).join("") + "-" +
        hexadecimal.slice(6, 8).join("") + "-" +
        hexadecimal.slice(8, 10).join("") + "-" +
        hexadecimal.slice(10, 16).join("");
}

function SEGUIMIENTO_filas(rs) {
    var filas = [];
    for (var i = 0; i < rs.rows.length; i++) {
        filas.push(rs.rows.item(i));
    }
    return filas;
}

function SEGUIMIENTO_actualizarGuiaEnTransaccion(tr, seguimiento, alCompletar) {
    tr.executeSql(
        "UPDATE GDE SET ID_UNICO_SEGUIMIENTO = ? WHERE ID_UNICO_MOVIL = ?",
        [seguimiento.ID_UNICO_SEGUIMIENTO, seguimiento.ID_UNICO_MOVIL_GDE],
        function (tr, rs) {
            if (rs.rowsAffected !== 1) {
                throw new Error("No se encontró una única guía para ID_UNICO_MOVIL_GDE " + seguimiento.ID_UNICO_MOVIL_GDE + ".");
            }
            alCompletar();
        }
    );
}

function SEGUIMIENTO_guardarCredencialEnTransaccion(tr, seguimiento, alCompletar) {
    tr.executeSql(
        `INSERT OR REPLACE INTO SEGUIMIENTO_CREDENCIAL (
            ID_UNICO_SEGUIMIENTO, ID_UNICO_MOVIL_GDE, UUID_DISPOSITIVO,
            TOKEN_SEGUIMIENTO, ESTADO, FECHA_EMISION_UTC, FECHA_ACTUALIZACION_UTC
        ) VALUES (?, ?, ?, ?, 'ACTIVA', ?, ?)`,
        [
            seguimiento.ID_UNICO_SEGUIMIENTO,
            seguimiento.ID_UNICO_MOVIL_GDE,
            seguimiento.UUID_DISPOSITIVO,
            seguimiento.TOKEN_SEGUIMIENTO,
            seguimiento.FECHA_EMISION_UTC,
            new Date().toISOString()
        ],
        function () { alCompletar(); }
    );
}

function SEGUIMIENTO_normalizarVinculosGuia(seguimientos) {
    if (!Array.isArray(seguimientos)) {
        throw new Error("SEGUIMIENTOS debe ser una lista.");
    }

    var idsGuia = {};
    return seguimientos.map(function (seguimiento) {
        if (!seguimiento) {
            throw new Error("SEGUIMIENTOS contiene un elemento nulo.");
        }

        var idGuia = SEGUIMIENTO_textoObligatorio(seguimiento.ID_UNICO_MOVIL_GDE, "ID_UNICO_MOVIL_GDE");
        var idSeguimiento = SEGUIMIENTO_uuidObligatorio(seguimiento.ID_UNICO_SEGUIMIENTO, "ID_UNICO_SEGUIMIENTO");
        var uuidDispositivo = SEGUIMIENTO_textoObligatorio(seguimiento.UUID_DISPOSITIVO, "UUID_DISPOSITIVO");
        var tokenSeguimiento = SEGUIMIENTO_textoObligatorio(seguimiento.TOKEN_SEGUIMIENTO, "TOKEN_SEGUIMIENTO");
        var claveGuia = idGuia.toUpperCase();

        if (idsGuia[claveGuia]) {
            throw new Error("La respuesta contiene más de un seguimiento para la guía " + idGuia + ".");
        }
        idsGuia[claveGuia] = true;

        return {
            ID_UNICO_MOVIL_GDE: idGuia,
            ID_UNICO_SEGUIMIENTO: idSeguimiento,
            UUID_DISPOSITIVO: uuidDispositivo,
            TOKEN_SEGUIMIENTO: tokenSeguimiento,
            FECHA_EMISION_UTC: seguimiento.FECHA_EMISION_UTC || null
        };
    });
}

function guardarIdsSeguimientoGuias(seguimientos) {
    return new Promise(function (resolve, reject) {
        var vinculos;
        try {
            vinculos = SEGUIMIENTO_normalizarVinculosGuia(seguimientos);
        } catch (error) {
            reject(error);
            return;
        }

        if (vinculos.length === 0) {
            resolve(0);
            return;
        }

        var db = SEGUIMIENTO_abrirBaseDatos();
        var cantidadGuardada = 0;

        db.transaction(function (tr) {
            function guardarSiguiente(indice) {
                if (indice >= vinculos.length) {
                    return;
                }

                SEGUIMIENTO_guardarCredencialEnTransaccion(tr, vinculos[indice], function () {
                    SEGUIMIENTO_actualizarGuiaEnTransaccion(tr, vinculos[indice], function () {
                        cantidadGuardada++;
                        guardarSiguiente(indice + 1);
                    });
                });
            }

            guardarSiguiente(0);
        }, reject, function () {
            resolve(cantidadGuardada);
        });
    });
}

function SEGUIMIENTO_normalizarGuiasAceptadas(idsGuiasAceptadas) {
    if (!Array.isArray(idsGuiasAceptadas)) {
        throw new Error("Las guías aceptadas deben ser una lista.");
    }

    var idsVistos = {};
    return idsGuiasAceptadas.map(function (idGuia) {
        var idNormalizado = SEGUIMIENTO_textoObligatorio(idGuia, "ID_UNICO_MOVIL");
        var clave = idNormalizado.toUpperCase();
        if (idsVistos[clave]) {
            throw new Error("La respuesta contiene más de una aceptación para la guía " + idNormalizado + ".");
        }
        idsVistos[clave] = true;
        return idNormalizado;
    });
}

function guardarGuiasAceptadasConSeguimiento(seguimientos, idsGuiasAceptadas) {
    return new Promise(function (resolve, reject) {
        var vinculos;
        var idsAceptados;
        try {
            vinculos = SEGUIMIENTO_normalizarVinculosGuia(seguimientos);
            idsAceptados = SEGUIMIENTO_normalizarGuiasAceptadas(idsGuiasAceptadas);

            if (vinculos.length !== idsAceptados.length) {
                throw new Error("La cantidad de seguimientos no coincide con las guías aceptadas.");
            }
        } catch (error) {
            reject(error);
            return;
        }

        if (idsAceptados.length === 0) {
            resolve(0);
            return;
        }

        var vinculosPorGuia = {};
        vinculos.forEach(function (vinculo) {
            vinculosPorGuia[vinculo.ID_UNICO_MOVIL_GDE.toUpperCase()] = vinculo;
        });

        var vinculosAceptados;
        try {
            vinculosAceptados = idsAceptados.map(function (idGuia) {
                var vinculo = vinculosPorGuia[idGuia.toUpperCase()];
                if (!vinculo) {
                    throw new Error("No existe seguimiento para la guía aceptada " + idGuia + ".");
                }
                return vinculo;
            });
        } catch (error) {
            reject(error);
            return;
        }

        var cantidadGuardada = 0;
        SEGUIMIENTO_abrirBaseDatos().transaction(function (tr) {
            function guardarSiguiente(indice) {
                if (indice >= vinculosAceptados.length) {
                    return;
                }

                var vinculo = vinculosAceptados[indice];
                SEGUIMIENTO_guardarCredencialEnTransaccion(tr, vinculo, function () {
                    tr.executeSql(
                        `UPDATE GDE
                         SET ID_UNICO_SEGUIMIENTO = ?, ENVIADO = 1, GDE_ESTADO_MOVIL = 'E'
                         WHERE ID_UNICO_MOVIL = ?
                           AND ENVIADO = 0
                           AND GDE_ESTADO_MOVIL = 'I'`,
                        [vinculo.ID_UNICO_SEGUIMIENTO, vinculo.ID_UNICO_MOVIL_GDE],
                        function (tr, rs) {
                            if (rs.rowsAffected !== 1) {
                                throw new Error("No se encontró una única guía pendiente para la aceptación recibida.");
                            }
                            cantidadGuardada++;
                            guardarSiguiente(indice + 1);
                        }
                    );
                });
            }

            guardarSiguiente(0);
        }, reject, function () {
            resolve(cantidadGuardada);
        });
    });
}

function guardarIdSeguimientoGuia(idUnicoMovilGde, idUnicoSeguimiento, uuidDispositivo, tokenSeguimiento) {
    return guardarIdsSeguimientoGuias([{
        ID_UNICO_MOVIL_GDE: idUnicoMovilGde,
        ID_UNICO_SEGUIMIENTO: idUnicoSeguimiento,
        UUID_DISPOSITIVO: uuidDispositivo,
        TOKEN_SEGUIMIENTO: tokenSeguimiento
    }]);
}

function obtenerCredencialSeguimiento(idUnicoSeguimiento) {
    return new Promise(function (resolve, reject) {
        var idSeguimiento;
        try {
            idSeguimiento = SEGUIMIENTO_uuidObligatorio(idUnicoSeguimiento, "ID_UNICO_SEGUIMIENTO");
        } catch (error) {
            reject(error);
            return;
        }

        var credencial = null;
        SEGUIMIENTO_abrirBaseDatos().transaction(function (tr) {
            tr.executeSql(
                "SELECT * FROM SEGUIMIENTO_CREDENCIAL WHERE ID_UNICO_SEGUIMIENTO = ? LIMIT 1",
                [idSeguimiento],
                function (tr, rs) {
                    credencial = rs.rows.length === 1 ? rs.rows.item(0) : null;
                }
            );
        }, reject, function () { resolve(credencial); });
    });
}

function listarCredencialesSeguimientoActivas() {
    return new Promise(function (resolve, reject) {
        var credenciales = [];
        SEGUIMIENTO_abrirBaseDatos().transaction(function (tr) {
            tr.executeSql(
                "SELECT * FROM SEGUIMIENTO_CREDENCIAL WHERE ESTADO = 'ACTIVA' ORDER BY ID_UNICO_SEGUIMIENTO",
                [],
                function (tr, rs) { credenciales = SEGUIMIENTO_filas(rs); }
            );
        }, reject, function () { resolve(credenciales); });
    });
}

function marcarCredencialSeguimiento(idUnicoSeguimiento, estado) {
    return new Promise(function (resolve, reject) {
        var idSeguimiento;
        try {
            idSeguimiento = SEGUIMIENTO_uuidObligatorio(idUnicoSeguimiento, "ID_UNICO_SEGUIMIENTO");
            estado = SEGUIMIENTO_textoObligatorio(estado, "ESTADO").toUpperCase();
            if (["ACTIVA", "BLOQUEADA", "REVOCADA", "TERMINAL"].indexOf(estado) < 0) {
                throw new Error("Estado de credencial no permitido.");
            }
        } catch (error) {
            reject(error);
            return;
        }

        var afectadas = 0;
        SEGUIMIENTO_abrirBaseDatos().transaction(function (tr) {
            tr.executeSql(
                "UPDATE SEGUIMIENTO_CREDENCIAL SET ESTADO = ?, FECHA_ACTUALIZACION_UTC = ? WHERE ID_UNICO_SEGUIMIENTO = ?",
                [estado, new Date().toISOString(), idSeguimiento],
                function (tr, rs) { afectadas = rs.rowsAffected; }
            );
        }, reject, function () { resolve(afectadas); });
    });
}

function eliminarCredencialSeguimientoTerminal(idUnicoSeguimiento) {
    return new Promise(function (resolve, reject) {
        var idSeguimiento;
        try {
            idSeguimiento = SEGUIMIENTO_uuidObligatorio(idUnicoSeguimiento, "ID_UNICO_SEGUIMIENTO");
        } catch (error) {
            reject(error);
            return;
        }
        var eliminadas = 0;
        SEGUIMIENTO_abrirBaseDatos().transaction(function (tr) {
            tr.executeSql(
                "DELETE FROM SEGUIMIENTO_CREDENCIAL WHERE ID_UNICO_SEGUIMIENTO = ? AND ESTADO IN ('REVOCADA', 'TERMINAL')",
                [idSeguimiento],
                function (tr, rs) { eliminadas = rs.rowsAffected; }
            );
        }, reject, function () { resolve(eliminadas); });
    });
}

function listarSeguimientosPendientesSinCredencial() {
    return new Promise(function (resolve, reject) {
        var seguimientos = [];
        SEGUIMIENTO_abrirBaseDatos().transaction(function (tr) {
            tr.executeSql(
                `SELECT P.ID_UNICO_SEGUIMIENTO, COUNT(*) AS CANTIDAD_PENDIENTE
                 FROM SEGUIMIENTO_POSICION_PENDIENTE P
                 LEFT JOIN SEGUIMIENTO_CREDENCIAL C
                   ON C.ID_UNICO_SEGUIMIENTO = P.ID_UNICO_SEGUIMIENTO
                  AND C.ESTADO = 'ACTIVA'
                 WHERE C.ID_UNICO_SEGUIMIENTO IS NULL
                 GROUP BY P.ID_UNICO_SEGUIMIENTO`,
                [],
                function (tr, rs) { seguimientos = SEGUIMIENTO_filas(rs); }
            );
        }, reject, function () { resolve(seguimientos); });
    });
}

function obtenerIdSeguimientoGuia(idUnicoMovilGde) {
    return new Promise(function (resolve, reject) {
        var idGuia;
        try {
            idGuia = SEGUIMIENTO_textoObligatorio(idUnicoMovilGde, "ID_UNICO_MOVIL_GDE");
        } catch (error) {
            reject(error);
            return;
        }

        var db = SEGUIMIENTO_abrirBaseDatos();
        var idSeguimiento = null;

        db.transaction(function (tr) {
            tr.executeSql(
                "SELECT ID_UNICO_SEGUIMIENTO FROM GDE WHERE ID_UNICO_MOVIL = ? LIMIT 2",
                [idGuia],
                function (tr, rs) {
                    if (rs.rows.length > 1) {
                        throw new Error("Existe más de una guía para ID_UNICO_MOVIL_GDE " + idGuia + ".");
                    }
                    if (rs.rows.length === 1) {
                        idSeguimiento = rs.rows.item(0).ID_UNICO_SEGUIMIENTO || null;
                    }
                }
            );
        }, reject, function () {
            resolve(idSeguimiento);
        });
    });
}

function SEGUIMIENTO_normalizarPosicion(posicion) {
    if (!posicion) {
        throw new Error("La posición es obligatoria.");
    }

    var uuidPosicion;
    if (posicion.UUID_POSICION === undefined || posicion.UUID_POSICION === null || String(posicion.UUID_POSICION).trim() === "") {
        uuidPosicion = SEGUIMIENTO_generarUuid();
        posicion.UUID_POSICION = uuidPosicion;
    } else {
        uuidPosicion = SEGUIMIENTO_uuidObligatorio(posicion.UUID_POSICION, "UUID_POSICION");
        posicion.UUID_POSICION = uuidPosicion;
    }

    var origenCaptura = posicion.ORIGEN_CAPTURA === undefined || posicion.ORIGEN_CAPTURA === null
        ? "GPS"
        : SEGUIMIENTO_textoObligatorio(posicion.ORIGEN_CAPTURA, "ORIGEN_CAPTURA");
    if (origenCaptura.length > 20) {
        throw new Error("ORIGEN_CAPTURA no puede superar 20 caracteres.");
    }

    var latitud = SEGUIMIENTO_numeroObligatorio(posicion.LATITUD, "LATITUD");
    var longitud = SEGUIMIENTO_numeroObligatorio(posicion.LONGITUD, "LONGITUD");
    if (latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
        throw new Error("Las coordenadas están fuera de rango.");
    }

    return {
        UUID_POSICION: uuidPosicion,
        ID_UNICO_MOVIL_GDE: SEGUIMIENTO_textoObligatorio(posicion.ID_UNICO_MOVIL_GDE, "ID_UNICO_MOVIL_GDE"),
        ID_UNICO_SEGUIMIENTO: SEGUIMIENTO_uuidObligatorio(posicion.ID_UNICO_SEGUIMIENTO, "ID_UNICO_SEGUIMIENTO"),
        SECUENCIA_LOCAL: SEGUIMIENTO_enteroNullable(posicion.SECUENCIA_LOCAL, "SECUENCIA_LOCAL"),
        FECHA_DISPOSITIVO_UTC: SEGUIMIENTO_fechaUtcObligatoria(posicion.FECHA_DISPOSITIVO_UTC, "FECHA_DISPOSITIVO_UTC"),
        LATITUD: latitud,
        LONGITUD: longitud,
        PRECISION_METROS: SEGUIMIENTO_numeroNullable(posicion.PRECISION_METROS, "PRECISION_METROS"),
        VELOCIDAD_MPS: SEGUIMIENTO_numeroNullable(posicion.VELOCIDAD_MPS, "VELOCIDAD_MPS"),
        RUMBO_GRADOS: SEGUIMIENTO_numeroNullable(posicion.RUMBO_GRADOS, "RUMBO_GRADOS"),
        ALTITUD_METROS: SEGUIMIENTO_numeroNullable(posicion.ALTITUD_METROS, "ALTITUD_METROS"),
        ES_UBICACION_SIMULADA: posicion.ES_UBICACION_SIMULADA ? 1 : 0,
        ORIGEN_CAPTURA: origenCaptura,
        FECHA_CREACION_UTC: posicion.FECHA_CREACION_UTC
            ? SEGUIMIENTO_fechaUtcObligatoria(posicion.FECHA_CREACION_UTC, "FECHA_CREACION_UTC")
            : new Date().toISOString()
    };
}

function SEGUIMIENTO_insertarPosicionEnTransaccion(tr, posicionNormalizada, alInsertar) {
    tr.executeSql(
        `INSERT INTO SEGUIMIENTO_POSICION_PENDIENTE (
            UUID_POSICION, ID_UNICO_MOVIL_GDE, ID_UNICO_SEGUIMIENTO,
            SECUENCIA_LOCAL, FECHA_DISPOSITIVO_UTC, LATITUD, LONGITUD,
            PRECISION_METROS, VELOCIDAD_MPS, RUMBO_GRADOS, ALTITUD_METROS,
            ES_UBICACION_SIMULADA, ORIGEN_CAPTURA, FECHA_CREACION_UTC
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            posicionNormalizada.UUID_POSICION,
            posicionNormalizada.ID_UNICO_MOVIL_GDE,
            posicionNormalizada.ID_UNICO_SEGUIMIENTO,
            posicionNormalizada.SECUENCIA_LOCAL,
            posicionNormalizada.FECHA_DISPOSITIVO_UTC,
            posicionNormalizada.LATITUD,
            posicionNormalizada.LONGITUD,
            posicionNormalizada.PRECISION_METROS,
            posicionNormalizada.VELOCIDAD_MPS,
            posicionNormalizada.RUMBO_GRADOS,
            posicionNormalizada.ALTITUD_METROS,
            posicionNormalizada.ES_UBICACION_SIMULADA,
            posicionNormalizada.ORIGEN_CAPTURA,
            posicionNormalizada.FECHA_CREACION_UTC
        ],
        function (tr, rs) {
            alInsertar({
                ID: rs.insertId,
                UUID_POSICION: posicionNormalizada.UUID_POSICION
            });
        }
    );
}

function insertarPosicionesSeguimientoPendientes(posiciones) {
    return new Promise(function (resolve, reject) {
        var posicionesNormalizadas;
        try {
            if (!Array.isArray(posiciones)) {
                throw new Error("Las posiciones son obligatorias.");
            }

            var uuidVistos = {};
            posicionesNormalizadas = posiciones.map(function (posicion) {
                var normalizada = SEGUIMIENTO_normalizarPosicion(posicion);
                var claveUuid = normalizada.UUID_POSICION.toUpperCase();
                if (uuidVistos[claveUuid]) {
                    throw new Error("Las posiciones contienen UUID_POSICION duplicados.");
                }
                uuidVistos[claveUuid] = true;
                return normalizada;
            });
        } catch (error) {
            reject(error);
            return;
        }

        if (posicionesNormalizadas.length === 0) {
            resolve([]);
            return;
        }

        var db = SEGUIMIENTO_abrirBaseDatos();
        var resultados = [];
        db.transaction(function (tr) {
            function insertarSiguiente(indice) {
                if (indice >= posicionesNormalizadas.length) {
                    return;
                }

                SEGUIMIENTO_insertarPosicionEnTransaccion(tr, posicionesNormalizadas[indice], function (resultado) {
                    resultados.push(resultado);
                    insertarSiguiente(indice + 1);
                });
            }

            insertarSiguiente(0);
        }, reject, function () {
            resolve(resultados);
        });
    });
}

function insertarPosicionSeguimientoPendiente(posicion) {
    return insertarPosicionesSeguimientoPendientes([posicion]).then(function (resultados) {
        return resultados[0];
    });
}

function listarSeguimientosConPosicionesPendientes() {
    return new Promise(function (resolve, reject) {
        var db = SEGUIMIENTO_abrirBaseDatos();
        var seguimientos = [];

        db.transaction(function (tr) {
            tr.executeSql(
                `SELECT ID_UNICO_SEGUIMIENTO
                 FROM SEGUIMIENTO_POSICION_PENDIENTE
                 GROUP BY ID_UNICO_SEGUIMIENTO
                 ORDER BY MIN(ID)`,
                [],
                function (tr, rs) {
                    seguimientos = SEGUIMIENTO_filas(rs).map(function (fila) {
                        return fila.ID_UNICO_SEGUIMIENTO;
                    });
                }
            );
        }, reject, function () {
            resolve(seguimientos);
        });
    });
}

function listarResumenSeguimientosConPosicionesPendientes() {
    return new Promise(function (resolve, reject) {
        var db = SEGUIMIENTO_abrirBaseDatos();
        var seguimientos = [];

        db.transaction(function (tr) {
            tr.executeSql(
                `SELECT ID_UNICO_SEGUIMIENTO,
                        COUNT(*) AS CANTIDAD_PENDIENTE,
                        MIN(FECHA_CREACION_UTC) AS FECHA_CREACION_UTC_MAS_ANTIGUA,
                        MIN(ID) AS PRIMER_ID
                 FROM SEGUIMIENTO_POSICION_PENDIENTE
                 GROUP BY ID_UNICO_SEGUIMIENTO
                 ORDER BY MIN(FECHA_CREACION_UTC), MIN(ID)`,
                [],
                function (tr, rs) {
                    seguimientos = SEGUIMIENTO_filas(rs).map(function (fila) {
                        return {
                            ID_UNICO_SEGUIMIENTO: fila.ID_UNICO_SEGUIMIENTO,
                            CANTIDAD_PENDIENTE: Number(fila.CANTIDAD_PENDIENTE) || 0,
                            FECHA_CREACION_UTC_MAS_ANTIGUA: fila.FECHA_CREACION_UTC_MAS_ANTIGUA || null
                        };
                    });
                }
            );
        }, reject, function () {
            resolve(seguimientos);
        });
    });
}

function listarPosicionesSeguimientoPendientes(idUnicoSeguimiento, limite) {
    return new Promise(function (resolve, reject) {
        var idSeguimiento;
        try {
            idSeguimiento = SEGUIMIENTO_uuidObligatorio(idUnicoSeguimiento, "ID_UNICO_SEGUIMIENTO");
            if (typeof limite !== "number" || Math.floor(limite) !== limite || limite < 1 || limite > 200) {
                throw new Error("El límite debe estar entre 1 y 200.");
            }
        } catch (error) {
            reject(error);
            return;
        }

        var db = SEGUIMIENTO_abrirBaseDatos();
        var posiciones = [];
        db.transaction(function (tr) {
            tr.executeSql(
                `SELECT * FROM SEGUIMIENTO_POSICION_PENDIENTE
                 WHERE ID_UNICO_SEGUIMIENTO = ?
                 ORDER BY ID
                 LIMIT ?`,
                [idSeguimiento, limite],
                function (tr, rs) {
                    posiciones = SEGUIMIENTO_filas(rs);
                }
            );
        }, reject, function () {
            resolve(posiciones);
        });
    });
}

function SEGUIMIENTO_normalizarListaUuid(listaUuid) {
    if (!Array.isArray(listaUuid)) {
        throw new Error("La lista de UUID_POSICION es obligatoria.");
    }

    var uuidsVistos = {};
    return listaUuid.map(function (uuid) {
        var valor = SEGUIMIENTO_uuidObligatorio(uuid, "UUID_POSICION");
        var clave = valor.toUpperCase();
        if (uuidsVistos[clave]) {
            throw new Error("La lista contiene UUID_POSICION duplicados.");
        }
        uuidsVistos[clave] = true;
        return valor;
    });
}

function SEGUIMIENTO_ejecutarPorListaUuid(sqlBase, parametrosIniciales, listaUuid) {
    return new Promise(function (resolve, reject) {
        var uuids;
        try {
            uuids = SEGUIMIENTO_normalizarListaUuid(listaUuid);
        } catch (error) {
            reject(error);
            return;
        }

        if (uuids.length === 0) {
            resolve(0);
            return;
        }

        var marcadores = uuids.map(function () { return "?"; }).join(", ");
        var parametros = parametrosIniciales.concat(uuids);
        var filasAfectadas = 0;
        var db = SEGUIMIENTO_abrirBaseDatos();

        db.transaction(function (tr) {
            tr.executeSql(sqlBase + " (" + marcadores + ")", parametros, function (tr, rs) {
                filasAfectadas = rs.rowsAffected;
            });
        }, reject, function () {
            resolve(filasAfectadas);
        });
    });
}

function eliminarPosicionesSeguimientoPorUuid(listaUuid) {
    return SEGUIMIENTO_ejecutarPorListaUuid(
        "DELETE FROM SEGUIMIENTO_POSICION_PENDIENTE WHERE UUID_POSICION IN",
        [],
        listaUuid
    );
}

function registrarIntentoEnvioPosiciones(listaUuid, fechaUtc) {
    var fecha;
    try {
        fecha = SEGUIMIENTO_fechaUtcObligatoria(fechaUtc, "FECHA_ULTIMO_INTENTO_UTC");
    } catch (error) {
        return Promise.reject(error);
    }

    return SEGUIMIENTO_ejecutarPorListaUuid(
        `UPDATE SEGUIMIENTO_POSICION_PENDIENTE
         SET INTENTOS_ENVIO = INTENTOS_ENVIO + 1,
             FECHA_ULTIMO_INTENTO_UTC = ?
         WHERE UUID_POSICION IN`,
        [fecha],
        listaUuid
    );
}

function procesarSeguimientosRecibeGuiaV2(seguimientos) {
    if (seguimientos === undefined || seguimientos === null) {
        return Promise.resolve(0);
    }
    return guardarIdsSeguimientoGuias(seguimientos);
}
