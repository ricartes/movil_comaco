function borra_usuario_zona(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM USUARIO_ZONA", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}


function borra_orden_compra(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM ORDEN_COMPRA", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}


function borra_empresa(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM EMPRESA", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}

function borra_parametro_general(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM PARAMETRO_GENERAL", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}





function borra_orden_venta(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM ORDEN_VENTA", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}

function borra_transporte(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM TRANSPORTE", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}



function borra_patente_ex(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM PATENTE_EX", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}

function borra_socio(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM SOCIO", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}

function borra_precio_producto(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM PRECIO_PRODUCTO", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}


function nuevo_orden_compra(ordencompra, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    /*alert(ordencompra.PRECIO_COSECHA);
    alert(ordencompra.PRECIO_CARGADOR);
    alert(ordencompra.PRECIO_DESCARGADOR);
    alert(ordencompra.PRECIO_FLETE);*/
    //alert(ordencompra.GROUNUM);
    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO ORDEN_COMPRA (DocEntry, C_codigo, SN_Nombre, SN_Destino, project, NumAtCard, ItemCode, Description, U_ClienteDestino, Rol, Predio, Rol_comuna, Fec_fin, latitud_geocerca, longitud_geocerca, radio_geocerca, flag_geocerca, tiempo_espera_carguio) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [ordencompra.DocEntry, ordencompra.C_codigo, ordencompra.SN_Nombre, ordencompra.SN_Destino, ordencompra.project, ordencompra.NumAtCard, ordencompra.ItemCode, ordencompra.Description, ordencompra.U_ClienteDestino, ordencompra.Rol, ordencompra.Predio, ordencompra.Rol_comuna, ordencompra.Fec_fin, ordencompra.latitud_geocerca, ordencompra.longitud_geocerca, ordencompra.radio_geocerca, ordencompra.flag_geocerca, ordencompra.tiempo_espera_carguio], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}





function nuevo_orden_venta(ordenventa, callback) {

    //alert(ordenventa.NUM_DOCUMENTO)
    //alert("nuevo orden venta");
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO ORDEN_VENTA VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [ordenventa.NUM_DOCUMENTO, ordenventa.COD_PROYECTO, ordenventa.COD_CLIENTE, ordenventa.NOM_CLIENTE, ordenventa.COD_PRODUCTO, ordenventa.NOM_PRODUCTO, ordenventa.UNIDAD_MEDIDA, ordenventa.COD_ZONA, ordenventa.LARGO_TROZO, ordenventa.COD_OC_REFERENCIA, ordenventa.OC_REFERENCIA, ordenventa.FECHA_OC_REFERENCIA, ordenventa.COMENTARIO, ordenventa.DESTINO_CLIENTE], function (tr, rs) {


            typeof callback == "function" && callback(rs);
        });
    });
}


function nuevo_precio_producto(ppr, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO PRECIO_PRODUCTO VALUES(?,?,?,?,?,?)", [ppr.EMP_ID, ppr.PPR_COD_PRODUCTO, ppr.PPR_COD_CLIENTE, ppr.PPR_FECHA_INICIAL, ppr.PPR_FECHA_FINAL, ppr.PPR_PRECIO], function (tr, rs) {

            //alert("nuevo precio product");
            typeof callback == "function" && callback(rs);
        });
    });
}




function nuevo_parametro_general(param, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO PARAMETRO_GENERAL VALUES(?,?,?,?)", [param.EMP_ID, param.PAG_ID, param.PAG_GLOSA, param.PAG_VALOR], function (tr, rs) {

            //alert("nuevo precio product");
            typeof callback == "function" && callback(rs);
        });
    });
}


function nuevo_empresa(emp, callback) {

    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO EMPRESA VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [emp.EMP_ID, emp.EMP_RUT, emp.EMP_RUT_DV, emp.EMP_RAZON_SOCIAL, emp.EMP_DIRECCION, emp.EMP_COMUNA, emp.EMP_CIUDAD, emp.EMP_GIRO, emp.EMP_MAIL, emp.EMP_TELEFONO, emp.EMP_ACTIVIDAD_ECONOMICA, emp.EMP_NRO_RESOLUCION, emp.EMP_ANIO_RESOLUCION, emp.EMP_COMUNA_SII], function (tr, rs) {

            //alert("nuevo empresa insert");
            typeof callback == "function" && callback(rs);
        });
    });
}



function nuevo_transporte(transporte, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO TRANSPORTE VALUES(?,?,?,?,?,?,?)", [transporte.PAT_CAMION, transporte.PAT_CARRO, transporte.COD_TRANSPORTISTA, transporte.RUT_TRANSPORTISTA, transporte.NOMBRE_TRANSPORTISTA, transporte.RUT_CHOFER, transporte.NOMBRE_CHOFER], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}


function nuevo_patente_ex(transporte, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO PATENTE_EX VALUES(?,?)", [transporte.PAT_CAMION, transporte.FLAG], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}


function nuevo_socio(socio, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO SOCIO VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", [socio.CODIGO, socio.RUT, socio.RAZON_SOCIAL, socio.GIRO, socio.CIUDAD, socio.COMUNA, socio.DIRECCION, socio.TELEFONO, socio.PAIS, socio.TRANSPORTISTA, socio.CARGADOR, socio.DESCARGADOR, socio.CONTRATISTA], function (tr, rs) {
            typeof callback == "function" && callback(rs);
            //alert(socio.cargador);
        });
    });
}




function nuevo_proveedor_zona(proveedor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO PROVEEDOR_ZONA VALUES(?,?,?)", [proveedor.cod_zona, proveedor.cod_proveedor, proveedor.nombre_proveedor], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}


function DATOS_seleccionar_zonas(usuario, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT (UPPER(COD_ENCARGADO)) AS COD_ENCARGADO , DESCRIPPCION_ZONA FROM ORDEN_COMPRA", [], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var cb = new CL_ComboBox(rs_datos.COD_ENCARGADO, rs_datos.DESCRIPPCION_ZONA.trim());
                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}




function DATOS_seleccionar_zonas_por_codigo(codigo, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT  (UPPER(COD_ENCARGADO)) AS COD_ENCARGADO , DESCRIPPCION_ZONA FROM ORDEN_COMPRA WHERE COD_ENCARGADO= ?  ", [codigo], function (tr, rs) {

            var n = rs.rows.length;
            //alert("HAY "+n+"zonas");

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];

                var rs_datos = rs.rows.item(0);
                var cb = new CL_ComboBox(rs_datos.COD_ENCARGADO, rs_datos.DESCRIPPCION_ZONA.trim());
                //alert(rs_datos.COD_ENCARGADO+""+rs_datos.DESCRIPPCION_ZONA.trim())
                //ar.push(cb);


                //alert(ar);
                typeof callback == "function" && callback(cb);
            }
        });
    });
}


function DATOS_rut_por_codigo_cliente(codigo, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT RUT_CLIENTE FROM ORDEN_COMPRA WHERE COD_CLIENTE=? LIMIT 1", [codigo], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);
                var rut = rs_datos.RUT_CLIENTE;

                //alert(ar);
                typeof callback == "function" && callback(rut);
            }
        });
    });
}


function DATOS_seleccionar_empresas(valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT * FROM empresa", [], function (tr, rs) {

            var n = rs.rows.length;


            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);
                var empresa = new CL_Empresa(rs_datos.EMP_ID, rs_datos.EMP_RUT, rs_datos.EMP_RUT_DV, rs_datos.EMP_RAZON_SOCIAL, rs_datos.EMP_DIRECCION, rs_datos.EMP_COMUNA, rs_datos.EMP_CIUDAD, rs_datos.EMP_GIRO, rs_datos.EMP_MAIL, rs_datos.EMP_TELEFONO, rs_datos.EMP_ACTIVIDAD_ECONOMICA, rs_datos.EMP_NUM_RES, rs_datos.EMP_ANIO_RES, rs_datos.COMUNA_SII);
                //alert(ar);
                typeof callback == "function" && callback(empresa);
            }
        });
    });
}



function DATOS_cliente_es_emisor(rut, dv, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT * FROM EMPRESA WHERE EMP_RUT=?", [rut], function (tr, rs) {

            var n = parseInt(rs.rows.length);
            typeof callback == "function" && callback(n);

        });
    });
}


function DATOS_seleccionar_proveedores(zona, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT (COD_PROVEEDOR), RUT_PROVEEDOR, NOMBRE_PROVEEDOR FROM ORDEN_COMPRA WHERE COD_ENCARGADO=? ORDER BY NOMBRE_PROVEEDOR ASC ", [zona], function (tr, rs) {

            var n = rs.rows.length;

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var descrp = rs_datos.RUT_PROVEEDOR + " " + rs_datos.NOMBRE_PROVEEDOR + " (" + rs_datos.COD_PROVEEDOR + ")";
                    //alert(rs_datos.COD_PROVEEDOR);
                    var cb = new CL_ComboBox(rs_datos.COD_PROVEEDOR, descrp);
                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}


function DATOS_seleccionar_proveedorPorCodigo(codigo, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT COD_PROVEEDOR, RUT_PROVEEDOR, NOMBRE_PROVEEDOR FROM ORDEN_COMPRA WHERE COD_PROVEEDOR=? LIMIT 1", [codigo], function (tr, rs) {

            var n = rs.rows.length;

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {

                var rs_datos = rs.rows.item(0);
                var cb = new CL_proveedor(rs_datos.COD_PROVEEDOR, rs_datos.RUT_PROVEEDOR, rs_datos.NOMBRE_PROVEEDOR);
                //alert("tiene datos");

                typeof callback == "function" && callback(cb);
            }
        });
    });
}


function DATOS_empresa(zona, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT * FROM EMPRESA", [], function (tr, rs) {

            var n = rs.rows.length;

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var rut = rs_datos.EMP_RUT;
                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}


function DATOS_seleccionar_predios(zona, proveedor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT COD_PROYECTO, PREDIO, ROL_COMUNA, ROL_PREDIO FROM ORDEN_COMPRA  WHERE COD_ENCARGADO=? AND COD_PROVEEDOR=? ", [zona, proveedor], function (tr, rs) {
            var n = rs.rows.length;
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var descrp = rs_datos.PREDIO + "_" + rs_datos.ROL_COMUNA + "_" + rs_datos.ROL_PREDIO;
                    var cb = new CL_ComboBox(rs_datos.ROL_PREDIO, descrp);
                    ar.push(cb);
                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}


function DATOS_seleccionar_clientes(zona, proveedor, rol, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert("PROVEEDOR "+proveedor);
    //alert("PROYECTO "+proyecto);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT COD_CLIENTE, RUT_CLIENTE, RZ_CLIENTE, DEST_CLIENTE FROM ORDEN_COMPRA  WHERE COD_ENCARGADO=? AND COD_PROVEEDOR=? AND ROL_PREDIO=? ORDER BY RZ_CLIENTE ASC", [zona, proveedor, rol], function (tr, rs) {

            var n = rs.rows.length;

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var descrp = rs_datos.RUT_CLIENTE + " " + rs_datos.RZ_CLIENTE + " " + rs_datos.DEST_CLIENTE + "(" + rs_datos.COD_CLIENTE + "_" + rs_datos.DEST_CLIENTE + ")";
                    var cb = new CL_ComboBox(rs_datos.COD_CLIENTE + "_" + rs_datos.DEST_CLIENTE, descrp);

                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}



function DATOS_seleccionar_clientes_por_rut(rut, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert("PROVEEDOR "+proveedor);
    //alert("PROYECTO "+proyecto);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT COD_CLIENTE FROM ORDEN_COMPRA  WHERE RUT_CLIENTE=? LIMIT 1 ", [rut], function (tr, rs) {

            var n = rs.rows.length;

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");

                var rs_datos = rs.rows.item(0);
                //alert(ar);
                typeof callback == "function" && callback(rs_datos.COD_CLIENTE);
            }
        });
    });
}

function DATOS_seleccionar_clientes_por_codigo(codigo, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });



    this.db.transaction(function (tr) {
        tr.executeSql("SELECT COD_CLIENTE,RUT_CLIENTE, CASE RZ_CLIENTE WHEN '' THEN 'RZ CLIENTE NO ENCONTRADA' ELSE RZ_CLIENTE END RZ_CLIENTE2 ,DIR_CLIENTE,COM_CLIENTE,CIU_CLIENTE,GIRO_CLIENTE,TEL_CLIENTE FROM ORDEN_COMPRA  WHERE COD_CLIENTE=? ", [codigo], function (tr, rs) {

            var n = rs.rows.length;


            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {


                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    //alert(rs_datos.RUT_CLIENTE);
                    //alert(rs_datos.RZ_CLIENTE2);
                    if (rs_datos.RZ_CLIENTE2 != "" && rs_datos.RUT_CLIENTE != "") {
                        var Cliente = new CL_Cliente(rs_datos.COD_CLIENTE, rs_datos.RUT_CLIENTE, rs_datos.RZ_CLIENTE2, rs_datos.DIR_CLIENTE, rs_datos.COM_CLIENTE, rs_datos.CIU_CLIENTE, rs_datos.GIRO_CLIENTE, rs_datos.TEL_CLIENTE);
                        if (rs_datos.RZ_CLIENTE2 != "RZ CLIENTE NO ENCONTRADA") {
                            Cliente = new CL_Cliente(rs_datos.COD_CLIENTE, rs_datos.RUT_CLIENTE, rs_datos.RZ_CLIENTE2, rs_datos.DIR_CLIENTE, rs_datos.COM_CLIENTE, rs_datos.CIU_CLIENTE, rs_datos.GIRO_CLIENTE, rs_datos.TEL_CLIENTE);
                            break;
                        }


                    }

                }

                //alert("tiene datos");


                typeof callback == "function" && callback(Cliente);
            }
        });
    });
}



function DATOS_seleccionar_clientes_por_ORDEN_COMPRA(codigo, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT COD_CLIENTE,RUT_CLIENTE, CASE RZ_CLIENTE WHEN '' THEN 'RZ CLIENTE NO ENCONTRADA' ELSE RZ_CLIENTE END RZ_CLIENTE2 ,DIR_CLIENTE,COM_CLIENTE,CIU_CLIENTE,GIRO_CLIENTE,TEL_CLIENTE FROM ORDEN_COMPRA  WHERE NUM_ORDEN=? ", [codigo], function (tr, rs) {

            var n = rs.rows.length;


            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);
                var Cliente = new CL_Cliente(rs_datos.COD_CLIENTE, rs_datos.RUT_CLIENTE, rs_datos.RZ_CLIENTE2, rs_datos.DIR_CLIENTE, rs_datos.COM_CLIENTE, rs_datos.CIU_CLIENTE, rs_datos.GIRO_CLIENTE, rs_datos.TEL_CLIENTE);

                typeof callback == "function" && callback(Cliente);
            }
        });
    });
}


function DATOS_seleccionar_orden_compra(zona, proveedor, rol, cliente, destino, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert("PROVEEDOR "+proveedor);
    //alert("PROYECTO "+proyecto);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT NUM_ORDEN, GROUNUM, TIPO_DOCTO_REF, U_FE_TIPODESP  FROM ORDEN_COMPRA  WHERE COD_ENCARGADO=? AND COD_PROVEEDOR=? AND ROL_PREDIO=? AND COD_CLIENTE=? AND DESTINO_CLIENTE=?", [zona, proveedor, rol, cliente, destino], function (tr, rs) {

            var n = rs.rows.length;

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");


                var rs_datos = rs.rows.item(0);
                var oc = new CL_Orden_Compra(rs_datos.NUM_ORDEN, rs_datos.TIPO_DOCTO_REF, rs_datos.GROUNUM, rs_datos.U_FE_TIPODESP);
                //oc.FREETEXT=rs_datos.FREETEXT;



                //var descrp =rs_datos.NUM_ORDEN;
                //alert(descrp);





                //alert(ar);
                typeof callback == "function" && callback(oc);
            }
        });
    });
}




function DATOS_seleccionar_orden_compra_traslado(zona, proveedor, rol, cliente, destino, producto, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert("PROVEEDOR "+proveedor);
    //alert("PROYECTO "+proyecto);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT NUM_ORDEN, GROUNUM, TIPO_DOCTO_REF, U_FE_TIPODESP, FREETEXT  FROM ORDEN_COMPRA  WHERE COD_ENCARGADO=? AND COD_PROVEEDOR=? AND ROL_PREDIO=? AND COD_CLIENTE=? AND DESTINO_CLIENTE=? AND COD_PRODUCTO=?", [zona, proveedor, rol, cliente, destino, producto], function (tr, rs) {

            var n = rs.rows.length;

            //alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");


                var rs_datos = rs.rows.item(0);
                var oc = new CL_Orden_Compra(rs_datos.NUM_ORDEN, rs_datos.TIPO_DOCTO_REF, rs_datos.GROUNUM, rs_datos.U_FE_TIPODESP);
                oc.FREETEXT = rs_datos.FREETEXT;
                //alert(oc.FREETEXT);



                //var descrp =rs_datos.NUM_ORDEN;
                //alert(descrp);





                //alert(ar);
                typeof callback == "function" && callback(oc);
            }
        });
    });
}


function DATOS_seleccionar_forma_pago_OC(id_oc, tipo_referencia, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert("PROVEEDOR "+proveedor);
    //alert("PROYECTO "+proyecto);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  GROUNUM FROM ORDEN_COMPRA  WHERE NUM_ORDEN=? AND COD_PROVEEDOR=? TIPO_DOCTO_REF=?", [id_oc, tipo_referencia], function (tr, rs) {

            var n = rs.rows.length;

            alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");


                var rs_datos = rs.rows.item(0);
                var descrp = rs_datos.GROUNUM;





                //alert(ar);
                typeof callback == "function" && callback(descrp);
            }
        });
    });
}






function DATOS_seleccionar_orden_compra2(zona, proveedor, rol, cliente, cod_producto, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert("PROVEEDOR "+proveedor);
    //alert("PROYECTO "+proyecto);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT NUM_ORDEN FROM ORDEN_COMPRA  WHERE COD_ENCARGADO=? AND COD_PROVEEDOR=? AND ROL_PREDIO=? AND COD_CLIENTE=? AND COD_PRODUCTO=?", [zona, proveedor, rol, cliente, cod_producto], function (tr, rs) {

            var n = rs.rows.length;

            alert(n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");


                var rs_datos = rs.rows.item(0);
                var descrp = rs_datos.NUM_ORDEN;





                //alert(ar);
                typeof callback == "function" && callback(descrp);
            }
        });
    });
}


function DATOS_seleccionar_productos_OV(proyecto, cliente, destino, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    /*alert("productos por ov");
    alert(proyecto);
    alert(cliente);
    alert(destino);*/
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT COD_PRODUCTO, NOM_PRODUCTO, UNIDAD_MEDIDA FROM ORDEN_VENTA WHERE COD_PROYECTO=? AND COD_CLIENTE=? AND DESTINO_CLIENTE=? ", [proyecto, cliente, destino], function (tr, rs) {

            var n = rs.rows.length;
            //alert("es "+n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    var cb = new CL_ComboBox(rs_datos.COD_PRODUCTO, rs_datos.NOM_PRODUCTO + " (" + rs_datos.COD_PRODUCTO + ")");
                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}



function DATOS_seleccionar_productos_devolucion(proveedor, predio, cliente, destino, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(proyecto);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT COD_PRODUCTO, NOMBRE_PRODUCTO, UNIDAD_MEDIDA FROM ORDEN_COMPRA WHERE  COD_CLIENTE=? AND COD_PROVEEDOR=? AND ROL_PREDIO=? AND DESTINO_CLIENTE=?  ", [cliente, proveedor, predio, destino], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    var cb = new CL_ComboBox(rs_datos.COD_PRODUCTO, rs_datos.NOMBRE_PRODUCTO);

                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}




function DATOS_seleccionar_productoPorCodigo(codigo, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(proyecto);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  COD_PRODUCTO, NOM_PRODUCTO, UNIDAD_MEDIDA FROM ORDEN_VENTA WHERE COD_PRODUCTO=? ", [codigo], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {


                var rs_datos = rs.rows.item(0);
                //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                var cb = new CL_ComboBox(rs_datos.COD_PRODUCTO, rs_datos.NOM_PRODUCTO);
                //alert("es "+rs_datos.NOM_PRODUCTO);




                //alert(ar);
                typeof callback == "function" && callback(cb);
            }
        });
    });
}



function DATOS_UnidadMedida(producto, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT UNIDAD_MEDIDA FROM ORDEN_VENTA WHERE COD_PRODUCTO=?", [producto], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");

                var ar = "";
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    ar = rs_datos.UNIDAD_MEDIDA



                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}



function DATOS_UnidadMedidaOrdenCompra(producto, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT UNIDAD_MEDIDA FROM ORDEN_COMPRA WHERE COD_PRODUCTO=?", [producto], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");

                var ar = "";
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    ar = rs_datos.UNIDAD_MEDIDA



                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}


function DATOS_seleccionar_transporte(zona, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT DISTINCT PAT_CAMION FROM TRANSPORTE", [], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    var cb = new CL_ComboBox(rs_datos.PAT_CAMION, rs_datos.PAT_CAMION);
                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}



function DATOS_seleccionar_patentes_ex(zona, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT PAT_CAMION, FLAG FROM PATENTE_EX", [], function (tr, rs) {

            var n = rs.rows.length;


            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var patente = new CL_Transporte();
                    patente.PAT_CAMION = rs_datos.PAT_CAMION;
                    patente.FLAG = rs_datos.FLAG;
                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}


function DATOS_comprobar_ex_patante(patente, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT upper(PAT_CAMION), FLAG FROM PATENTE_EX WHERE upper(PAT_CAMION)=upper(?)", [patente], function (tr, rs) {

            var n = rs.rows.length;


            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {

                flag = 0;
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var patente = new CL_Transporte();
                    patente.PAT_CAMION = rs_datos.PAT_CAMION;
                    patente.FLAG = rs_datos.FLAG;

                    flag = patente.FLAG;
                }
                //retorna el flag;
                typeof callback == "function" && callback(flag);

            }
        });
    });
}


function DATOS_seleccionar_transporte_mejorado(zona, valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(valor);
    var sql = "SELECT DISTINCT PAT_CAMION FROM TRANSPORTE WHERE  UPPER(PAT_CAMION) LIKE '" + valor + "%'";
    //alert(sql);
    this.db.transaction(function (tr) {
        tr.executeSql(sql, [], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    var cb = new CL_ComboBox(rs_datos.PAT_CAMION, rs_datos.PAT_CAMION);
                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}



function DATOS_seleccionar_transportePorPatente(patente, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT * FROM TRANSPORTE WHERE PAT_CAMION=?", [patente], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    var cb = new CL_Transporte();
                    cb.PAT_CAMION = rs_datos.PAT_CAMION;
                    cb.PAT_CARRO = rs_datos.PAT_CARRO;
                    cb.COD_TRANSPORTISTA = rs_datos.COD_TRANSPORTISTA;
                    cb.RUT_TRANSPORTISTA = rs_datos.RUT_TRANSPORTISTA;
                    cb.NOMBRE_TRANSPORTISTA = rs_datos.NOMBRE_TRANSPORTISTA;
                    cb.RUT_CHOFER = rs_datos.RUT_CHOFER;
                    cb.NOMBRE_CHOFER = rs_datos.NOMBRE_CHOFER;

                    ar.push(cb);

                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}


function DATOS_seleccionar_cargador(zona, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);
    var cargador = "Y";
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  CODIGO, RUT, RAZON_SOCIAL FROM SOCIO WHERE CARGADOR=?", [cargador], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {

                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    var rs_datos = rs.rows.item(i);
                    var descrp = rs_datos.RUT + " " + rs_datos.RAZON_SOCIAL;
                    var cb = new CL_ComboBox(rs_datos.CODIGO, descrp);
                    ar.push(cb);




                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}




function DATOS_seleccionar_socio_por_codigo(codigo, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  CODIGO, RUT, RAZON_SOCIAL FROM SOCIO WHERE CODIGO=?", [codigo], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {

                var rs_datos = rs.rows.item(0);
                var descrp = rs_datos.RUT + " " + rs_datos.RAZON_SOCIAL;
                //var cb=new CL_ComboBox(rs_datos.CODIGO,descrp);

                //alert(ar);
                typeof callback == "function" && callback(descrp);
            }
        });
    });
}


function DATOS_seleccionar_socio_por_codigo_2(codigo, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  CODIGO, RUT, RAZON_SOCIAL FROM SOCIO WHERE CODIGO=?", [codigo], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {

                var rs_datos = rs.rows.item(0);
                var socio = new CL_Socio();
                socio.RUT = rs_datos.RUT;
                socio.NOMBRE = rs_datos.RAZON_SOCIAL;
                //var descrp =rs_datos.RUT+" "+rs_datos.RAZON_SOCIAL;
                //var cb=new CL_ComboBox(rs_datos.CODIGO,descrp);

                //alert(ar);
                typeof callback == "function" && callback(socio);
            }
        });
    });
}



function DATOS_seleccionar_descargador(zona, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);
    var descargador = "Y";
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  CODIGO, RUT, RAZON_SOCIAL FROM SOCIO WHERE DESCARGADOR=?", [descargador], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {

                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    var rs_datos = rs.rows.item(i);
                    var descrp = rs_datos.RUT + " " + rs_datos.RAZON_SOCIAL;
                    var cb = new CL_ComboBox(rs_datos.CODIGO, descrp);
                    ar.push(cb);




                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}


function DATOS_seleccionar_contratista(zona, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);
    var contratista = "Y";
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  CODIGO, RUT, RAZON_SOCIAL FROM SOCIO WHERE CONTRATISTA=?", [contratista], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {

                    //var descrp =rs_datos.RUT_PROVEEDOR+" "+rs_datos.NOMBRE_PROVEEDOR;
                    var rs_datos = rs.rows.item(i);
                    var descrp = rs_datos.RUT + " " + rs_datos.RAZON_SOCIAL;
                    var cb = new CL_ComboBox(rs_datos.CODIGO, descrp);
                    ar.push(cb);




                }
                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}




function DATOS_seleccionar_PrecioPorDefecto(valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);
    var contratista = "Y";
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  * FROM PARAMETRO_GENERAL WHERE PAG_ID=?", [valor], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);
                var PRECIO = rs_datos.PAG_VALOR;

                //alert(ar);
                typeof callback == "function" && callback(PRECIO);
            }
        });
    });
}



function DATOS_seleccionar_Iva(valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  * FROM PARAMETRO_GENERAL WHERE PAG_ID=?", [valor], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);
                var IVA = rs_datos.PAG_VALOR;

                //alert(ar);
                typeof callback == "function" && callback(IVA);
            }
        });
    });
}

function DATOS_seleccionar_Parametro_movil_por_nombre(empresa, valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  * FROM PARAMETRO_MOVIL WHERE NOMBRE_PARAM_MOVIL=? AND EMP_ID=?", [valor, empresa], function (tr, rs) {

            var n = rs.rows.length;

            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);
                var param = new CL_Parametro(rs_datos.EMP_ID, rs_datos.ID_PARAM_MOVIL, rs_datos.NOMBRE_PARAM_MOVIL, rs_datos.VALOR_PARAM_MOVIL);

                //alert(ar);
                typeof callback == "function" && callback(param);
            }
        });
    });
}


function DATOS_seleccionar_Parametro_movil_todos(empresa, valor, callback) {

    var ar = [];
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  * FROM PARAMETRO_MOVIL WHERE EMP_ID=?", [empresa], function (tr, rs) {

            var n = rs.rows.length;

            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {

                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var param = new CL_Parametro(rs_datos.EMP_ID, rs_datos.ID_PARAM_MOVIL, rs_datos.NOMBRE_PARAM_MOVIL, rs_datos.VALOR_PARAM_MOVIL);

                    ar.push(param);
                }

                //alert(ar);
                typeof callback == "function" && callback(ar);
            }
        });
    });
}



function DATOS_seleccionar_Parametro_movil(empresa, valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);


    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  * FROM PARAMETRO_MOVIL WHERE ID_PARAM_MOVIL=? AND EMP_ID=?", [valor, empresa], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);
                var param = new CL_Parametro(rs_datos.EMP_ID, rs_datos.ID_PARAM_MOVIL, rs_datos.NOMBRE_PARAM_MOVIL, rs_datos.VALOR_PARAM_MOVIL);

                //alert(ar);
                typeof callback == "function" && callback(param);
            }
        });
    });
}


function DATOS_Obtener_Geocerca(proyecto, empresa, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT latitud_geocerca, longitud_geocerca, radio_geocerca, flag_geocerca FROM ORDEN_COMPRA WHERE project=?", [proyecto], function (tr, rs) {
            var n = rs.rows.length;

            if (n == 0) {
                typeof callback == "function" && callback(-1);
            } else {
                var rs_datos = rs.rows.item(0);
                var geocerca = {
                    latitude: rs_datos.latitud_geocerca,
                    longitude: rs_datos.longitud_geocerca,
                    radio: rs_datos.radio_geocerca, // 120 metros, esta en mm
                    flag: rs_datos.flag_geocerca,
                };
                typeof callback == "function" && callback(geocerca);
            }
        });
    });
}

function DATOS_borra_parametro_movil_por_nombre(id, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM PARAMETRO_MOVIL WHERE NOMBRE_PARAM_MOVIL=?", [id], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}



function DATOS_borra_parametro_movil_por_id(id, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM PARAMETRO_MOVIL WHERE NOMBRE_PARAM_MOVIL=?", [id], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}




function DATOS_ingresar_Parametro_movil(empresa, nombre, valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO PARAMETRO_MOVIL (EMP_ID, NOMBRE_PARAM_MOVIL, VALOR_PARAM_MOVIL) VALUES(?,?,?)", [empresa, nombre, valor], function (tr, rs) {

            //alert("nuevo precio product");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_actualizar_Parametro_movil(id, valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        //alert(id);
        //alert(valor);
        tr.executeSql("UPDATE PARAMETRO_MOVIL SET VALOR_PARAM_MOVIL= ? WHERE ID_PARAM_MOVIL=?", [valor, id], function (tr, rs) {

            //alert("actualiza");
            //alert("nuevo precio product");
            typeof callback == "function" && callback(rs);
        });
    });

}


function DATOS_seleccionar_Parametro_general(empresa, valor, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    //alert(zona);

    this.db.transaction(function (tr) {
        tr.executeSql("SELECT  * FROM PARAMETRO_GENERAL WHERE PAG_ID=? AND EMP_ID=?", [valor, empresa], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);

            //alert("tamano "+n);
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);
                var param = new CL_Parametro(rs_datos.EMP_ID, rs_datos.PAG_ID, rs_datos.PAG_GLOSA, rs_datos.PAG_VALOR);

                //alert(ar);
                typeof callback == "function" && callback(param);
            }
        });
    });
}







/*DESDE ACA LOS NUEVOS METODOS DE DATO PROVEEDORES*/


function DATOS_seleccionar_datos_proveedores(valor, fecha_hora, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT * FROM ORDEN_COMPRA GROUP BY DocEntry", [], function (tr, rs) {
            var n = rs.rows.length;
            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                //alert("tiene datos");
                var ar = [];
                for (i = 0; i < n; i++) {
                    var rs_datos = rs.rows.item(i);
                    var orden_compra = new CL_Orden_Compra();
                    orden_compra.DocEntry = parseInt(rs_datos.DocEntry);
                    orden_compra.C_codigo = rs_datos.C_codigo;
                    orden_compra.SN_Nombre = rs_datos.SN_Nombre;
                    orden_compra.SN_Destino = rs_datos.SN_Destino;
                    orden_compra.project = rs_datos.project;
                    orden_compra.NumAtCard = rs_datos.NumAtCard;
                    orden_compra.ItemCode = rs_datos.ItemCode;
                    orden_compra.Description = rs_datos.Description;
                    orden_compra.U_ClienteDestino = rs_datos.U_ClienteDestino;
                    orden_compra.Rol = rs_datos.Rol;
                    orden_compra.Predio = rs_datos.Predio;
                    orden_compra.Fec_fin = rs_datos.Fec_fin;
                    orden_compra.Fec_fin = new Date(orden_compra.Fec_fin);
                    fecha_hora_actual = new Date(fecha_hora);
                    if (fecha_hora_actual <= orden_compra.Fec_fin) {
                        ar.push(orden_compra);
                    }
                }

                typeof callback == "function" && callback(ar);
            }

        });

    });

}

function DATOS_seleccionar_datos_proveedores_por_DocEntry(valor, codProducto, callback) {


    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("SELECT * FROM ORDEN_COMPRA WHERE DocEntry=? AND ItemCode=?", [valor, codProducto], function (tr, rs) {

            var n = rs.rows.length;
            //alert(n);


            if (n == 0) {
                typeof callback == "function" && callback(-1);
            }
            else {
                var rs_datos = rs.rows.item(0);



                var orden_compra = new CL_Orden_Compra();
                orden_compra.DocEntry = parseInt(rs_datos.DocEntry);
                orden_compra.C_codigo = rs_datos.C_codigo;
                orden_compra.SN_Nombre = rs_datos.SN_Nombre;
                orden_compra.SN_Destino = rs_datos.SN_Destino;
                orden_compra.project = rs_datos.project;
                orden_compra.NumAtCard = rs_datos.NumAtCard;
                orden_compra.ItemCode = rs_datos.ItemCode;
                orden_compra.Description = rs_datos.Description;
                orden_compra.U_ClienteDestino = rs_datos.U_ClienteDestino;
                orden_compra.Rol = rs_datos.Rol;
                orden_compra.Predio = rs_datos.Predio;
                orden_compra.Rol_comuna = rs_datos.Rol_comuna;

                typeof callback == "function" && callback(orden_compra);
            }


        });



    });

}