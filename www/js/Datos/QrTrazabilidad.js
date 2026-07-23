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

function DATOS_obtenerQrTrazabilidadPorId(qrId) {
    return new Promise(function (resolve, reject) {
        var db = window.sqlitePlugin.openDatabase({
            name: "bd.db",
            location: "default",
            androidDatabaseImplementation: 2
        });
        db.transaction(function (tr) {
            tr.executeSql(
                "SELECT * FROM QR_TRAZABILIDAD_ORIGEN WHERE QR_ID = ? LIMIT 1",
                [qrId],
                function (tr, rs) { resolve(rs.rows.length ? rs.rows.item(0) : null); },
                function (tr, error) { reject(error); return false; }
            );
        }, reject);
    });
}

function DATOS_procesarAsociacionQrGde(payload, textoQr) {
    return new Promise(function (resolve, reject) {
        var db = window.sqlitePlugin.openDatabase({
            name: "bd.db",
            location: "default",
            androidDatabaseImplementation: 2
        });
        var respuesta;
        var fechaLectura = new Date().toISOString();

        db.transaction(function (tr) {
            tr.executeSql(
                "SELECT * FROM QR_TRAZABILIDAD_ORIGEN WHERE QR_ID = ? LIMIT 1",
                [payload.qrIdOrigen],
                function (tr, rs) {
                    if (!rs.rows.length) throw new Error("QR original no existe en este dispositivo.");
                    var qr = rs.rows.item(0);
                    if (String(qr.ID_UNICO_MOVIL_GDE) !== String(payload.idUnicoMovilTrazabilidad)) {
                        throw new Error("QR corresponde a otro viaje.");
                    }
                    if (qr.ESTADO === "ANULADO") throw new Error("El QR original está anulado.");

                    if (qr.ESTADO === "ASOCIADO_BORRADOR_GDE") {
                        if (String(qr.ASOCIACION_ID) === String(payload.asociacionId) &&
                            String(qr.ID_UNICO_MOVIL_GDE_ASOCIADO) === String(payload.idUnicoMovilGde)) {
                            respuesta = { estado: "YA_ASOCIADO", qr: qr };
                            return;
                        }
                        throw new Error("El QR está asociado a otro borrador GDE.");
                    }

                    if (qr.ESTADO !== "PENDIENTE_VALIDACION") {
                        throw new Error("El estado actual del QR no permite asociarlo.");
                    }

                    tr.executeSql(
                        `INSERT INTO QR_TRAZABILIDAD_EVENTO_GDE (
                            EVENTO_ID, TIPO_EVENTO, QR_ID_ORIGEN, ID_UNICO_MOVIL_TRAZABILIDAD,
                            ID_UNICO_MOVIL_GDE, ASOCIACION_ID, LIBERACION_ID, TEXTO_QR, RESULTADO,
                            VALIDADO_GEOCERCA, FLAG_CONTROL, ROL_PREDIO, RODAL, SECCION, AEF, PM,
                            FECHA_EVENTO_ORIGEN, FECHA_LECTURA_LOCAL, ESTADO_EVENTO
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            "ASOCIACION:" + payload.asociacionId,
                            "ASOCIACION",
                            payload.qrIdOrigen,
                            payload.idUnicoMovilTrazabilidad,
                            payload.idUnicoMovilGde,
                            payload.asociacionId,
                            null,
                            textoQr,
                            payload.resultado,
                            payload.validadoGeocerca,
                            payload.flagControl,
                            payload.rolPredio,
                            payload.rodal,
                            payload.seccion || null,
                            payload.aef || null,
                            payload.pm || null,
                            payload.fechaValidacion,
                            fechaLectura,
                            "ACEPTADO"
                        ],
                        function () {
                            tr.executeSql(
                                `UPDATE QR_TRAZABILIDAD_ORIGEN SET
                                    ESTADO = 'ASOCIADO_BORRADOR_GDE', ASOCIACION_ID = ?,
                                    ID_UNICO_MOVIL_GDE_ASOCIADO = ?, FECHA_VALIDACION_GDE = ?,
                                    FECHA_LECTURA_ASOCIACION = ?, QR_RETORNO_ENCRIPTADO = ?, DATOS_RETORNO = ?,
                                    RESULTADO_VALIDACION_GDE = ?, VALIDADO_GEOCERCA = ?, FLAG_CONTROL_GDE = ?,
                                    ROL_PREDIO_VALIDADO = ?, RODAL_VALIDADO = ?, SECCION_VALIDADA = ?,
                                    AEF_VALIDADO = ?, PM_VALIDADO = ?, LIBERACION_ID = NULL,
                                    FECHA_LIBERACION_GDE = NULL, FECHA_LECTURA_LIBERACION = NULL
                                 WHERE QR_ID = ? AND ESTADO = 'PENDIENTE_VALIDACION'`,
                                [
                                    payload.asociacionId,
                                    payload.idUnicoMovilGde,
                                    payload.fechaValidacion,
                                    fechaLectura,
                                    textoQr,
                                    JSON.stringify(payload),
                                    payload.resultado,
                                    payload.validadoGeocerca,
                                    payload.flagControl,
                                    payload.rolPredio,
                                    payload.rodal,
                                    payload.seccion || null,
                                    payload.aef || null,
                                    payload.pm || null,
                                    payload.qrIdOrigen
                                ],
                                function (tr, updateRs) {
                                    if (updateRs.rowsAffected !== 1) throw new Error("No fue posible asociar el QR de forma atómica.");
                                    respuesta = {
                                        estado: "ASOCIADO",
                                        qr: Object.assign({}, qr, payload, {
                                            ESTADO: "ASOCIADO_BORRADOR_GDE",
                                            ASOCIACION_ID: payload.asociacionId,
                                            ID_UNICO_MOVIL_GDE_ASOCIADO: payload.idUnicoMovilGde,
                                            FECHA_LECTURA_ASOCIACION: fechaLectura
                                        })
                                    };
                                }
                            );
                        }
                    );
                }
            );
        }, reject, function () { resolve(respuesta); });
    });
}

function DATOS_procesarLiberacionQrGde(payload, textoQr) {
    return new Promise(function (resolve, reject) {
        var db = window.sqlitePlugin.openDatabase({
            name: "bd.db",
            location: "default",
            androidDatabaseImplementation: 2
        });
        var respuesta;
        var fechaLectura = new Date().toISOString();

        db.transaction(function (tr) {
            tr.executeSql(
                "SELECT * FROM QR_TRAZABILIDAD_ORIGEN WHERE QR_ID = ? LIMIT 1",
                [payload.qrIdOrigen],
                function (tr, rs) {
                    if (!rs.rows.length) throw new Error("QR original no existe en este dispositivo.");
                    var qr = rs.rows.item(0);
                    if (String(qr.ID_UNICO_MOVIL_GDE) !== String(payload.idUnicoMovilTrazabilidad)) {
                        throw new Error("QR de liberación corresponde a otro viaje.");
                    }
                    if (qr.ESTADO === "ANULADO") throw new Error("El QR original está anulado.");

                    tr.executeSql(
                        "SELECT ID FROM QR_TRAZABILIDAD_EVENTO_GDE WHERE EVENTO_ID = ? LIMIT 1",
                        ["LIBERACION:" + payload.liberacionId],
                        function (tr, eventoRs) {
                            if (eventoRs.rows.length) {
                                respuesta = { estado: "YA_LIBERADO", qr: qr };
                                return;
                            }

                            if (qr.ESTADO !== "ASOCIADO_BORRADOR_GDE") {
                                throw new Error("No existe una asociación activa que corresponda a esta liberación.");
                            }
                            if (String(qr.ASOCIACION_ID) !== String(payload.asociacionId) ||
                                String(qr.ID_UNICO_MOVIL_GDE_ASOCIADO) !== String(payload.idUnicoMovilGde)) {
                                throw new Error("La liberación corresponde a otra asociación o GDE.");
                            }

                            tr.executeSql(
                                `INSERT INTO QR_TRAZABILIDAD_EVENTO_GDE (
                                    EVENTO_ID, TIPO_EVENTO, QR_ID_ORIGEN, ID_UNICO_MOVIL_TRAZABILIDAD,
                                    ID_UNICO_MOVIL_GDE, ASOCIACION_ID, LIBERACION_ID, TEXTO_QR, RESULTADO,
                                    FECHA_EVENTO_ORIGEN, FECHA_LECTURA_LOCAL, ESTADO_EVENTO
                                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    "LIBERACION:" + payload.liberacionId,
                                    "LIBERACION",
                                    payload.qrIdOrigen,
                                    payload.idUnicoMovilTrazabilidad,
                                    payload.idUnicoMovilGde,
                                    payload.asociacionId,
                                    payload.liberacionId,
                                    textoQr,
                                    payload.resultado,
                                    payload.fechaLiberacion,
                                    fechaLectura,
                                    "ACEPTADO"
                                ],
                                function () {
                                    tr.executeSql(
                                        `UPDATE QR_TRAZABILIDAD_ORIGEN SET
                                            ESTADO = 'PENDIENTE_VALIDACION', LIBERACION_ID = ?,
                                            FECHA_LIBERACION_GDE = ?, FECHA_LECTURA_LIBERACION = ?,
                                            ASOCIACION_ID = NULL, ID_UNICO_MOVIL_GDE_ASOCIADO = NULL
                                         WHERE QR_ID = ? AND ESTADO = 'ASOCIADO_BORRADOR_GDE'`,
                                        [payload.liberacionId, payload.fechaLiberacion, fechaLectura, payload.qrIdOrigen],
                                        function (tr, updateRs) {
                                            if (updateRs.rowsAffected !== 1) throw new Error("No fue posible liberar el QR de forma atómica.");
                                            respuesta = {
                                                estado: "LIBERADO",
                                                qr: Object.assign({}, qr, {
                                                    ESTADO: "PENDIENTE_VALIDACION",
                                                    ASOCIACION_ID: null,
                                                    ID_UNICO_MOVIL_GDE_ASOCIADO: null,
                                                    LIBERACION_ID: payload.liberacionId,
                                                    FECHA_LECTURA_LIBERACION: fechaLectura
                                                })
                                            };
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }, reject, function () { resolve(respuesta); });
    });
}

function DATOS_listarEventosQrTrazabilidad(qrId) {
    return new Promise(function (resolve, reject) {
        var db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: "default", androidDatabaseImplementation: 2 });
        db.transaction(function (tr) {
            tr.executeSql(
                "SELECT * FROM QR_TRAZABILIDAD_EVENTO_GDE WHERE QR_ID_ORIGEN = ? ORDER BY ID DESC",
                [qrId],
                function (tr, rs) {
                    var eventos = [];
                    for (var i = 0; i < rs.rows.length; i++) eventos.push(rs.rows.item(i));
                    resolve(eventos);
                },
                function (tr, error) { reject(error); return false; }
            );
        }, reject);
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
