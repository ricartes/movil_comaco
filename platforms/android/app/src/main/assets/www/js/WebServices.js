
var ruta_respaldos = 'http://gestiona-002-site3.atempurl.com/Webserviceproveedor.asmx/';
var nombre_ruta_fotos = "fotos";
function login_web(u, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Login_Proveedor';

        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: { usuario: u.user, password: u.password },
                dataType: 'xml',
                success: function (data) {
                    //alert(data);
                    $(data).find('CL_Usuario_Movil ').each(function () {
                        u.rut = $(this).find('USER_RUT').text();
                        u.nombre = $(this).find('USER_NOMBRE').text();
                        u.apellido = $(this).find('USER_APELLIDO').text();
                        u.id_emp = $(this).find('USER_ID_EMP').text();
                        u.estado = $(this).find('USER_ESTADO').text();
                        typeof callback == "function" && callback(u);
                    });
                },
                error: function (err) {
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);
    });


}

function comprueba_conexion(valor, callback) {


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/conexion';

        $.ajax({

            type: "POST",
            url: ruta,
            contetType: 'application/json; charset=utf-8',
            data: {},
            dataType: 'xml',
            timeout: 5000,

            success: function (data) {
                var valor = parseInt($(data).find('int').text());
                //alert("llego "+valor);


                typeof callback == "function" && callback(valor);
            },
            error: function (x, textStatus, m) {
                // handle your error logic here
                if (textStatus == "timeout") {
                    //alert("error de timeout");
                    typeof callback == "function" && callback(-1);
                } else {
                    typeof callback == "function" && callback(0);
                }

            }
        });

    });
}




function ws_registro_inicio_sesion(registro_movil, callback) {
    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/RegistroUsuarioMovil';
        datos_usuario_por_codigo(registro_movil.RUT, function (us) {
            //alert(us.fecha_login);
            (function ($) {
                $.ajax({

                    type: "POST",
                    url: ruta,
                    contetType: 'application/json; charset=utf-8',
                    data: { empresa: registro_movil.EMPRESA, rut: registro_movil.RUT, user: registro_movil.USER, marca_movil: registro_movil.MARCA_MOVIL, modelo_movil: registro_movil.MODELO_MOVIL, version_movil: registro_movil.VERSION_MOVIL, uuid_movil: registro_movil.UUID_MOVIL, fecha_login: us.fecha_login },
                    dataType: 'xml',
                    timeout: 5000,

                    success: function (data) {
                        var valor = $(data).find('string').text();
                        //alert("llego "+valor);


                        typeof callback == "function" && callback(valor);
                    },
                    error: function (x, textStatus, m) {
                        //alert("error "+textStatus);
                        // handle your error logic here
                        if (textStatus == "timeout") {
                            //alert("error de timeout");
                            typeof callback == "function" && callback(-1);
                        } else {
                            typeof callback == "function" && callback(0);
                        }

                    }
                });

            })(jQuery);

        });

    });


}



function cargar_orden_compra(cod_proveedor, empresa, porcentaje_actual, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/UsuarioProveedor';
        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: { cod_proveedor: cod_proveedor },
                dataType: 'xml',
                success: function (data) {

                    var tamano = parseInt($(data).find('tam_list').text());
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        //borrar_parametros_oferta();

                        borra_orden_compra(function (result) {

                            $(data).find('CL_Usuario_Proveedor').each(function () {
                                var orden_compra = new CL_Orden_Compra();
                                orden_compra.DocEntry = parseInt($(this).find('DocEntry').text());
                                orden_compra.C_codigo = $(this).find('C_codigo').text();
                                orden_compra.SN_Nombre = $(this).find('SN_Nombre').text();
                                orden_compra.SN_Destino = $(this).find('SN_Destino').text();
                                orden_compra.project = $(this).find('project').text();
                                orden_compra.NumAtCard = $(this).find('NumAtCard').text();
                                orden_compra.ItemCode = $(this).find('ItemCode').text();
                                orden_compra.Description = $(this).find('Description').text();
                                orden_compra.U_ClienteDestino = $(this).find('U_ClienteDestino').text();
                                orden_compra.Rol = $(this).find('Rol').text();
                                orden_compra.Predio = $(this).find('Predio').text();
                                orden_compra.Rol_comuna = $(this).find('Rol_comuna').text();
                                orden_compra.Fec_fin = $(this).find('Fec_fin').text();
                                orden_compra.latitud_geocerca = $(this).find('latitud_geocerca').text();
                                orden_compra.longitud_geocerca = $(this).find('longitud_geocerca').text();
                                orden_compra.radio_geocerca = $(this).find('radio_geocerca').text();
                                orden_compra.flag_geocerca = $(this).find('flag_geocerca').text();
                                orden_compra.tiempo_espera_carguio = $(this).find('tiempo_espera_carguio').text();

                                nuevo_orden_compra(orden_compra, function (result) {

                                    conta = conta + 1;


                                    porc = ((conta / tamano) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;

                                    cambia_progressbar(porc_entero);

                                    if (confirma_guardado_parametro(conta, tamano) == 1) {

                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });

                            });

                        });
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);
    });


}



function cargar_orden_venta(rut, porcentaje_actual, callback) {
    //ruta='http://localhost:6451/WEB/Webserviceproveedor.asmx/Carga_ofertas';
    //ruta='http://cmpc-ds119.cmpc.cl:8003/Ofertas/Webserviceproveedor.asmx/Carga_ofertas';


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Cargar_Productos';
        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: { rut: rut },
                dataType: 'xml',
                success: function (data) {

                    //alert(parseInt($(data).find('tam_lista').text()));


                    var tamano = parseInt($(data).find('tam_lista').text());
                    //alert(tamano);
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        //borrar_parametros_oferta();

                        borra_orden_venta(function (result) {

                            //alert("borra_orden_venta");
                            $(data).find('CL_Productos').each(function () {


                                var orden_venta = new CL_Orden_Venta();

                                orden_venta.NUM_DOCUMENTO = parseInt($(this).find('NUM_DOCUMENTO').text());
                                orden_venta.COD_PROYECTO = $(this).find('COD_PROYECTO').text();
                                orden_venta.COD_CLIENTE = $(this).find('COD_CLIENTE').text();
                                orden_venta.NOM_CLIENTE = $(this).find('NOM_CLIENTE').text();
                                orden_venta.COD_PRODUCTO = $(this).find('COD_PRODUCTO').text();
                                orden_venta.NOM_PRODUCTO = $(this).find('NOM_PRODUCTO').text();
                                orden_venta.UNIDAD_MEDIDA = $(this).find('UNIDAD_MEDIDA').text();
                                orden_venta.COD_ZONA = $(this).find('COD_ZONA').text();
                                orden_venta.LARGO_TROZO = parseFloat($(this).find('LARGO_TROZO').text());
                                //
                                orden_venta.COD_OC_REFERENCIA = $(this).find('COD_OC_REFERENCIA').text();
                                orden_venta.OC_REFERENCIA = $(this).find('OC_REFERENCIA').text();
                                orden_venta.FECHA_OC_REFERENCIA = $(this).find('FECHA_OC_REFERENCIA').text();
                                orden_venta.COMENTARIO = $(this).find('COMENTARIO').text();
                                orden_venta.DESTINO_CLIENTE = $(this).find('DESTINO_CLIENTE').text();







                                nuevo_orden_venta(orden_venta, function (result1) {

                                    //alert(result1);
                                    conta = conta + 1;

                                    porc = ((conta / tamano) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;
                                    //alert(porc_entero);
                                    cambia_progressbar(porc_entero);

                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        //alert("confirma_guardado_parametro");
                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });

                            });

                        });
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);

    });




}


function cargar_transporte(rut, porcentaje_actual, callback) {
    //ruta='http://localhost:6451/WEB/Webserviceproveedor.asmx/Carga_ofertas';
    //ruta='http://cmpc-ds119.cmpc.cl:8003/Ofertas/Webserviceproveedor.asmx/Carga_ofertas';

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Cargar_Patentes';
        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: {},
                dataType: 'xml',
                success: function (data) {

                    //alert(parseInt($(data).find('tam_lista').text()));


                    var tamano = parseInt($(data).find('tam_lista').text());
                    //alert(tamano);
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        //borrar_parametros_oferta();

                        borra_transporte(function (result) {

                            //alert("borra_orden_venta");
                            $(data).find('CL_Patente').each(function () {

                                var transporte = new CL_Transporte();
                                transporte.PAT_CAMION = $(this).find('PAT_CAMION').text();
                                transporte.PAT_CARRO = $(this).find('PAT_CARRO').text();
                                transporte.COD_TRANSPORTISTA = $(this).find('COD_TRANSPORTISTA').text();
                                transporte.RUT_TRANSPORTISTA = $(this).find('RUT_TRANSPORTISTA').text();
                                transporte.NOMBRE_TRANSPORTISTA = $(this).find('NOMBRE_TRANSPORTISTA').text();
                                transporte.RUT_CHOFER = $(this).find('RUT_CHOFER').text();
                                transporte.NOMBRE_CHOFER = $(this).find('NOMBRE_CHOFER').text();

                                nuevo_transporte(transporte, function (result1) {

                                    conta = conta + 1;

                                    porc = ((conta / tamano) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;
                                    //alert(porc_entero);
                                    cambia_progressbar(porc_entero);

                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        //alert("confirma_guardado_parametro");
                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });

                            });

                        });
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);

    });



}



function cargar_patente_ex(rut, empresa, porcentaje_actual, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Cargar_Patentes_Ex';
        (function ($) {

            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: {},
                dataType: 'xml',
                success: function (data) {
                    var tamano = parseInt($(data).find('tam_lista').text());
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        borra_patente_ex(function (result) {
                            $(data).find('CL_Patente').each(function () {
                                var transporte = new CL_Transporte();
                                transporte.PAT_CAMION = $(this).find('PAT_CAMION').text();
                                transporte.FLAG = $(this).find('FLAG').text();
                                nuevo_patente_ex(transporte, function (result1) {
                                    conta = conta + 1;
                                    porc = ((conta / tamano) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;
                                    //alert(porc_entero);
                                    cambia_progressbar(porc_entero);

                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        //alert("confirma_guardado_parametro");
                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });

                            });

                        });
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });



        })(jQuery);
    });
}





function cargar_precio_producto(rut, porcentaje_actual, callback) {
    //ruta='http://localhost:6451/WEB/Webserviceproveedor.asmx/Carga_ofertas';
    //ruta='http://cmpc-ds119.cmpc.cl:8003/Ofertas/Webserviceproveedor.asmx/Carga_ofertas';

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Cargar_Precio_Productos';

        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: {},
                dataType: 'xml',
                success: function (data) {

                    //alert(parseInt($(data).find('tam_lista').text()));


                    var tamano = parseInt($(data).find('tam_lista').text());
                    //alert(tamano);
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        //borrar_parametros_oferta();

                        borra_precio_producto(function (result) {

                            //alert("borra_orden_venta");
                            $(data).find('CL_Precio').each(function () {


                                var ppr = new CL_PrecioProducto();

                                ppr.EMP_ID = $(this).find('EMP_ID').text();
                                ppr.PPR_COD_PRODUCTO = $(this).find('COD_PRODUCTO').text();
                                ppr.PPR_COD_CLIENTE = $(this).find('COD_CLIENTE').text();
                                ppr.PPR_FECHA_INICIAL = $(this).find('FECHA_INICIAL').text();
                                ppr.PPR_FECHA_FINAL = $(this).find('FECHA_FINAL').text();
                                ppr.PPR_PRECIO = $(this).find('PRECIO').text();



                                nuevo_precio_producto(ppr, function (result1) {
                                    //alert(result1);
                                    conta = conta + 1;

                                    porc = ((conta / tamano) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;
                                    //alert(porc_entero);
                                    cambia_progressbar(porc_entero);

                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        //alert("confirma_guardado_parametro");
                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });

                            });

                        });
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);

    });



}






function cargar_empresa(rut, porcentaje_actual, callback) {



    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Cargar_Empresas';
        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: {},
                dataType: 'xml',
                success: function (data) {

                    //alert(parseInt($(data).find('tam_lista').text()));


                    var tamano = parseInt($(data).find('tam_lista').text());
                    //alert(tamano);
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        //borrar_parametros_oferta();

                        borra_empresa(function (result) {

                            //alert("borra_orden_venta");
                            $(data).find('CL_Empresa').each(function () {


                                var emp = new CL_Empresa(parseInt($(this).find('EMP_ID').text()), parseInt($(this).find('EMP_RUT').text()), $(this).find('EMP_RUT_DV').text(), $(this).find('EMP_RAZON_SOCIAL').text(), $(this).find('EMP_DIRECCION').text(), $(this).find('EMP_COMUNA').text(), $(this).find('EMP_CIUDAD').text(), $(this).find('EMP_GIRO').text(), $(this).find('EMP_MAIL').text(), $(this).find('EMP_TELEFONO').text(), $(this).find('EMP_ACTIVIDAD_ECONOMICA').text(), parseInt($(this).find('EMP_NRO_RESOLUCION').text()), parseInt($(this).find('EMP_ANIO_RESOLUCION').text()), $(this).find('EMP_COMUNA_SII').text());

                                nuevo_empresa(emp, function (result1) {
                                    //alert(result1);
                                    conta = conta + 1;

                                    porc = ((conta / tamano) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;
                                    //alert(porc_entero);
                                    cambia_progressbar(porc_entero);

                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        //alert("confirma_guardado_parametro");
                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });

                            });

                        });
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);

    });



}

function cargar_parametros_generales(rut, empresa, porcentaje_actual, callback) {
    //ruta='http://localhost:6451/WEB/Webserviceproveedor.asmx/Carga_ofertas';


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Cargar_Parametro_General';
        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: { id_emp: empresa },
                dataType: 'xml',
                success: function (data) {

                    //alert(parseInt($(data).find('tam_lista').text()));


                    var tamano = parseInt($(data).find('tamList').text());
                    //alert(tamano);
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        //borrar_parametros_oferta();

                        borra_parametro_general(function (result) {

                            //alert("param general");
                            $(data).find('CL_Param_General').each(function () {


                                var param = new CL_Parametro(parseInt($(this).find('EMP_ID').text()), parseInt($(this).find('PAG_ID').text()), $(this).find('PAG_GLOSA').text(), $(this).find('PAG_VALOR').text());

                                //alert(JSON.stringify(param));

                                nuevo_parametro_general(param, function (result1) {
                                    //alert(result1);
                                    conta = conta + 1;

                                    porc = ((conta / tamano) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;
                                    //alert(porc_entero);
                                    cambia_progressbar(porc_entero);

                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        //alert("confirma_guardado_parametro");
                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });

                            });

                        });
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);

    });



}



function cargar_socio(rut, porcentaje_actual, callback) {
    //ruta='http://localhost:6451/WEB/Webserviceproveedor.asmx/Carga_ofertas';
    //ruta='http://cmpc-ds119.cmpc.cl:8003/Ofertas/Webserviceproveedor.asmx/Carga_ofertas';


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Cargar_Socios';
        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: {},
                dataType: 'xml',
                success: function (data) {

                    //alert(parseInt($(data).find('tam_lista').text()));


                    var tamano = parseInt($(data).find('tam_lista').text());
                    //alert(tamano);
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        //borrar_parametros_oferta();

                        borra_socio(function (result) {

                            //alert("borra_orden_venta");
                            $(data).find('CL_Socio').each(function () {


                                var socio = new CL_Socio();

                                socio.CODIGO = $(this).find('CODIGO').text();
                                socio.RUT = $(this).find('RUT').text();
                                socio.RAZON_SOCIAL = $(this).find('RAZON_SOCIAL').text();
                                socio.GIRO = $(this).find('GIRO').text();
                                socio.CIUDAD = $(this).find('CIUDAD').text();
                                socio.COMUNA = $(this).find('COMUNA').text();
                                socio.DIRECCION = $(this).find('DIRECCION').text();
                                socio.TELEFONO = $(this).find('TELEFONO').text();
                                socio.PAIS = $(this).find('PAIS').text();
                                socio.TRANSPORTISTA = $(this).find('TRANSPORTISTA').text();
                                socio.CARGADOR = $(this).find('CARGADOR').text();
                                socio.DESCARGADOR = $(this).find('DESCARGADOR').text();
                                socio.CONTRATISTA = $(this).find('CONTRATISTA').text();



                                nuevo_socio(socio, function (result1) {
                                    //alert(result1);
                                    conta = conta + 1;

                                    porc = ((conta / tamano) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;
                                    //alert(porc_entero);
                                    cambia_progressbar(porc_entero);

                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        //alert("confirma_guardado_parametro");
                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });

                            });

                        });
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);

    });



}



function ws_cargar_guias(rut, empresa, callback) {
    //ruta='http://localhost:6451/WEB/Webserviceproveedor.asmx/Carga_ofertas';
    //ruta='http://cmpc-ds119.cmpc.cl:8003/Ofertas/Webserviceproveedor.asmx/Carga_ofertas';


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Rescata_guia';

        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: { usuario: rut, empresa: empresa },
                dataType: 'xml',
                success: function (data) {

                    var tamano = parseInt($(data).find('tam_list').text());
                    var contador_no_guardados = 0;
                    //alert(tamano);
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        //DATOS_borra_gde_enviado(1, function(result) {
                        $(data).find('CL_GDE_Proveedor').each(function () {
                            /*CAMPOS EN IGUAL ORDEN QUE EN LA TABLA*/
                            var gde = new CL_GDE();
                            gde.EMP_ID = parseInt($(this).find('EMP_ID').text().trim());
                            gde.GDE_COD_PROVEEDOR = $(this).find('GDE_COD_PROVEEDOR').text().trim();
                            gde.GDE_NOMBRE_PROVEEDOR = $(this).find('GDE_NOMBRE_PROVEEDOR').text().trim();
                            if (parseInt($(this).find('GDE_GUIA_PROVEEDOR').text().trim()) == 0) {
                                gde.GDE_GUIA_PROVEEDOR = null;
                            }
                            else {
                                gde.GDE_GUIA_PROVEEDOR = parseInt($(this).find('GDE_GUIA_PROVEEDOR').text().trim());
                            }
                            //GUIA ENVIADA
                            gde.GDE_ESTADO_MOVIL = "E";
                            gde.ENVIADO = 1;
                            gde.GDE_FECHA_EMISION = $(this).find('GDE_FECHA_EMISION').text().trim();
                            gde.GDE_COD_TRANSPORTISTA = $(this).find('GDE_COD_TRANSPORTISTA').text().trim();
                            gde.GDE_NOMBRE_TRANSPORTISTA = $(this).find('GDE_NOMBRE_TRANSPORTISTA').text().trim();
                            gde.GDE_RUT_CONDUCTOR = $(this).find('GDE_RUT_CONDUCTOR').text().trim();
                            gde.GDE_NOM_CONDUCTOR = $(this).find('GDE_NOM_CONDUCTOR').text().trim();
                            gde.GDE_PATENTE_CAMION = $(this).find('GDE_PATENTE_CAMION').text().trim();
                            gde.GDE_PATENTE_CARRO = $(this).find('GDE_PATENTE_CARRO').text().trim();
                            gde.GDE_COMENTARIO = $(this).find('GDE_COMENTARIO').text().trim();
                            gde.GDE_COORDENADA_X = parseFloat($(this).find('GDE_COORDENADA_X').text().trim());
                            gde.GDE_COORDENADA_Y = parseFloat($(this).find('GDE_COORDENADA_Y').text().trim());
                            gde.GDE_COD_CLIENTE = $(this).find('GDE_COD_CLIENTE').text().trim();
                            gde.GDE_NOMBRE_CLIENTE = $(this).find('GDE_NOMBRE_CLIENTE').text().trim();
                            gde.GDE_COD_PROYECTO = $(this).find('GDE_COD_PROYECTO').text().trim();
                            gde.GDE_NOMBRE_PREDIO = $(this).find('GDE_NOMBRE_PREDIO').text().trim();


                            gde.GDE_ROL_COMUNA = $(this).find('ROL_COMUNA').text().trim();
                            gde.GDE_COD_PRODUCTO = $(this).find('GDE_COD_PRODUCTO').text().trim();
                            gde.GDE_NOMBRE_PRODUCTO = $(this).find('GDE_NOM_PRODUCTO').text().trim();
                            gde.GDE_DESTINO = $(this).find('GDE_DESTINO').text().trim();
                            if (parseInt($(this).find('GDE_VOLUMEN_TOTAL').text().trim()) == 0) {
                                gde.GDE_VOLUMEN_PROVEEDOR = null;
                            } else {
                                gde.GDE_VOLUMEN_PROVEEDOR = parseInt($(this).find('GDE_VOLUMEN_TOTAL').text().trim());
                            }

                            gde.ID_UNICO_MOVIL = $(this).find('ID_UNICO_MOVIL').text().trim();
                            gde.GDE_USUARIO = Obtener_dato_local("rut_activo");
                            gde.GDE_COD_DESPACHADOR = Obtener_dato_local("rut_activo");
                            gde.DocEntry = parseInt($(this).find('GDE_ID_OC').text().trim());
                            gde.GDE_ROL = $(this).find('GDE_ROL').text().trim();

                            //campos punto inicial y final

                            gde.GDE_COORDENADA_INICIAL_X = parseFloat($(this).find('GDE_COORDENADA_INICIAL_X').text().trim());
                            gde.GDE_COORDENADA_INICIAL_Y = parseFloat($(this).find('GDE_COORDENADA_INICIAL_Y').text().trim());
                            gde.GDE_COORDENADA_FINAL_X = parseFloat($(this).find('GDE_COORDENADA_FINAL_X').text().trim());
                            gde.GDE_COORDENADA_FINAL_Y = parseFloat($(this).find('GDE_COORDENADA_FINAL_Y').text().trim());

                            gde.GDE_HORA_PUNTO_INICIO = $(this).find('GDE_HORA_PUNTO_INICIO').text().trim();
                            gde.GDE_HORA_PUNTO_FINAL = $(this).find('GDE_HORA_PUNTO_FINAL').text().trim();




                            //finaliza nuevos

                            DATOS_existe_guia(gde.ID_UNICO_MOVIL, function (contador_guia) {

                                if (contador_guia == 0) {

                                    DATOS_guarda_gde_proveedor_vuelta(gde, function (contador_guia) {
                                        conta++;
                                        //alert("guardado");
                                        if (confirma_guardado_parametro(conta, tamano) == 1) {
                                            //alert("chao");
                                            typeof callback == "function" && callback(1);
                                        }

                                    });


                                } else {
                                    conta++;
                                    contador_no_guardados++;

                                    //alert(gde.GDE_FOLIO+ "existe");
                                    //alert(conta+"-"+tamano);
                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        /*alert("entro aca");
                                        alert(contador_no_guardados);
                                        alert(tamano);*/

                                        if (contador_no_guardados == tamano) {
                                            //alert("chao 1");
                                            typeof callback == "function" && callback(0);
                                        } else {

                                            typeof callback == "function" && callback(1);
                                        }

                                        //alert("chao");

                                    }
                                }

                            });




                            /*FIN ORDEN TABLA*/
                        });
                        //});              
                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);

    });

}


function ws_cargar_evidencia(rut, empresa, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Rescata_evidencia';
        (function ($) {
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: { usuario: rut, empresa: empresa },
                dataType: 'xml',
                success: function (data) {


                    var tamano = parseInt($(data).find('tam_list').text());
                    //alert("son "+tamano);
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {

                        asigna_ruta_fotos(nombre_ruta_fotos, function (nombre_carpeta) {
                            //DATOS_borra_gdea_aserrable_enviado(1, function(result) {
                            $(data).find('CL_Evidencia').each(function () {

                                var evidencia = new CL_GDE_Evidencia();
                                evidencia.ID_UNICO_MOVIL = $(this).find('ID_UNICO_MOVIL').text();
                                evidencia.ID_UNICO_MOVIL_GDE = $(this).find('ID_UNICO_MOVIL_GDE').text();
                                evidencia.FECHA_EVIDENCIA = $(this).find('FECHA_EVIDENCIA').text();
                                evidencia.OBSERVACION = $(this).find('OBSERVACION').text();
                                evidencia.ARCHIVO = $(this).find('ARCHIVO').text();
                                evidencia.ARCHIVO = nombre_carpeta + evidencia.ARCHIVO.substr(evidencia.ARCHIVO.lastIndexOf('/') + 1);
                                evidencia.ENVIADO = 1;
                                evidencia.GDE_COD_DESPACHADOR = Obtener_dato_local("rut_activo");
                                evidencia.GDE_ESTADO_MOVIL = "E";
                                evidencia.ENVIADO_FOTO = 1;


                                //var myJsonString = JSON.stringify(evidencia);
                                //alert(myJsonString);

                                DATOS_existe_evidencia(evidencia.ID_UNICO_MOVIL, function (contador) {

                                    if (contador == 0) {
                                        //alert(gda.GDE_FOLIO+"no existe");
                                        DATOS_asigna_rowid_evidencia(evidencia.ID_UNICO_MOVIL_GDE, function (rowid) {
                                            //alert("EL ROWID ES "+rowid);
                                            evidencia.ID_GDE = rowid;
                                            if (evidencia.rowid != -1) {
                                                DATOS_guardar_evidencia_guia_vuelta(evidencia, function (result1) {

                                                    //alert("guardo gda");
                                                    conta++;
                                                    //alert(conta+"-"+tamano);

                                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                                        //alert("confirma_guardado_parametro");
                                                        typeof callback == "function" && callback(1);
                                                    }

                                                });
                                            }


                                        });

                                    } else {
                                        //alert(gda.GDE_FOLIO+"si existe");
                                        conta++;
                                        if (confirma_guardado_parametro(conta, tamano) == 1) {
                                            //alert("confirma_guardado_parametro");
                                            typeof callback == "function" && callback(1);
                                        }
                                    }

                                });
                            });

                        });




                    }

                },
                error: function (err) {
                    // handle your error logic here
                    typeof callback == "function" && callback(-1);
                }
            });
        })(jQuery);

    });

}




function enviar_guias(bandera, callback) {


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Guia';


        DATOS_seleccionar_gde_por_enviar("0", function (result) {
            //alert(result);
            if (result == -1) {
                typeof callback == "function" && callback(0);
            } else {
                var myJsonString = JSON.stringify(result);
                //alert(myJsonString);
                $.ajax({
                    type: "POST",
                    url: ruta,
                    contetType: 'application/json; charset:ISO-8859-1',
                    data: { guia: myJsonString },
                    dataType: 'xml',
                    success: function (data) {

                        var conta = 0;
                        var tamano = parseInt($(data).find('tamlist').text());

                        if (tamano == 0) {
                            typeof callback == "function" && callback(0);
                        } else {
                            $(data).find('CL_GDE').each(function () {
                                var folio = parseInt($(this).find('GDE_FOLIO').text());
                                //alert(folio);

                                DATOS_cambiar_estado_envio_gde_individual(folio, function (result2) {
                                    conta++;
                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        typeof callback == "function" && callback(1);
                                    }
                                });



                            });
                        }

                    },

                    error: function (err) {
                        // handle your error logic here
                        alert("ERROR " + JSON.stringify(err));
                        typeof callback == "function" && callback(-1);
                    }

                    /*error: function (err) 
                    {
                          alert("error"+err);
              // handle your error logic here
                          
                    }*/
                });

            }



        });

    });



}



function enviar_actualizacion_numero_guias(bandera, callback) {


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Actulizacion_Numero_Guia';


        DATOS_seleccionar_gde_actualizada_por_enviar("0", function (result) {

            if (result == -1) {
                typeof callback == "function" && callback(0);
            } else {
                var myJsonString = JSON.stringify(result);
                $.ajax({
                    type: "POST",
                    url: ruta,
                    contetType: 'application/json; charset:ISO-8859-1',
                    data: { guia_proveedor: myJsonString },
                    dataType: 'xml',
                    success: function (data) {



                        var conta = 0;
                        var tamano = parseInt($(data).find('tam_list').text());
                        if (tamano == 0) {
                            typeof callback == "function" && callback(0);
                        } else {
                            $(data).find('CL_GDE_Proveedor').each(function () {

                                var ID_UNICO_MOVIL = $(this).find('ID_UNICO_MOVIL').text()
                                var ORIGEN_ESTADO = $(this).find('ORIGEN_ESTADO').text()

                                DATOS_cambiar_estado_envio_gde_actualizada(ID_UNICO_MOVIL, ORIGEN_ESTADO, function (result2) {
                                    conta++;
                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        typeof callback == "function" && callback(1);
                                    }
                                });



                            });
                        }

                    },

                    error: function (err) {
                        // handle your error logic here
                        alert("ERROR " + JSON.stringify(err));
                        typeof callback == "function" && callback(-1);
                    }


                });

            }



        });

    });



}






function enviar_respaldo_guias(bandera, callback) {
    ruta = ruta_respaldos + 'GuardaRespaldoGDE';
    DATOS_seleccionar_gde_por_enviar("0", function (result) {
        //alert(result);
        if (result == -1) {
            typeof callback == "function" && callback(0);
        } else {
            var myJsonString = JSON.stringify(result);
            //alert(myJsonString);
            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset:ISO-8859-1',
                data: { guia: myJsonString },
                dataType: 'xml',
                timeout: 6000,
                success: function (data) {
                    // alert("ENVIO GDE");
                    //alert(JSON.stringify(data));
                    //alert(data);

                    var valor = $(data).find('string').text();
                    //alert(valor);

                    if (valor == "ok") {


                        typeof callback == "function" && callback(1);


                    } else {

                        typeof callback == "function" && callback(-1);
                    }
                },
                error: function (x, textStatus, m) {
                    // handle your error logic here
                    if (textStatus == "timeout") {
                        //alert("error de timeout");
                        typeof callback == "function" && callback(-1);
                    } else {
                        typeof callback == "function" && callback(0);
                    }

                }
            });

        }



    });

}



function enviar_respaldo_aserrable(bandera, callback) {
    ruta = ruta_respaldos + 'GuardaRespaldoGDEA';

    DATOS_seleccionar_detallem3_por_enviar("0", function (result) {

        //alert(result);
        if (result == -1) {
            typeof callback == "function" && callback(0);
        } else {

            var myJsonString = JSON.stringify(result);
            //alert(result);

            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: { m3: myJsonString },
                dataType: 'xml',
                timeout: 6000,
                success: function (data) {
                    var valor = $(data).find('string').text();

                    if (valor == "ok") {


                        typeof callback == "function" && callback(1);


                    } else {

                        typeof callback == "function" && callback(-1);
                    }



                    //typeof callback == "function" && callback(1);

                },
                error: function (x, textStatus, m) {
                    // handle your error logic here
                    if (textStatus == "timeout") {
                        //alert("error de timeout");
                        typeof callback == "function" && callback(-1);
                    } else {
                        typeof callback == "function" && callback(0);
                    }

                }
            });

        }



    });

}



function enviar_respaldo_pulpable(bandera, callback) {
    ruta = ruta_respaldos + 'GuardaRespaldoGDEP';
    DATOS_seleccionar_detallemr_por_enviar("0", function (result) {


        if (result == -1) {
            typeof callback == "function" && callback(0);
        } else {

            var myJsonString = JSON.stringify(result);


            $.ajax({
                type: "POST",
                url: ruta,
                contetType: 'application/json; charset=utf-8',
                data: { detalle: myJsonString },
                dataType: 'xml',
                timeout: 6000,
                success: function (data) {

                    alert(data);
                    var valor = $(data).find('string').text();
                    alert(valor);

                    if (valor == "ok") {


                        typeof callback == "function" && callback(1);


                    } else {

                        typeof callback == "function" && callback(-1);
                    }



                    //typeof callback == "function" && callback(1);

                },
                error: function (x, textStatus, m) {
                    // handle your error logic here
                    if (textStatus == "timeout") {
                        //alert("error de timeout");
                        typeof callback == "function" && callback(-1);
                    } else {
                        typeof callback == "function" && callback(0);
                    }

                }
            });

        }



    });

}








function ws_carga_folios(rut, empresa, callback) {
    var aleta_folios = 0;
    var arreglo_rangos = [];



    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Enviar_rango_folio';
        $.ajax({
            type: "POST",
            url: ruta,
            contetType: 'application/json; charset=utf-8',
            data: { rut: rut, empresa: empresa },
            dataType: 'xml',
            success: function (data) {
                var tamano = parseInt($(data).find('tamlist').text());
                var conta = 0;
                if (tamano == 0) {
                    typeof callback == "function" && callback(0);
                } else {

                    //DATOS_BorraFolios(empresa,rut, function(result) {
                    //alert("BORRA FOLIOS");

                    //DATOS_BorraRangosFolios(empresa,rut, function(resul1) {
                    //alert("BORRA RANGO FOLIOS");
                    $(data).find('CL_Usuario_RF').each(function () {
                        var rango_folio = new CL_Usuario_RF(parseInt($(this).find('EMP_ID').text()), parseInt($(this).find('URF_ID').text()), parseInt($(this).find('USU_RUT').text()), parseInt($(this).find('FOLIO_INICIAL').text()), parseInt($(this).find('FOLIO_FINAL').text()), parseInt($(this).find('CANTIDAD').text()), parseInt($(this).find('VERIFICADO').text()), $(this).find('CAF').text());

                        DATOS_existe_rango_folio(rango_folio, function (contador) {

                            if (contador == 0) {
                                DATOS_GuardaRangoFolio(rango_folio, function (resul2) {
                                    arreglo_rangos.push(rango_folio);
                                    conta = conta + 1;
                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        //alert("confirma_guardado_parametro");
                                        typeof callback == "function" && callback(arreglo_rangos);
                                    }
                                });
                            } else {
                                aleta_folios = 1;
                                conta = conta + 1;
                                if (confirma_guardado_parametro(conta, tamano) == 1) {

                                    if (aleta_folios == 1) {
                                        alert("Se ha detectado rangos folio repetidos, estos han sido descartados. Favor contactar al administrador");
                                    }

                                    typeof callback == "function" && callback(arreglo_rangos);
                                }

                            }

                        });


                    });

                    //});  
                    //});
                }

            },
            error: function (err) {
                // handle your error logic here
                typeof callback == "function" && callback(-1);
            }
        });

    });



}


function enviar_confirmacion_carga_folios(arreglo_rangos, callback) {
    //alert("envia");


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Rango';


        for (i = 0; i < arreglo_rangos.length; i++) {
            arreglo_rangos[i].VERIFICADO = 2;
        }


        var myJsonString = JSON.stringify(arreglo_rangos);
        //alert(myJsonString);
        $.ajax({

            type: "POST",
            url: ruta,
            contetType: 'application/json; charset=utf-8',
            data: { rango_folio: myJsonString },
            dataType: 'xml',

            success: function (data) {
                typeof callback == "function" && callback(1);
            },
            error: function (err) {
                // handle your error logic here

                typeof callback == "function" && callback(-1);
            }
        });
    });


}



function liberar_rango_folios_ws(rut, urf_id, maximo, cantidad, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Liberar_Folios';

        $.ajax({

            type: "POST",
            url: ruta,
            contetType: 'application/json; charset=utf-8',
            data: { rut: rut, maximo: maximo, urf_id: urf_id, cantidad: cantidad },
            dataType: 'xml',

            success: function (data) {
                var valor = $(data).find('string').text();
                //alert(valor);

                typeof callback == "function" && callback(valor);
            },
            error: function (err) {
                // handle your error logic here
                alert(err);
                typeof callback == "function" && callback(-1);
            }
        });

    });


}



function anular_guia_ws(num_folio, comentario, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/anular';

        $.ajax({

            type: "POST",
            url: ruta,
            contetType: 'application/json; charset=utf-8',
            data: { folio: num_folio, comentario: comentario },
            dataType: 'xml',

            success: function (data) {
                var valor = $(data).find('string').text();
                //alert(valor);

                typeof callback == "function" && callback(valor);
            },
            error: function (err) {
                // handle your error logic here
                alert(err);
                typeof callback == "function" && callback(-1);
            }
        });

    });


}


function comparar_fecha_hora_ws(fecha_hora, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {

        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/compararFechaHora';

        $.ajax({

            type: "POST",
            url: ruta,
            contetType: 'application/json; charset=utf-8',
            data: { fechaHoraMovilStr: fecha_hora },
            dataType: 'xml',

            success: function (data) {
                var valor = $(data).find('int').text();
                typeof callback == "function" && callback(valor);
            },
            error: function (err) {
                // handle your error logic here
                alert("errr llamado al ws" + err);
                typeof callback == "function" && callback(-1);
            }
        });

    });


}



function enviar_guias_proveedor(bandera, callback) {


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Guia';


        DATOS_seleccionar_gde_proveedor_por_enviar("0", function (result) {
            //alert(result);
            if (result == -1) {
                typeof callback == "function" && callback(0);
            } else {
                var myJsonString = JSON.stringify(result);
                $.ajax({
                    type: "POST",
                    url: ruta,
                    contetType: 'application/json; charset:ISO-8859-1',
                    data: { guia_proveedor: myJsonString },
                    dataType: 'xml',
                    success: function (data) {

                        var conta = 0;
                        var tamano = parseInt($(data).find('tam_list').text());

                        if (tamano == 0) {
                            typeof callback == "function" && callback(0);
                        } else {


                            $(data).find('CL_GDE_Proveedor').each(function () {
                                var ID_UNICO_MOVIL = $(this).find('ID_UNICO_MOVIL').text();


                                DATOS_cambiar_estado_envio_gde_individual(ID_UNICO_MOVIL, function (result2) {
                                    conta++;
                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        typeof callback == "function" && callback(1);
                                    }
                                });



                            });
                        }

                    },

                    error: function (err) {
                        // handle your error logic here
                        alert("ERROR AL ENVIAR GUIA" + JSON.stringify(err));
                        typeof callback == "function" && callback(-1);
                    }

                    /*error: function (err) 
                    {
                          alert("error"+err);
              // handle your error logic here
                          
                    }*/
                });

            }



        });

    });



}


function enviar_evidencias_proveedor(bandera, callback) {


    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Evidencia';



        DATOS_seleccionar_evidencias_por_enviar("0", function (result) {
            //alert(result);
            if (result == -1) {
                typeof callback == "function" && callback(0);
            } else {
                var myJsonString = JSON.stringify(result);
                //alert(myJsonString);
                $.ajax({
                    type: "POST",
                    url: ruta,
                    contetType: 'application/json; charset:ISO-8859-1',
                    data: { evidencia: myJsonString },
                    dataType: 'xml',
                    success: function (data) {

                        var conta = 0;
                        var tamano = parseInt($(data).find('tam_list').text());

                        if (tamano == 0) {
                            typeof callback == "function" && callback(0);
                        } else {
                            $(data).find('CL_Evidencia').each(function () {
                                var ID_UNICO_MOVIL = $(this).find('ID_UNICO_MOVIL').text();
                                //alert(ID_UNICO_MOVIL);

                                DATOS_cambiar_estado_envio_gde_evidencia(ID_UNICO_MOVIL, 1, function (result2) {
                                    conta++;
                                    if (confirma_guardado_parametro(conta, tamano) == 1) {
                                        typeof callback == "function" && callback(1);
                                    }
                                });



                            });
                        }

                    },

                    error: function (err) {
                        // handle your error logic here
                        alert("ERROR " + JSON.stringify(err));
                        typeof callback == "function" && callback(-1);
                    }

                    /*error: function (err) 
                    {
                          alert("error"+err);
              // handle your error logic here
                          
                    }*/
                });

            }



        });

    });



}


async function reenviarImagenes(idGde) {
    try {
        // Envolver DATOS_seleccionar_Parametro_movil_por_nombre en una Promesa
        const result_param = await new Promise((resolve, reject) => {
            DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result) {
                if (result) {
                    resolve(result);
                } else {
                    reject(new Error("Error obteniendo parámetro móvil"));
                }
            });
        });

        //const ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Imagen';
        const ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Fotos';
        const evidencias = await DATOS_seleccionar_evidencia_por_guia(idGde);

        if (evidencias === -1) {
            return 0;
        } else {
            let conta = 0;
            const tamano = evidencias.length;

            // Esperar que todas las fotos se suban
            for (let i = 0; i < tamano; i++) {
                //await uploadPhoto(evidencias[i].ARCHIVO, evidencias[i].ID_UNICO_MOVIL, i + 1, tamano, ruta, true);
                await uploadPhotoV2(evidencias[i].ARCHIVO, ruta);
                conta++;
            }

            return conta;
        }
    } catch (error) {
        throw error;
    }
}




function enviar_imagenes(bandera, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {

        const ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Imagen';
        DATOS_seleccionar_evidencias_FOTOS_Por_enviar(0, async function (result) {
            if (result == -1) {
                typeof callback == "function" && callback(0);
            } else {
                var conta = 0;
                var tamano = result.length;
                for (i = 0; i < tamano; i++) {
                    //await uploadPhotoV2(result[i].ARCHIVO, ruta);


                    uploadPhoto(result[i].ARCHIVO, result[i].ID_UNICO_MOVIL, i + 1, tamano, ruta, true, function (result2) {
                        conta++;
                        //alert(conta+"tamano");
                        if (confirma_guardado_parametro(conta, tamano) == 1) {
                            typeof callback == "function" && callback(1);
                        }

                    });

                }
            }
        });
    });

}


async function uploadPhotoV2(path, ruta) {
    alert(path);
    const nombre = path.substr(path.lastIndexOf('/') + 1);


    alert(nombre);
    alert(ruta);

    try {
        const base64Image = await getFileContentAsBase64(path);
        const cadenaParam = `base64String=${encodeURIComponent(base64Image)}&nombre=${encodeURIComponent(nombre)}`;

        return await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', ruta, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject({
                        MENSAJE: xhr.statusText,
                        ERROR_MSJ: xhr.status,
                    });
                }
            };

            xhr.onerror = function () {
                reject({
                    MENSAJE: 'Error en la conexión',
                    ERROR_MSJ: xhr.status,
                });
            };

            xhr.send(cadenaParam);
        });
    } catch (error) {
        throw error;
    }
}



function getFileContentAsBase64(path) {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(path, gotFile, fail);

        function fail(e) {
            reject(new Error('No se pudo encontrar el archivo solicitado'));
        }

        function gotFile(fileEntry) {
            fileEntry.file(function (file) {
                const reader = new FileReader();
                reader.onloadend = function () {
                    resolve(this.result);
                };
                reader.onerror = function () {
                    reject(new Error('Error al leer el archivo'));
                };
                reader.readAsDataURL(file);
            });
        }
    });
}




function uploadPhoto(imageURI, id, num, total, ruta, cambiaEstado = false, callback) {
    var id_imagen = id;
    var options = new FileUploadOptions();
    options.fileKey = "file";
    options.fileName = imageURI.substr(imageURI.lastIndexOf('/') + 1);
    options.mimeType = "image/jpeg";
    //console.log(options.fileName);
    var params = new Object();
    params.value1 = "test";
    params.value2 = "param";
    options.params = params;
    options.chunkedMode = false;

    var ft = new FileTransfer();

    //alert(num+"--"+total);

    ft.upload(imageURI, ruta, function (result) {
        //alert(JSON.stringify(result));
        var response = result.response;
        //alert(response);
        //var valor =$(response).find('string').text();

        if (cambiaEstado === true) {
            DATOS_cambiar_estado_envio_foto_gde_evidencia(id_imagen, 1, function (result) {
                typeof callback == "function" && callback(1);
            });
        } else {
            typeof callback == "function" && callback(1);
        }



        //confirma_carga_imagen(id_imagen, imageURI);

    }, function (error) {



        alert(JSON.stringify(error));

        typeof callback == "function" && callback(1);

    }, options);

}


function ws_cargaGeocercas(rut, empresa, porcentaje_actual, callback) {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        let ruta = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Rescate_geocerca';
        let cadenaParam = "cod_proveedor=1";
        axios
            .post(ruta, cadenaParam)
            .then((response) => {
                let data = response.data;
                if (data.STATUS == true) {
                    let geocercas = data.DATA;
                    var tamano = geocercas.length;
                    var conta = 0;
                    if (tamano == 0) {
                        typeof callback == "function" && callback(0);
                    } else {
                        DATOS_borrar_geocercas(function (result) {

                            geocercas.forEach(function (geocercaData) {
                                var geocerca = new CL_Geocerca(geocercaData.ROL_PREDIO, geocercaData.GEOCERCA, geocercaData.FLAG_CONTROL);
                                DATOS_nuevo_geocerca(geocerca, function (result) {
                                    conta = conta + 1;
                                    porc = ((conta / geocercas.length) * 100) / 6;
                                    porc_entero = Math.floor(porc) + porcentaje_actual;
                                    cambia_progressbar(porc_entero);
                                    if (confirma_guardado_parametro(conta, geocercas.length) == 1) {

                                        typeof callback == "function" && callback(porc_entero);
                                    }
                                });



                            });

                        });
                    }
                } else {
                    //alert(JSON.stringify(error));
                    typeof callback == "function" && callback(-1);
                }
            })
            .catch((error) => {
                //alert(JSON.stringify(error));
                typeof callback == "function" && callback(-1);
            });

    });





}






function confirma_guardado_parametro(conta, tamano) {
    //alert(conta+"-->"+tamano);
    //console.log(conta,tamano)
    cambiar_estado(conta + ":" + tamano, "1")
    if (conta == tamano) return 1;
    else return 0;
}



