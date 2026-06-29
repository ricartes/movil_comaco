// ================== DATOS QR TRAZABILIDAD ORIGEN ==================

function DATOS_guardarQrTrazabilidadOrigen(qr, callbackError) {
    return new Promise(function (resolve, reject) {
        var db = window.sqlitePlugin.openDatabase({
            name: "bd.db",
            location: "default",
            androidDatabaseImplementation: 2
        });

        db.transaction(function (tr) {
            DATOS_asegurarColumnaVigenciaQrTrazabilidad(tr, function () {
            tr.executeSql(
                `INSERT INTO QR_TRAZABILIDAD_ORIGEN (
                    QR_ID,
                    ID_UNICO_MOVIL_GDE,
                    FECHA_GENERACION,
                    FECHA_EXPIRACION,
                    ESTADO,
                    LATITUD_CARGA,
                    LONGITUD_CARGA,
                    ACCURACY_CARGA,
                    COD_ORIGEN,
                    ROL_ORIGEN,
                    ROL_COMUNA_ORIGEN,
                    VIGENCIA_TIPO,
                    PAYLOAD_ENCRIPTADO,
                    PAYLOAD_HASH,
                    ENVIADO
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    qr.QR_ID,
                    qr.ID_UNICO_MOVIL_GDE,
                    qr.FECHA_GENERACION,
                    qr.FECHA_EXPIRACION,
                    qr.ESTADO,
                    DATOS_valorNuloQrTrazabilidad(qr.LATITUD_CARGA),
                    DATOS_valorNuloQrTrazabilidad(qr.LONGITUD_CARGA),
                    DATOS_valorNuloQrTrazabilidad(qr.ACCURACY_CARGA),
                    DATOS_valorNuloQrTrazabilidad(qr.COD_ORIGEN),
                    DATOS_valorNuloQrTrazabilidad(qr.ROL_ORIGEN),
                    DATOS_valorNuloQrTrazabilidad(qr.ROL_COMUNA_ORIGEN),
                    qr.VIGENCIA_TIPO || "POR_VIAJE",
                    qr.PAYLOAD_ENCRIPTADO,
                    qr.PAYLOAD_HASH
                ],
                function (tr, rs) {
                    resolve(rs);
                },
                function (tr, error) {
                    if (typeof callbackError === "function") {
                        callbackError(error);
                    }

                    reject(error);
                    return false;
                }
            );
            }, reject);
        });
    });
}

function DATOS_obtenerQrTrazabilidadPorGde(idUnicoMovilGde) {
    return new Promise(function (resolve, reject) {
        var db = window.sqlitePlugin.openDatabase({
            name: "bd.db",
            location: "default",
            androidDatabaseImplementation: 2
        });

        db.transaction(function (tr) {
            tr.executeSql(
                `SELECT *
                 FROM QR_TRAZABILIDAD_ORIGEN
                 WHERE ID_UNICO_MOVIL_GDE = ?
                 LIMIT 1`,
                [idUnicoMovilGde],
                function (tr, rs) {
                    if (rs.rows.length === 0) {
                        resolve(null);
                        return;
                    }

                    resolve(rs.rows.item(0));
                },
                function (tr, error) {
                    reject(error);
                    return false;
                }
            );
        });
    });
}

function DATOS_marcarQrTrazabilidadValidadoGde(qrId, qrRetornoEncriptado, datosRetorno) {
    return new Promise(function (resolve, reject) {
        var db = window.sqlitePlugin.openDatabase({
            name: "bd.db",
            location: "default",
            androidDatabaseImplementation: 2
        });

        db.transaction(function (tr) {
            tr.executeSql(
                `UPDATE QR_TRAZABILIDAD_ORIGEN
                 SET ESTADO = ?,
                     FECHA_VALIDACION_GDE = ?,
                     QR_RETORNO_ENCRIPTADO = ?,
                     DATOS_RETORNO = ?
                 WHERE QR_ID = ?`,
                [
                    "VALIDADO_GDE",
                    new Date().toISOString(),
                    qrRetornoEncriptado || null,
                    datosRetorno ? JSON.stringify(datosRetorno) : null,
                    qrId
                ],
                function (tr, rs) {
                    resolve(rs);
                },
                function (tr, error) {
                    reject(error);
                    return false;
                }
            );
        });
    });
}

function DATOS_marcarQrTrazabilidadAnulado(idUnicoMovilGde) {
    return new Promise(function (resolve, reject) {
        var db = window.sqlitePlugin.openDatabase({
            name: "bd.db",
            location: "default",
            androidDatabaseImplementation: 2
        });

        db.transaction(function (tr) {
            tr.executeSql(
                `UPDATE QR_TRAZABILIDAD_ORIGEN
                 SET ESTADO = ?
                 WHERE ID_UNICO_MOVIL_GDE = ?
                 AND ESTADO = ?`,
                [
                    "ANULADO",
                    idUnicoMovilGde,
                    "PENDIENTE_VALIDACION"
                ],
                function (tr, rs) {
                    resolve(rs);
                },
                function (tr, error) {
                    reject(error);
                    return false;
                }
            );
        });
    });
}

function DATOS_asegurarColumnaVigenciaQrTrazabilidad(tr, callbackOk, callbackError) {
    tr.executeSql(
        "PRAGMA table_info(QR_TRAZABILIDAD_ORIGEN)",
        [],
        function (tr, rs) {
            var existe = false;

            for (var i = 0; i < rs.rows.length; i++) {
                if (rs.rows.item(i).name === "VIGENCIA_TIPO") {
                    existe = true;
                    break;
                }
            }

            if (existe) {
                callbackOk();
                return;
            }

            tr.executeSql(
                "ALTER TABLE QR_TRAZABILIDAD_ORIGEN ADD COLUMN VIGENCIA_TIPO TEXT",
                [],
                function () {
                    callbackOk();
                },
                function (tr, error) {
                    if (typeof callbackError === "function") {
                        callbackError(error);
                    }
                    return false;
                }
            );
        },
        function (tr, error) {
            if (typeof callbackError === "function") {
                callbackError(error);
            }
            return false;
        }
    );
}

function DATOS_valorNuloQrTrazabilidad(valor) {
    return valor === undefined || valor === "" ? null : valor;
}
