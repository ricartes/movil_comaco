function DATOS_seleccionar_evidencia_guia(id_gde, tipo_evidencia, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT e.*,e.rowid,  strftime('%d-%m-%Y %H:%M', e.FECHA_EVIDENCIA) as fecha_format FROM GDE_EVIDENCIA e WHERE e.ID_GDE=? AND (TIPO_EVIDENCIA=? OR ?=0)  ORDER BY FECHA_EVIDENCIA ASC", [id_gde, tipo_evidencia, tipo_evidencia], function (tr, rs) {
            var n = rs.rows.length;
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            } else {
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var cb = new CL_GDE_Evidencia();
                    cb.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                    cb.ROWID = rs_datos.rowid;
                    cb.ID_GDE = rs_datos.ID_GDE
                    cb.FECHA_FORMAT = rs_datos.fecha_format
                    cb.ID_UNICO_MOVIL_GDE = rs_datos.ID_UNICO_MOVIL_GDE;
                    cb.FECHA_EVIDENCIA = rs_datos.FECHA_EVIDENCIA;
                    cb.OBSERVACION = rs_datos.OBSERVACION;
                    cb.ARCHIVO = rs_datos.ARCHIVO;
                    cb.TIPO_EVIDENCIA = rs_datos.TIPO_EVIDENCIA;
                    cb.ENVIADO = rs_datos.ENVIADO;
                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);

            }
        });

    });

}


async function DATOS_seleccionar_evidencia_por_guia(id_gde) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    return new Promise((resolve, reject) => {
        this.db.transaction(function (tr) {
            tr.executeSql(
                "SELECT e.*, e.rowid, strftime('%d-%m-%Y %H:%M', e.FECHA_EVIDENCIA) as fecha_format FROM GDE_EVIDENCIA e WHERE e.ID_GDE=? ORDER BY FECHA_EVIDENCIA ASC",
                [id_gde],
                function (tr, rs) {
                    var n = rs.rows.length;
                    if (n == 0) {
                        resolve(-1);
                    } else {
                        var ar = [];
                        for (let i = 0; i < n; i++) {
                            var rs_datos = rs.rows.item(i);
                            var cb = new CL_GDE_Evidencia();
                            cb.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                            cb.ROWID = rs_datos.rowid;
                            cb.ID_GDE = rs_datos.ID_GDE;
                            cb.FECHA_FORMAT = rs_datos.fecha_format;
                            cb.ID_UNICO_MOVIL_GDE = rs_datos.ID_UNICO_MOVIL_GDE;
                            cb.FECHA_EVIDENCIA = rs_datos.FECHA_EVIDENCIA;
                            cb.OBSERVACION = rs_datos.OBSERVACION;
                            cb.ARCHIVO = rs_datos.ARCHIVO;
                            cb.TIPO_EVIDENCIA = rs_datos.TIPO_EVIDENCIA;
                            cb.ENVIADO = rs_datos.ENVIADO;
                            ar.push(cb);
                        }
                        resolve(ar);
                    }
                },
                function (error) {
                    reject(error);
                }
            );
        });
    });
}




function DATOS_seleccionar_evidencias_por_enviar(estado, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT e.*,e.rowid,  strftime('%d-%m-%Y %H:%M', e.FECHA_EVIDENCIA) as fecha_format FROM GDE_EVIDENCIA e WHERE e.ENVIADO=? AND e.GDE_COD_DESPACHADOR=? AND e.GDE_ESTADO_MOVIL IN(?,?) ORDER BY FECHA_EVIDENCIA ASC", [estado, Obtener_dato_local("rut_activo"), "I", "N"], function (tr, rs) {
            var n = rs.rows.length;
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            } else {
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var cb = new CL_GDE_Evidencia();
                    cb.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                    cb.ROWID = rs_datos.rowid;
                    cb.ID_GDE = rs_datos.ID_GDE
                    cb.FECHA_FORMAT = rs_datos.fecha_format
                    cb.ID_UNICO_MOVIL_GDE = rs_datos.ID_UNICO_MOVIL_GDE;
                    cb.FECHA_EVIDENCIA = rs_datos.FECHA_EVIDENCIA;
                    cb.OBSERVACION = rs_datos.OBSERVACION;
                    cb.ARCHIVO = rs_datos.ARCHIVO;
                    cb.GDE_COD_DESPACHADOR = rs_datos.GDE_COD_DESPACHADOR;
                    cb.GDE_ESTADO_MOVIL = rs_datos.GDE_ESTADO_MOVIL;
                    cb.EVIDENCIA_COORDENADA_X = rs_datos.EVIDENCIA_COORDENADA_X;
                    cb.EVIDENCIA_COORDENADA_Y = rs_datos.EVIDENCIA_COORDENADA_Y;
                    cb.ENVIADO = rs_datos.ENVIADO;
                    cb.TIPO_EVIDENCIA = rs_datos.TIPO_EVIDENCIA;
                    cb.ARCHIVO_FOTO = cb.ARCHIVO.substr(cb.ARCHIVO.lastIndexOf('/') + 1);
                    ar.push(cb);
                }
                typeof callback == "function" && callback(ar);

            }
        });

    });

}



function DATOS_seleccionar_evidencias_FOTOS_Por_enviar(estado, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT e.*,e.rowid,  strftime('%d-%m-%Y %H:%M', e.FECHA_EVIDENCIA) as fecha_format FROM GDE_EVIDENCIA e WHERE e.ENVIADO_FOTO=? AND e.GDE_COD_DESPACHADOR=? AND e.GDE_ESTADO_MOVIL IN (?,?)  ORDER BY FECHA_EVIDENCIA ASC", [estado, Obtener_dato_local("rut_activo"), "I", "N"], function (tr, rs) {
            var n = rs.rows.length;
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            } else {
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var cb = new CL_GDE_Evidencia();
                    cb.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                    cb.ROWID = rs_datos.rowid;
                    cb.ID_GDE = rs_datos.ID_GDE
                    cb.FECHA_FORMAT = rs_datos.fecha_format
                    cb.ID_UNICO_MOVIL_GDE = rs_datos.ID_UNICO_MOVIL_GDE;
                    cb.FECHA_EVIDENCIA = rs_datos.FECHA_EVIDENCIA;
                    cb.OBSERVACION = rs_datos.OBSERVACION;
                    cb.ARCHIVO = rs_datos.ARCHIVO;
                    cb.GDE_COD_DESPACHADOR = rs_datos.GDE_COD_DESPACHADOR;
                    cb.GDE_ESTADO_MOVIL = rs_datos.GDE_ESTADO_MOVIL;
                    cb.EVIDENCIA_COORDENADA_X = rs_datos.EVIDENCIA_COORDENADA_X;
                    cb.EVIDENCIA_COORDENADA_Y = rs_datos.EVIDENCIA_COORDENADA_Y;
                    cb.ENVIADO = rs_datos.ENVIADO;
                    cb.TIPO_EVIDENCIA = rs_datos.TIPO_EVIDENCIA;
                    cb.ARCHIVO_FOTO = cb.ARCHIVO.substr(cb.ARCHIVO.lastIndexOf('/') + 1);
                    ar.push(cb);
                }
                typeof callback == "function" && callback(ar);

            }
        });

    });

}


function DATOS_asigna_rowid_evidencia(num_folio, callback) {
    //alert("a guardar gdep");
    //alert("NUM FOLIO ES "+num_folio);
    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT GDE.rowid FROM GDE WHERE ID_UNICO_MOVIL=?", [num_folio], function (tr, rs) {

            var n = rs.rows.length;
            //alert("tamaño es "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            } else {
                var rs_datos = rs.rows.item(0);
                var rowid = rs_datos.rowid;
                typeof callback == "function" && callback(rowid);
            }
        });
    });

}



function DATOS_existe_evidencia(folio, callback) {
    //alert("ID GDE EMN DATOS "+id);
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT * FROM GDE_EVIDENCIA WHERE ID_UNICO_MOVIL=? ", [folio], function (tr, rs) {
            var n = rs.rows.length;

            typeof callback == "function" && callback(n);

        });
    });
}




function DATOS_guardar_evidencia_guia(evidencia, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO GDE_EVIDENCIA (ID_UNICO_MOVIL, ID_GDE, ID_UNICO_MOVIL_GDE, FECHA_EVIDENCIA, OBSERVACION, ARCHIVO, ENVIADO, GDE_COD_DESPACHADOR, GDE_ESTADO_MOVIL, EVIDENCIA_COORDENADA_X, EVIDENCIA_COORDENADA_Y, TIPO_EVIDENCIA) VALUES(?,?,?, datetime('now','localtime'),?,?,?,?,?,?,?,?)", [evidencia.ID_UNICO_MOVIL, evidencia.ID_GDE, evidencia.ID_UNICO_MOVIL_GDE, evidencia.OBSERVACION, evidencia.ARCHIVO, evidencia.ENVIADO, Obtener_dato_local("rut_activo"), evidencia.GDE_ESTADO_MOVIL, evidencia.EVIDENCIA_COORDENADA_X, evidencia.EVIDENCIA_COORDENADA_Y, evidencia.TIPO_EVIDENCIA], function (tr, rs) {
            //vacio 1
            if (evidencia_actual.TIPO_EVIDENCIA == 1) {
                tr.executeSql("UPDATE GDE SET GDE_HORA_CARGUIO_INICIO = datetime('now','localtime') WHERE ROWID=?", [evidencia.ID_GDE], function (tr, rs) {
                    typeof callback == "function" && callback(rs);
                });

            } else if (evidencia_actual.TIPO_EVIDENCIA == 2) {
                tr.executeSql("UPDATE GDE SET GDE_HORA_CARGUIO_TERMINO = datetime('now','localtime') WHERE ROWID=?", [evidencia.ID_GDE], function (tr, rs) {
                    typeof callback == "function" && callback(rs);
                });
            } else {
                typeof callback == "function" && callback(rs);
            }
        });
    });

}



function DATOS_borra_evidencia_guia(evidencia, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM GDE_EVIDENCIA WHERE ID_GDE=? AND TIPO_EVIDENCIA=?", [evidencia.ID_GDE, evidencia.TIPO_EVIDENCIA], function (tr, rs) {
            typeof callback == "function" && callback(rs);

        });
    });
}



function DATOS_guardar_evidencia_guia_vuelta(evidencia, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO GDE_EVIDENCIA (ID_UNICO_MOVIL, ID_GDE, ID_UNICO_MOVIL_GDE, FECHA_EVIDENCIA, OBSERVACION, ARCHIVO, ENVIADO, GDE_COD_DESPACHADOR, GDE_ESTADO_MOVIL, ENVIADO_FOTO) VALUES(?,?,?, datetime('now','localtime'),?,?,?,?,?,?)", [evidencia.ID_UNICO_MOVIL, evidencia.ID_GDE, evidencia.ID_UNICO_MOVIL_GDE, evidencia.OBSERVACION, evidencia.ARCHIVO, evidencia.ENVIADO, Obtener_dato_local("rut_activo"), evidencia.GDE_ESTADO_MOVIL, evidencia.ENVIADO_FOTO], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });

}



function DATOS_actualizar_observacion_evidencia_guia(evidencia, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE_EVIDENCIA SET OBSERVACION=? WHERE ROWID=?", [evidencia.OBSERVACION, evidencia.ROWID], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}



function DATOS_cambiar_estado_gde_evidencia(id_gde, estado, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE_EVIDENCIA SET GDE_ESTADO_MOVIL=? WHERE ID_GDE=?", [estado, id_gde], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}





function DATOS_cambiar_estado_envio_gde_evidencia(id_unico_evidencia, estado, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE_EVIDENCIA SET  ENVIADO=? WHERE ID_UNICO_MOVIL=?", [estado, id_unico_evidencia], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}

function DATOS_cambiar_estado_envio_foto_gde_evidencia(id_unico_evidencia, estado, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE_EVIDENCIA SET  ENVIADO_FOTO=? WHERE ID_UNICO_MOVIL=?", [estado, id_unico_evidencia], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}



function DATOS_borrar_evidencia_guia(id_evidencia, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM GDE_EVIDENCIA WHERE rowid=?", [id_evidencia], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });



}