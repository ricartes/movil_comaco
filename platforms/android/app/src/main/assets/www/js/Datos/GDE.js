



function DATOS_BORRA_gdep_aserrable(ID_GDE, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM GDE_ASERRABLE WHERE GDE_ROWID=? ", [ID_GDE], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_cosecha_pagada(id_gde, valor, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_COSECHA_PAGADA=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_GuardaAlertaGeocerca(id_gde, tipo_alerta, valor, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {


        if (tipo_alerta == 1) {
            tr.executeSql("UPDATE GDE SET GDE_ALERTA_PUNTO_INICIAL=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
                //alert("si guardo");
                typeof callback == "function" && callback(rs);
            });
        }

        if (tipo_alerta == 2) {
            tr.executeSql("UPDATE GDE SET GDE_ALERTA_PUNTO_FINAL=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {

                typeof callback == "function" && callback(rs);
            });
        }


    });

}



function DATOS_actualiza_totales(id_gde, volumen, total, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_VOLUMEN_TOTAL=?, GDE_TOTAL=? WHERE ROWID=? ", [volumen, total, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}



function DATOS_Actualiza_PuntoInicial(id_gde, latitud, longitud, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_COORDENADA_INICIAL_X=?, GDE_COORDENADA_INICIAL_Y=?, GDE_HORA_PUNTO_INICIO=datetime('now','localtime') WHERE ROWID=?", [latitud, longitud, id_gde], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_Actualiza_PuntoFinal(id_gde, latitud, longitud, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_COORDENADA_FINAL_X=?, GDE_COORDENADA_FINAL_Y=?, GDE_HORA_PUNTO_FINAL=datetime('now','localtime') WHERE ROWID=? ", [latitud, longitud, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_comentario(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_COMENTARIO=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}



function DATOS_actualiza_horallegada(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_HORA_LLEGADA=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_horasalida(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_HORA_SALIDA=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_sectororigen(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_SECTOR_ORIGEN=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}

function DATOS_actualiza_destino(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_DESTINO=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_guiaproveedor(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_GUIA_PROVEEDOR=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}

function DATOS_actualiza_volumenproveedor(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_VOLUMEN_PROVEEDOR=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}

function DATOS_actualiza_aniocosecha(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_ANO_COSECHA=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_anioplantacion(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_ANIO_PLANTACION=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_planmanejo(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    //alert(valor+"-"+id_gde);
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_PLAN_MANEJO=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_motivo_anulacion_gde(id_gde, motivo, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_MOTIVO_ANULACION=? WHERE ROWID=? ", [motivo, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_cambiar_estado_gde(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {

        if (valor == "N") {
            tr.executeSql("UPDATE GDE SET GDE_ESTADO_MOVIL=?, GDE_ANULADA=1, GDE_FECHA_HORA=datetime('now','localtime') WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
                //alert("si guardo");
                typeof callback == "function" && callback(rs);
            });
        } else {
            tr.executeSql("UPDATE GDE SET GDE_ESTADO_MOVIL=?, GDE_FECHA_HORA=datetime('now','localtime') WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
                //alert("si guardo");
                typeof callback == "function" && callback(rs);
            });
        }
    });

}



function DATOS_descartar_borrador(id_gde, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM GDE WHERE ROWID=? ", [id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}



function DATOS_descartar_borrador_aserrable(id_gde, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM GDE_ASERRABLE WHERE GDE_ROWID=? ", [id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_descartar_borrador_pulpable(id_gde, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM GDE_PULPABLE WHERE GDE_ROWID=? ", [id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}






function DATOS_asigna_folio_gde(id_gde, num_folio, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_FOLIO=?, GDE_FECHA_EMISION=datetime('now','localtime'), GDE_FECHA_VENCIMIENTO=datetime('now','+1 day') WHERE ROWID=? ", [num_folio, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}






function DATOS_asigna_rowid_gde(num_folio, callback) {
    //alert("a guardar gdep");
    //alert("NUM FOLIO ES "+num_folio);
    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT GDE.rowid FROM GDE WHERE GDE_FOLIO=?", [num_folio], function (tr, rs) {

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









function DATOS_actualiza_largo_trozo_gde(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        //alert(valor);
        tr.executeSql("UPDATE GDE SET GDE_LARGO_TROZO=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_madera_pagada(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_MADERA_PAGADA=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}










function DATOS_borra_gde_estado(estado, callback) {
    //alert("ID GDE EMN DATOS "+id);
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM GDE  WHERE GDE_ESTADO_MOVIL=? ", [estado], function (tr, rs) {
            var n = rs.rows.length;
            //alert(n);
            typeof callback == "function" && callback(n);

        });
    });
}






function DATOS_cambiar_estado_envio_gde(valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET ENVIADO=?, GDE_ESTADO_MOVIL='E' WHERE ENVIADO=0 AND GDE_ESTADO_MOVIL IN('I','N') AND GDE_COD_DESPACHADOR=? ", [valor, Obtener_dato_local("rut_activo")], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_cambiar_estado_envio_gde_individual(num_folio, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET ENVIADO=?, GDE_ESTADO_MOVIL='E'  WHERE ID_UNICO_MOVIL=? ", [1, num_folio], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}





/*DESDE ACA NUEVOS METODOS DE GDE*/


function DATOS_guarda_gde_proveedor(GDE, callback) {
    //alert("a guaardar gde");
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    //alert("entra a guardar");
    //alert(GDE.GDE_Tipo_docto_ref);
    this.db.transaction(function (tr) {

        tr.executeSql("INSERT INTO GDE (GDE_COD_DESPACHADOR, GDE_FECHA_EMISION, EMP_ID, GDE_COD_TRANSPORTISTA, GDE_NOMBRE_TRANSPORTISTA, GDE_RUT_CONDUCTOR, GDE_NOM_CONDUCTOR, GDE_PATENTE_CAMION, GDE_PATENTE_CARRO, GDE_COORDENADA_X, GDE_COORDENADA_Y, GDE_COD_CLIENTE, GDE_NOMBRE_CLIENTE, GDE_DESTINO, GDE_COD_PROYECTO, GDE_NOMBRE_PREDIO, GDE_ROL_COMUNA, GDE_ROL, GDE_COD_PRODUCTO, GDE_NOMBRE_PRODUCTO, ID_UNICO_MOVIL, GDE_ESTADO_MOVIL, DocEntry, ENVIADO, GDE_COORDENADA_INICIAL_X, GDE_COORDENADA_INICIAL_Y, GDE_HORA_PUNTO_INICIO, GDE_COD_ORIGEN) VALUES(?, datetime('now','localtime'),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'),?)", [GDE.GDE_COD_DESPACHADOR, GDE.EMP_ID, GDE.GDE_COD_TRANSPORTISTA, GDE.GDE_NOMBRE_TRANSPORTISTA, GDE.GDE_RUT_CONDUCTOR, GDE.GDE_NOM_CONDUCTOR, GDE.GDE_PATENTE_CAMION, GDE.GDE_PATENTE_CARRO, GDE.GDE_COORDENADA_X, GDE.GDE_COORDENADA_Y, GDE.GDE_COD_CLIENTE, GDE.GDE_NOMBRE_CLIENTE, GDE.GDE_DESTINO, GDE.GDE_COD_PROYECTO, GDE.GDE_NOMBRE_PREDIO, GDE.GDE_ROL_COMUNA, GDE.GDE_ROL, GDE.GDE_COD_PRODUCTO, GDE.GDE_NOMBRE_PRODUCTO, GDE.ID_UNICO_MOVIL, GDE.GDE_ESTADO_MOVIL, GDE.DocEntry, GDE.ENVIADO, GDE.GDE_COORDENADA_INICIAL_X, GDE.GDE_COORDENADA_INICIAL_Y, GDE.GDE_COD_ORIGEN], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}

function DATOS_actualiza_gde_proveedor(GDE, rowid, callback) {
    //alert("a guaardar gde");
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    //alert("entra a guardar");
    //alert(GDE.GDE_Tipo_docto_ref);
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_COD_DESPACHADOR=?, GDE_FECHA_EMISION=datetime('now','localtime'), EMP_ID=?, GDE_COD_TRANSPORTISTA=?, GDE_NOMBRE_TRANSPORTISTA=?, GDE_RUT_CONDUCTOR=?, GDE_NOM_CONDUCTOR=?, GDE_PATENTE_CAMION=?, GDE_PATENTE_CARRO=?, GDE_COORDENADA_X=?, GDE_COORDENADA_Y=?, GDE_COD_CLIENTE=?, GDE_NOMBRE_CLIENTE=?, GDE_DESTINO=?, GDE_COD_PROYECTO=?, GDE_NOMBRE_PREDIO=?, GDE_ROL_COMUNA=?, GDE_ROL=?, GDE_COD_PRODUCTO=?, GDE_NOMBRE_PRODUCTO=?, DocEntry=?, GDE_PATENTE_EX=?, GDE_COD_ORIGEN=?  WHERE ROWID=?", [GDE.GDE_COD_DESPACHADOR, GDE.EMP_ID, GDE.GDE_COD_TRANSPORTISTA, GDE.GDE_NOMBRE_TRANSPORTISTA, GDE.GDE_RUT_CONDUCTOR, GDE.GDE_NOM_CONDUCTOR, GDE.GDE_PATENTE_CAMION, GDE.GDE_PATENTE_CARRO, GDE.GDE_COORDENADA_X, GDE.GDE_COORDENADA_Y, GDE.GDE_COD_CLIENTE, GDE.GDE_NOMBRE_CLIENTE, GDE.GDE_DESTINO, GDE.GDE_COD_PROYECTO, GDE.GDE_NOMBRE_PREDIO, GDE.GDE_ROL_COMUNA, GDE.GDE_ROL, GDE.GDE_COD_PRODUCTO, GDE.GDE_NOMBRE_PRODUCTO, GDE.DocEntry, GDE.GDE_PATENTE_EX, GDE.GDE_COD_ORIGEN, rowid], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}




function DATOS_guarda_gde_proveedor_vuelta(GDE, callback) {
    //alert("a guaardar gde");
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    //alert("entra a guardar");
    //alert(GDE.GDE_Tipo_docto_ref);
    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO GDE (GDE_COD_DESPACHADOR,GDE_FECHA_EMISION, EMP_ID, GDE_COD_TRANSPORTISTA,GDE_NOMBRE_TRANSPORTISTA, GDE_RUT_CONDUCTOR, GDE_NOM_CONDUCTOR, GDE_PATENTE_CAMION, GDE_PATENTE_CARRO, GDE_COMENTARIO, GDE_GUIA_PROVEEDOR, GDE_VOLUMEN_PROVEEDOR, GDE_COORDENADA_X, GDE_COORDENADA_Y, GDE_COD_CLIENTE, GDE_NOMBRE_CLIENTE, GDE_DESTINO, GDE_COD_PROYECTO, GDE_NOMBRE_PREDIO, GDE_ROL_COMUNA, GDE_ROL, GDE_COD_PRODUCTO, GDE_NOMBRE_PRODUCTO, ID_UNICO_MOVIL, GDE_ESTADO_MOVIL, DocEntry, ENVIADO, GDE_COORDENADA_INICIAL_X, GDE_COORDENADA_INICIAL_Y, GDE_COORDENADA_FINAL_X, GDE_COORDENADA_FINAL_Y, GDE_HORA_PUNTO_INICIO, GDE_HORA_PUNTO_FINAL, GDE_PATENTE_EX, GDE_COD_ORIGEN) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [GDE.GDE_COD_DESPACHADOR, GDE.GDE_FECHA_EMISION, GDE.EMP_ID, GDE.GDE_COD_TRANSPORTISTA, GDE.GDE_NOMBRE_TRANSPORTISTA, GDE.GDE_RUT_CONDUCTOR, GDE.GDE_NOM_CONDUCTOR, GDE.GDE_PATENTE_CAMION, GDE.GDE_PATENTE_CARRO, GDE.GDE_COMENTARIO, GDE.GDE_GUIA_PROVEEDOR, GDE.GDE_VOLUMEN_PROVEEDOR, GDE.GDE_COORDENADA_X, GDE.GDE_COORDENADA_Y, GDE.GDE_COD_CLIENTE, GDE.GDE_NOMBRE_CLIENTE, GDE.GDE_DESTINO, GDE.GDE_COD_PROYECTO, GDE.GDE_NOMBRE_PREDIO, GDE.GDE_ROL_COMUNA, GDE.GDE_ROL, GDE.GDE_COD_PRODUCTO, GDE.GDE_NOMBRE_PRODUCTO, GDE.ID_UNICO_MOVIL, GDE.GDE_ESTADO_MOVIL, GDE.DocEntry, GDE.ENVIADO, GDE.GDE_COORDENADA_INICIAL_X, GDE.GDE_COORDENADA_INICIAL_Y, GDE.GDE_COORDENADA_FINAL_X, GDE.GDE_COORDENADA_FINAL_Y, GDE.GDE_HORA_PUNTO_INICIO, GDE.GDE_HORA_PUNTO_FINAL, GDE.GDE_PATENTE_EX, GDE.GDE_COD_ORIGEN], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}



function DATOS_seleccionar_gde_proveedor_por_estado_lista_PRUEBA(estado, fecha_inicial, fecha_final, numero_guia, callback) {



    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT g.*, g.rowid,  strftime('%d-%m-%Y %H:%M', g.GDE_FECHA_EMISION) AS GDE_FECHA_FORMAT FROM GDE g WHERE GDE_COD_DESPACHADOR=? AND ( (strftime('%Y-%m-%d', g.GDE_FECHA_EMISION) BETWEEN ? AND ?) OR (?='' AND ?='' )  )", [Obtener_dato_local("rut_activo"), fecha_inicial, fecha_final, fecha_inicial, fecha_final], function (tr, rs) {
            var n = rs.rows.length;
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var ar = [];
                var conta = 0;
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var gde = new CL_GDE();
                    gde.ROWID = rs_datos.rowid;
                    gde.GDE_COD_DESPACHADOR = rs_datos.GDE_COD_DESPACHADOR;
                    gde.GDE_FECHA_EMISION = rs_datos.GDE_FECHA_EMISION;
                    gde.EMP_ID = rs_datos.EMP_ID;
                    gde.GDE_FECHA_EMISION = rs_datos.GDE_FECHA_EMISION;
                    gde.GDE_FECHA_FORMAT = rs_datos.GDE_FECHA_FORMAT;
                    gde.GDE_COD_TRANSPORTISTA = rs_datos.GDE_COD_TRANSPORTISTA;
                    gde.GDE_NOMBRE_TRANSPORTISTA = rs_datos.GDE_NOMBRE_TRANSPORTISTA;
                    gde.GDE_RUT_CONDUCTOR = rs_datos.GDE_RUT_CONDUCTOR;
                    gde.GDE_NOM_CONDUCTOR = rs_datos.GDE_NOM_CONDUCTOR;
                    gde.GDE_PATENTE_CARRO = rs_datos.GDE_PATENTE_CARRO;
                    gde.GDE_PATENTE_CAMION = rs_datos.GDE_PATENTE_CAMION;
                    gde.GDE_COMENTARIO = rs_datos.GDE_COMENTARIO;
                    gde.GDE_GUIA_PROVEEDOR = rs_datos.GDE_GUIA_PROVEEDOR;
                    gde.GDE_VOLUMEN_PROVEEDOR = rs_datos.GDE_VOLUMEN_PROVEEDOR;
                    gde.GDE_COORDENADA_X = rs_datos.GDE_COORDENADA_X;
                    gde.GDE_COORDENADA_Y = rs_datos.GDE_COORDENADA_Y;
                    gde.GDE_COD_CLIENTE = rs_datos.GDE_COD_CLIENTE;
                    gde.GDE_NOMBRE_CLIENTE = rs_datos.GDE_NOMBRE_CLIENTE;
                    gde.GDE_DESTINO = rs_datos.GDE_DESTINO;
                    gde.GDE_COD_PROYECTO = rs_datos.GDE_COD_PROYECTO;
                    gde.GDE_NOMBRE_PREDIO = rs_datos.GDE_NOMBRE_PREDIO;
                    gde.GDE_ROL_COMUNA = rs_datos.GDE_ROL_COMUNA;
                    gde.GDE_ROL = rs_datos.GDE_ROL;
                    gde.GDE_COD_PRODUCTO = rs_datos.GDE_COD_PRODUCTO;
                    gde.GDE_NOMBRE_PRODUCTO = rs_datos.GDE_NOMBRE_PRODUCTO;
                    gde.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                    gde.GDE_ESTADO_MOVIL = rs_datos.GDE_ESTADO_MOVIL;
                    gde.GDE_ANO_COSECHA = rs_datos.GDE_ANO_COSECHA;
                    gde.GDE_ALERTA_PUNTO_INICIAL = rs_datos.GDE_ALERTA_PUNTO_INICIAL;
                    gde.GDE_ALERTA_PUNTO_FINAL = rs_datos.GDE_ALERTA_PUNTO_FINAL;
                    gde.DocEntry = rs_datos.DocEntry;
                    gde.RUT_USUARIO_PROV = Obtener_dato_local("user_activo");
                    gde.NOMBRE_USUARIO_PROV = Obtener_dato_local("nombre_activo");
                    gde.GDE_COD_ORIGEN = rs_datos.GDE_COD_ORIGEN;
                    gde.GDE_HORA_CARGUIO_INICIO = rs_datos.GDE_HORA_CARGUIO_INICIO;
                    gde.GDE_HORA_CARGUIO_TERMINO = rs_datos.GDE_HORA_CARGUIO_TERMINO;
                    gde.GDE_MOTIVO_ANULACION = rs_datos.GDE_MOTIVO_ANULACION;
                    gde.GDE_CAPTURA_FOTO_CAMION_VACIO = rs_datos.GDE_CAPTURA_FOTO_CAMION_VACIO;
                    gde.GDE_CONFIRMA_INGRESO_PLANTA = rs_datos.GDE_CONFIRMA_INGRESO_PLANTA;
                    gde.ENVIADO = rs_datos.ENVIADO;
                    ar.push(gde);


                }

                typeof callback == "function" && callback(ar);
            }
        });
    });
}


function DATOS_existe_guia(folio, callback) {
    //alert("ID GDE EMN DATOS "+id);
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT * FROM GDE WHERE ID_UNICO_MOVIL=? ", [folio], function (tr, rs) {
            var n = rs.rows.length;

            typeof callback == "function" && callback(n);

        });
    });
}



function DATOS_seleccionar_puntosGDE(id_gde, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT g.rowid, g.GDE_COORDENADA_INICIAL_X, g.GDE_COORDENADA_INICIAL_Y, g.GDE_COORDENADA_FINAL_X, g.GDE_COORDENADA_FINAL_Y, g.GDE_HORA_PUNTO_INICIO, g.GDE_HORA_PUNTO_FINAL FROM GDE g WHERE g.rowid=?", [id_gde], function (tr, rs) {


            var rs_datos = rs.rows.item(0);
            var gde = new CL_GDE();


            gde.GDE_COORDENADA_INICIAL_X = rs_datos.GDE_COORDENADA_INICIAL_X;
            gde.GDE_COORDENADA_INICIAL_Y = rs_datos.GDE_COORDENADA_INICIAL_Y;
            gde.GDE_COORDENADA_FINAL_X = rs_datos.GDE_COORDENADA_FINAL_X;
            gde.GDE_COORDENADA_FINAL_Y = rs_datos.GDE_COORDENADA_FINAL_Y;
            gde.GDE_HORA_PUNTO_INICIO = rs_datos.GDE_HORA_PUNTO_INICIO;
            gde.GDE_HORA_PUNTO_FINAL = rs_datos.GDE_HORA_PUNTO_FINAL;
            typeof callback == "function" && callback(gde);
        });
    });

}

function DATOS_seleccionar_gde_proveedor(id_gde, callback) {



    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT g.*, g.rowid,  strftime('%d-%m-%Y %H:%M', g.GDE_FECHA_EMISION) AS GDE_FECHA_FORMAT FROM GDE g WHERE g.rowid=?", [id_gde], function (tr, rs) {
            var n = rs.rows.length;
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var ar = [];
                var conta = 0;
                var rs_datos = rs.rows.item(0);
                var gde = new CL_GDE();
                gde.ROWID = rs_datos.rowid;
                gde.GDE_COD_DESPACHADOR = rs_datos.GDE_COD_DESPACHADOR;
                gde.GDE_FECHA_EMISION = rs_datos.GDE_FECHA_EMISION;
                gde.EMP_ID = rs_datos.EMP_ID;
                gde.GDE_FECHA_EMISION = rs_datos.GDE_FECHA_EMISION;
                gde.GDE_FECHA_FORMAT = rs_datos.GDE_FECHA_FORMAT;
                gde.GDE_COD_TRANSPORTISTA = rs_datos.GDE_COD_TRANSPORTISTA;
                gde.GDE_NOMBRE_TRANSPORTISTA = rs_datos.GDE_NOMBRE_TRANSPORTISTA;
                gde.GDE_RUT_CONDUCTOR = rs_datos.GDE_RUT_CONDUCTOR;
                gde.GDE_NOM_CONDUCTOR = rs_datos.GDE_NOM_CONDUCTOR;

                gde.GDE_PATENTE_CAMION = rs_datos.GDE_PATENTE_CAMION;
                gde.GDE_PATENTE_CARRO = rs_datos.GDE_PATENTE_CARRO;


                gde.GDE_COMENTARIO = rs_datos.GDE_COMENTARIO;

                gde.GDE_GUIA_PROVEEDOR = rs_datos.GDE_GUIA_PROVEEDOR;

                gde.GDE_VOLUMEN_PROVEEDOR = rs_datos.GDE_VOLUMEN_PROVEEDOR;
                gde.GDE_COORDENADA_X = rs_datos.GDE_COORDENADA_X;
                gde.GDE_COORDENADA_Y = rs_datos.GDE_COORDENADA_Y;
                gde.GDE_COD_CLIENTE = rs_datos.GDE_COD_CLIENTE;
                gde.GDE_NOMBRE_CLIENTE = rs_datos.GDE_NOMBRE_CLIENTE;
                gde.GDE_DESTINO = rs_datos.GDE_DESTINO;
                gde.GDE_COD_PROYECTO = rs_datos.GDE_COD_PROYECTO;
                gde.GDE_NOMBRE_PREDIO = rs_datos.GDE_NOMBRE_PREDIO;
                gde.GDE_ROL_COMUNA = rs_datos.GDE_ROL_COMUNA;
                gde.GDE_ROL = rs_datos.GDE_ROL;

                gde.GDE_COD_PRODUCTO = rs_datos.GDE_COD_PRODUCTO;
                gde.GDE_NOMBRE_PRODUCTO = rs_datos.GDE_NOMBRE_PRODUCTO;
                gde.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                gde.GDE_ESTADO_MOVIL = rs_datos.GDE_ESTADO_MOVIL;
                gde.DocEntry = rs_datos.DocEntry;
                gde.GDE_ANO_COSECHA = rs_datos.GDE_ANO_COSECHA;
                gde.GDE_COORDENADA_INICIAL_X = rs_datos.GDE_COORDENADA_INICIAL_X;
                gde.GDE_COORDENADA_INICIAL_Y = rs_datos.GDE_COORDENADA_INICIAL_Y;
                gde.GDE_COORDENADA_FINAL_X = rs_datos.GDE_COORDENADA_FINAL_X;
                gde.GDE_COORDENADA_FINAL_Y = rs_datos.GDE_COORDENADA_FINAL_Y;
                gde.GDE_HORA_PUNTO_INICIO = rs_datos.GDE_HORA_PUNTO_INICIO;
                gde.GDE_HORA_PUNTO_FINAL = rs_datos.GDE_HORA_PUNTO_FINAL;
                gde.GDE_ACTUALIZA_NUM_GUIA = rs_datos.GDE_ACTUALIZA_NUM_GUIA;
                gde.GDE_COD_ORIGEN = rs_datos.GDE_COD_ORIGEN;
                gde.GDE_HORA_CARGUIO_INICIO = rs_datos.GDE_HORA_CARGUIO_INICIO;
                gde.GDE_HORA_CARGUIO_TERMINO = rs_datos.GDE_HORA_CARGUIO_TERMINO;
                gde.GDE_MOTIVO_ANULACION = rs_datos.GDE_MOTIVO_ANULACION;
                gde.GDE_CAPTURA_FOTO_CAMION_VACIO = rs_datos.GDE_CAPTURA_FOTO_CAMION_VACIO;
                gde.GDE_CONFIRMA_INGRESO_PLANTA = rs_datos.GDE_CONFIRMA_INGRESO_PLANTA;
                typeof callback == "function" && callback(gde);
            }
        });
    });
}



function DATOS_cambiar_estado_gde_proveedores(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {

        if (valor == "N") {
            tr.executeSql("UPDATE GDE SET GDE_ESTADO_MOVIL=?, GDE_FECHA_EMISION=datetime('now','localtime') WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
                //alert("si guardo");
                typeof callback == "function" && callback(rs);
            });
        } else {
            tr.executeSql("UPDATE GDE SET GDE_ESTADO_MOVIL=?, GDE_FECHA_EMISION=datetime('now','localtime') WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
                //alert("si guardo");
                typeof callback == "function" && callback(rs);
            });
        }
    });

}


function DATOS_cambiar_estado_envio_gde_actualizada(id_gde_movil, estado_origen, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {

        if (estado_origen == "W") {
            tr.executeSql("UPDATE GDE SET ENVIADO_NUM_GUIA=1, GDE_ACTUALIZA_NUM_GUIA=-1  WHERE ID_UNICO_MOVIL=? ", [id_gde_movil], function (tr, rs) {
                typeof callback == "function" && callback(rs);
            });
        } else {
            tr.executeSql("UPDATE GDE SET ENVIADO_NUM_GUIA=1, GDE_ACTUALIZA_NUM_GUIA=1 WHERE ID_UNICO_MOVIL=? ", [id_gde_movil], function (tr, rs) {
                typeof callback == "function" && callback(rs);
            });
        }
    });

}




function DATOS_seleccionar_gde_proveedor_por_enviar(estado, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT GDE.*, GDE.rowid FROM GDE WHERE GDE_COD_DESPACHADOR=? AND ENVIADO=? AND GDE_ESTADO_MOVIL IN(?,?)", [Obtener_dato_local("rut_activo"), "0", "I", "N"], function (tr, rs) {
            var n = rs.rows.length;
            //alert(n +"GDE POR ENVIAR");
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var gde = new CL_GDE();
                    gde.ROWID = rs_datos.rowid;
                    gde.GDE_COD_DESPACHADOR = rs_datos.GDE_COD_DESPACHADOR;
                    gde.GDE_FECHA_EMISION = rs_datos.GDE_FECHA_EMISION;
                    gde.EMP_ID = rs_datos.EMP_ID;
                    gde.GDE_FECHA_EMISION = rs_datos.GDE_FECHA_EMISION;
                    gde.GDE_FECHA_FORMAT = rs_datos.GDE_FECHA_FORMAT;
                    gde.GDE_COD_TRANSPORTISTA = rs_datos.GDE_COD_TRANSPORTISTA;
                    gde.GDE_NOMBRE_TRANSPORTISTA = rs_datos.GDE_NOMBRE_TRANSPORTISTA;
                    gde.GDE_RUT_CONDUCTOR = rs_datos.GDE_RUT_CONDUCTOR;
                    gde.GDE_NOM_CONDUCTOR = rs_datos.GDE_NOM_CONDUCTOR;
                    gde.GDE_PATENTE_CARRO = rs_datos.GDE_PATENTE_CARRO;
                    gde.GDE_PATENTE_CAMION = rs_datos.GDE_PATENTE_CAMION;
                    gde.GDE_COMENTARIO = rs_datos.GDE_COMENTARIO;
                    gde.GDE_GUIA_PROVEEDOR = rs_datos.GDE_GUIA_PROVEEDOR;
                    gde.GDE_VOLUMEN_PROVEEDOR = rs_datos.GDE_VOLUMEN_PROVEEDOR;
                    gde.GDE_COORDENADA_X = rs_datos.GDE_COORDENADA_X;
                    gde.GDE_COORDENADA_Y = rs_datos.GDE_COORDENADA_Y;
                    gde.GDE_COD_CLIENTE = rs_datos.GDE_COD_CLIENTE;
                    gde.GDE_NOMBRE_CLIENTE = rs_datos.GDE_NOMBRE_CLIENTE;
                    gde.GDE_DESTINO = rs_datos.GDE_DESTINO;
                    gde.GDE_COD_PROYECTO = rs_datos.GDE_COD_PROYECTO;
                    gde.GDE_NOMBRE_PREDIO = rs_datos.GDE_NOMBRE_PREDIO;
                    gde.GDE_ROL_COMUNA = rs_datos.GDE_ROL_COMUNA;
                    gde.GDE_ROL = rs_datos.GDE_ROL;
                    gde.GDE_COD_PRODUCTO = rs_datos.GDE_COD_PRODUCTO;
                    gde.GDE_ANO_COSECHA = rs_datos.GDE_ANO_COSECHA;
                    gde.GDE_NOMBRE_PRODUCTO = rs_datos.GDE_NOMBRE_PRODUCTO;
                    gde.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                    gde.GDE_ESTADO_MOVIL = rs_datos.GDE_ESTADO_MOVIL;
                    gde.DocEntry = rs_datos.DocEntry;
                    gde.GDE_COORDENADA_INICIAL_X = rs_datos.GDE_COORDENADA_INICIAL_X;
                    gde.GDE_COORDENADA_INICIAL_Y = rs_datos.GDE_COORDENADA_INICIAL_Y;
                    gde.GDE_COORDENADA_FINAL_X = rs_datos.GDE_COORDENADA_FINAL_X;
                    gde.GDE_COORDENADA_FINAL_Y = rs_datos.GDE_COORDENADA_FINAL_Y;
                    gde.GDE_HORA_PUNTO_INICIO = rs_datos.GDE_HORA_PUNTO_INICIO;
                    gde.GDE_HORA_PUNTO_FINAL = rs_datos.GDE_HORA_PUNTO_FINAL;
                    gde.GDE_PATENTE_EX = rs_datos.GDE_PATENTE_EX;
                    gde.GDE_ACTUALIZA_NUM_GUIA = rs_datos.GDE_ACTUALIZA_NUM_GUIA;
                    gde.GDE_ALERTA_PUNTO_INICIAL = rs_datos.GDE_ALERTA_PUNTO_INICIAL;
                    gde.GDE_ALERTA_PUNTO_FINAL = rs_datos.GDE_ALERTA_PUNTO_FINAL;
                    gde.GDE_COD_ORIGEN = rs_datos.GDE_COD_ORIGEN;
                    gde.GDE_HORA_CARGUIO_INICIO = rs_datos.GDE_HORA_CARGUIO_INICIO;
                    gde.GDE_HORA_CARGUIO_TERMINO = rs_datos.GDE_HORA_CARGUIO_TERMINO;
                    gde.GDE_MOTIVO_ANULACION = rs_datos.GDE_MOTIVO_ANULACION;
                    gde.GDE_CAPTURA_FOTO_CAMION_VACIO = rs_datos.GDE_CAPTURA_FOTO_CAMION_VACIO;
                    gde.GDE_CONFIRMA_INGRESO_PLANTA = rs_datos.GDE_CONFIRMA_INGRESO_PLANTA;
                    gde.VERSION_APP = Obtener_dato_local("version_app");
                    ar.push(gde);
                }

                typeof callback == "function" && callback(ar);
            }
        });
    });
}

async function DATOS_seleccionarGdeProveedorNoConfirmadas() {
    // Abrir la base de datos
    const db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: "default", androidDatabaseImplementation: 2 });
  
    return new Promise((resolve, reject) => {
      db.transaction(function (tr) {
        tr.executeSql(
          "SELECT GDE.*, GDE.rowid FROM GDE WHERE GDE_COD_DESPACHADOR=? AND ENVIADO=? AND GDE_ESTADO_MOVIL =? AND (GDE_CONFIRMA_INGRESO_PLANTA=0)",
          [Obtener_dato_local("rut_activo"), "1", "E"],
          function (tr, rs) {
            const n = rs.rows.length;
            if (n === 0) {
              resolve(-1); // Resolver con -1 si no hay registros
            } else {
              const ar = [];
              for (let i = 0; i < n; i++) {
                const rs_datos = rs.rows.item(i);
                const gde = new CL_GDE();
                gde.ROWID = rs_datos.rowid;
                gde.EMP_ID = rs_datos.EMP_ID;
                gde.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                gde.GDE_ESTADO_MOVIL = rs_datos.GDE_ESTADO_MOVIL;
                gde.VERSION_APP = Obtener_dato_local("version_app");
                ar.push(gde);
              }
              resolve(ar); // Resolver con los datos procesados
            }
          },
          function (tr, error) {
            reject(error); // Rechazar la promesa en caso de error
          }
        );
      });
    });
  }
  



function DATOS_seleccionar_gde_actualizada_por_enviar(estado, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    //alert("entro a guardar gde");
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT GDE.GDE_GUIA_PROVEEDOR, GDE.ID_UNICO_MOVIL FROM GDE WHERE GDE_COD_DESPACHADOR=? AND ENVIADO=? AND GDE_ESTADO_MOVIL =? AND GDE_ACTUALIZA_NUM_GUIA=? AND ENVIADO_NUM_GUIA=?", [Obtener_dato_local("rut_activo"), "1", "E", "1", "0"], function (tr, rs) {
            var n = rs.rows.length;

            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var gde = new CL_GDE();
                    gde.GDE_GUIA_PROVEEDOR = rs_datos.GDE_GUIA_PROVEEDOR;
                    gde.ID_UNICO_MOVIL = rs_datos.ID_UNICO_MOVIL;
                    gde.VERSION_APP = Obtener_dato_local("version_app");
                    ar.push(gde);

                }

                typeof callback == "function" && callback(ar);
            }
        });
    });
}





function DATOS_asigna_coordenadas(GDE, callback) {
    //alert("a guardar gdep");
    //alert(GDE.GDE_COORDENADA_X+" "+GDE.GDE_COORDENADA_Y)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_COORDENADA_X=?, GDE_COORDENADA_Y=? WHERE ROWID=? ", [GDE.GDE_COORDENADA_X, GDE.GDE_COORDENADA_Y, GDE.ROWID], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_cambiaEstadoCamionVacio(idGde, valor) {
    return new Promise((resolve, reject) => {
        this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
        this.db.transaction(function (tr) {
            tr.executeSql("UPDATE GDE SET GDE_CAPTURA_FOTO_CAMION_VACIO=? WHERE ROWID=? ", [valor, idGde], function (tr, rs) {
                resolve(rs);
            }, function (tr, error) {
                reject(error);
            });
        });
    });
}


//enviar con: actualiza_num_guia=1
//            enviado = 1 
//            enviado_actualiza = 0 
/*al enviar:  cambiar enviado_actualiza=1*/
function DATOS_actualiza_num_guia(id_gde, valor, flag, callback) {
    //si flag = 1, actualizo el campo cambia numero_guia
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {

        if (flag == 0) {
            tr.executeSql("UPDATE GDE SET GDE_GUIA_PROVEEDOR=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
                typeof callback == "function" && callback(rs);
            });
        }
        if (flag == 1) {

            tr.executeSql("UPDATE GDE SET GDE_GUIA_PROVEEDOR=?, GDE_ACTUALIZA_NUM_GUIA=1, ENVIADO_NUM_GUIA=0 WHERE ROWID=?", [valor, id_gde], function (tr, rs) {
                typeof callback == "function" && callback(rs);
            });
        }


    });

}


function DATOS_actualiza_volumen_proveedor(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_VOLUMEN_PROVEEDOR=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_anio_cosecha(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_ANO_COSECHA=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualiza_comentarios(id_gde, valor, callback) {
    //alert("a guardar gdep");

    //alert("ALTURA_IZQUIERDA: "+GDEP.ALTURA_IZQUIERDA)
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("UPDATE GDE SET GDE_COMENTARIO=? WHERE ROWID=? ", [valor, id_gde], function (tr, rs) {
            //alert("si guardo");
            typeof callback == "function" && callback(rs);
        });
    });

}