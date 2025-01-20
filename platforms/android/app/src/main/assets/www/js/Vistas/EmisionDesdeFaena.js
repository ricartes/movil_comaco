var $$ = Dom7;
var zona_activa = 0;
var rut_valido;
var proyecto_asignado;
var rut_usuario;
var emp_usuario;
var unidad_medida_seleccionada;
var orden_compra_asignada;
var datos_transporte_asignado = new CL_Transporte();
var lat = 0;
var long = 0;
var idgde_acutal;
var gde_actual;
var adicionales;
var tipo_emision = 0;
var es_devolucion;
var destino_asignado;
var mi_cliente;
var cod_forma_pago;
var glosa_forma_pago;
var cod_oc_referencia;
var doc_referencia;
var fecha_oc_referencia;
var u_fe_asignado;
var mi_producto;
var tipo_docto_asignado;
var mi_destino;
var freetext;
var anio_plantacion_asignado;
var plan_manejo_asignado;
var patente_excepcion_permitida = 0;
var gdeRol = null;

var options_gps = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: Infinity
};

//var app  = new Framework7();


$$(document).on('page:init', '.page[data-name="emision-desde-faena"]', function (e, page) {


    rut_valido = 1;
    idgde_acutal = mainView.router.currentRoute.params.idgde;
    tipo_emision = mainView.router.currentRoute.params.tipoemision;




    crear_autocompletar();
    if (Obtener_dato_local("tema_oscuro") == "si") {
        $$("#lb_patente").css("border", "1px solid white");
        $$("#tx_patente_carro").css("border", "1px solid white");
        $$("#lb_rut_transportista").css("border", "1px solid white");
        $$("#lb_nombre_transportista").css("border", "1px solid white");
        $$("#lb_cod_transportista").css("border", "1px solid white");
        $$("#tx_rut_chofer").css("border", "1px solid white");
        $$("#tx_nom_chofer").css("border", "1px solid white");
    }


    //cargar_datos_usuario(1);
    tabla_proveedores(idgde_acutal);
    app.dialog.close();
    $$('#combo_producto').change(function () {

        var seleccionado = $$("#combo_producto").val();
        var seleccionado_texto = $("#combo_producto :selected").text();
        seleccionado_texto = seleccionado_texto.replace(/(\r\n|\n|\r)/gm, "");
        var label = '<label" >' + seleccionado_texto + ' </label>';
        var texto = label.concat('<div class="item-title" style="width: 100%;"></div>');
        $$("#texto_producto").html(texto);
    });



});



function crear_autocompletar() {
    var autocompleteStandaloneSimple = app.autocomplete.create({
        openIn: 'page', //open in page
        openerEl: '#autocomplete-standalone-popup', //link that opens autocomplete
        closeOnSelect: true, //go back after we select something
        searchbarPlaceholder: "Búsqueda",
        source: function (query, render) {

            var results = [];
            //alert(query.value);
            if (query.value.length === 0) {
                render(results);
                return;
            }

            //alert("entro aca");

            DATOS_seleccionar_transporte_mejorado(zona_activa, query.value.toUpperCase(), function (resultado_patentes) {
                //alert(resultado_patentes);
                if (resultado_patentes != -1) {
                    //alert(resultado_patentes);
                    for (var i = 0; i < resultado_patentes.length; i++) {
                        results.push(resultado_patentes[i].CODIGO);
                    }
                }
                render(results);

            });
            // Find matched items

            // Render items by passing array with result items

        },
        on: {
            change: function (value) {

                $$('#autocomplete-standalone-popup').find('.item-after').text(value[0]);
                $$('#autocomplete-standalone-popup').find('input').val(value[0]);
                var seleccionado_transporte = value[0];
                if (seleccionado_transporte != 0) {
                    //$$("#datos_patente").css("display", "block");


                    DATOS_seleccionar_transportePorPatente(seleccionado_transporte, function (result) {
                        datos_transporte_asignado = result[0];
                        $$("#lb_patente").val(result[0].PAT_CAMION);
                        $$("#tx_patente_carro").val(result[0].PAT_CARRO);
                        $$("#lb_rut_transportista").val(result[0].RUT_TRANSPORTISTA);
                        $$("#lb_nombre_transportista").val(result[0].NOMBRE_TRANSPORTISTA);
                        $$("#lb_cod_transportista").val(result[0].COD_TRANSPORTISTA);
                        $$("#tx_rut_chofer").val(result[0].RUT_CHOFER);
                        $$("#tx_nom_chofer").val(result[0].NOMBRE_CHOFER);

                        $$("#datos_transportista").css("display", "none");

                        var patente = result[0].PAT_CAMION;
                        patente = patente.replace('-', '');

                        DATOS_comprobar_ex_patante(patente, function (flag) {
                            if (flag == 0) {
                                patente_excepcion_permitida = -1;
                                $$("#tx_patente_carro").prop("disabled", true);
                                $$("#tx_rut_chofer").prop("disabled", true);
                                $$("#tx_nom_chofer").prop("disabled", true);
                                $$("#tx_patente_carro").prop("disabled", true);
                                $$("#lb_rut_transportista").prop("disabled", true);
                                $$("#lb_nombre_transportista").prop("disabled", true);
                                $$("#lb_cod_transportista").prop("disabled", true);

                                alerta(16);
                                return false;
                            } else {
                                $$("#tx_patente_carro").prop("disabled", false);
                                $$("#tx_rut_chofer").prop("disabled", false);
                                $$("#tx_nom_chofer").prop("disabled", false);
                                $$("#tx_patente_carro").prop("disabled", false);
                                $$("#lb_rut_transportista").prop("disabled", false);
                                $$("#lb_nombre_transportista").prop("disabled", false);
                                $$("#lb_cod_transportista").prop("disabled", false);
                                if (flag == -1) {
                                    patente_excepcion_permitida = 0;
                                } else {
                                    if (flag == 1) {
                                        patente_excepcion_permitida = 1;
                                    }
                                }


                            }
                        });
                    });

                } else {
                    //$$("#datos_patente").css("display", "none");
                }
            },
        },
    });


}


function patente_camion_change() {


    if ($$("#lb_patente").val() && $$("#lb_patente").val().length >= 6) {
        patente_excepcion_permitida = 0;
        $$("#tx_patente_carro").prop("disabled", false);
        $$("#tx_rut_chofer").prop("disabled", false);
        $$("#tx_nom_chofer").prop("disabled", false);

        DATOS_seleccionar_transportePorPatente($$("#lb_patente").val().toUpperCase(), function (result) {
            if (result == -1) {

                $$("#datos_transportista").css("display", "block");
                $$("#tx_patente_carro").val("");
                $$("#lb_rut_transportista").val("");
                $$("#lb_nombre_transportista").val("");
                $$("#lb_cod_transportista").val("0");
                $$("#tx_rut_chofer").val("");
                $$("#tx_nom_chofer").val("");
                $$('#autocomplete-standalone-popup').find('.item-after').text("");
                $$('#autocomplete-standalone-popup').find('input').val("");
                var autocompleteStandaloneSimple = app.autocomplete.get('#autocomplete-standalone-popup');
                autocompleteStandaloneSimple.destroy();
                crear_autocompletar();




            } else {

                datos_transporte_asignado = result[0];
                $$("#datos_transportista").css("display", "none");
                $$("#lb_patente").val(result[0].PAT_CAMION);
                $$("#tx_patente_carro").val(result[0].PAT_CARRO);
                $$("#lb_rut_transportista").val(result[0].RUT_TRANSPORTISTA);
                $$("#lb_nombre_transportista").val(result[0].NOMBRE_TRANSPORTISTA);
                $$("#lb_cod_transportista").val(result[0].COD_TRANSPORTISTA);
                $$("#tx_rut_chofer").val(result[0].RUT_CHOFER);
                $$("#tx_nom_chofer").val(result[0].NOMBRE_CHOFER);
                //$$("#combo_transporte").val(result[0].PAT_CAMION);
                $$('#autocomplete-standalone-popup').find('.item-after').text(result[0].PAT_CAMION);
                $$('#autocomplete-standalone-popup').find('input').val(result[0].PAT_CAMION);
            }


            var patente = $$("#lb_patente").val().toUpperCase();
            patente = patente.replace('-', '');



            DATOS_comprobar_ex_patante(patente, function (flag) {
                if (flag == 0) {
                    patente_excepcion_permitida = -1;
                    $$("#tx_patente_carro").prop("disabled", true);
                    $$("#tx_rut_chofer").prop("disabled", true);
                    $$("#tx_nom_chofer").prop("disabled", true);
                    $$("#tx_patente_carro").prop("disabled", true);
                    $$("#lb_rut_transportista").prop("disabled", true);
                    $$("#lb_nombre_transportista").prop("disabled", true);
                    $$("#lb_cod_transportista").prop("disabled", true);
                    alerta(16);
                    return false;
                } else {
                    $$("#tx_patente_carro").prop("disabled", false);
                    $$("#tx_rut_chofer").prop("disabled", false);
                    $$("#tx_nom_chofer").prop("disabled", false);
                    $$("#tx_patente_carro").prop("disabled", false);
                    $$("#lb_rut_transportista").prop("disabled", false);
                    $$("#lb_nombre_transportista").prop("disabled", false);
                    $$("#lb_cod_transportista").prop("disabled", false);
                    if (flag == -1) {
                        patente_excepcion_permitida = 0;
                    } else {
                        if (flag == 1) {
                            patente_excepcion_permitida = 1;
                        }
                    }


                }
            });

        });

    }

}


function limpiar_datos_transporte() {

    app.dialog.confirm('¿Está seguro que desea limpiar datos de transporte?', "GFE Proveedores", function () {

        $$("#datos_transportista").css("display", "none");

        $$("#lb_patente").val("");
        $$("#tx_patente_carro").val("");
        $$("#lb_rut_transportista").val("");
        $$("#lb_nombre_transportista").val("");
        $$("#lb_cod_transportista").val("");
        $$("#tx_rut_chofer").val("");
        $$("#tx_nom_chofer").val("");
        $$('#autocomplete-standalone-popup').find('.item-after').text("");
        $$('#autocomplete-standalone-popup').find('input').val("");

        var autocompleteStandaloneSimple = app.autocomplete.get('#autocomplete-standalone-popup');
        autocompleteStandaloneSimple.destroy();
        crear_autocompletar();


    });
}



async function guardar_guia() {

    if (valida()) {
        app.dialog.preloader("Guadando...");
        const datosUbicacion = await getLocation2();

        if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.avanzaHaciaCamionVacio) {

            validarGeocerca(gdeRol).then((resultadoGeocerca) => {
                let resultadoValidacion = resultadoGeocerca.validacion;
                validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.inicial).then((resultado) => {
                    //si debe cerrar control
                    if (resultado.cierra) {
                        ControlServiceAnular(idgde_acutal, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "I").then((anula) => {
                            if (anula) {
                                (async () => {
                                    let datos = await generarDataTrazabilidad(
                                        TipoAccionTypes.GEOCERCA_INVALIDA,
                                        Obtener_dato_local('user_activo'),
                                        {
                                            rol: gdeRol,
                                            despacho: gde_actual,
                                            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                        }
                                    );

                                    await obtenerUbicacionEInsertarLog(
                                        Obtener_dato_local('user_activo'),
                                        datos
                                    );
                                    app.dialog.close();
                                    app.dialog.alert(resultado.mensaje, "GFE", function () {
                                        mainView.router.navigate("/");
                                    });

                                })();

                            }
                        });
                    }
                    else {

                        if (resultado.advertencia) {
                            (async () => {
                                let datos = await generarDataTrazabilidad(
                                    TipoAccionTypes.GEOCERCA_ADVERTENCIA,
                                    Obtener_dato_local('user_activo'),
                                    {
                                        rol: gdeRol,
                                        despacho: gde_actual,
                                        id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                    }
                                );

                                await obtenerUbicacionEInsertarLog(
                                    Obtener_dato_local('user_activo'),
                                    datos
                                );
                                app.dialog.close();
                                app.dialog.alert(resultado.mensaje, "GFE", function () {
                                    guardar_datos_guia(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON);

                                });

                            })();


                        } else {
                            app.dialog.close();
                            guardar_datos_guia(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON);
                        }
                    }

                });


            }).catch((e) => {
                app.dialog.close();
                app.dialog.alert(e, "GFE")
                reject(e);
            });


        } else {
            app.dialog.close();
            guardar_datos_guia(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON);

        }
    }
}




async function recargarr_datos_gde(id_gde) {
    const accion = idgde_acutal != "-1" ? TipoAccionTypes.INICIA_INFORMAR_DESPACHO_BORRADOR : TipoAccionTypes.INICIA_INFORMAR_DESPACHO;

    let datos = await generarDataTrazabilidad(
        accion,
        Obtener_dato_local('user_activo')
    );
    datos.metadata.rol = gdeRol;

    if (id_gde != "-1") {
        app.dialog.progress("Cargando...")

        try {
            gde_actual = await seleccionarGdeProveedor(id_gde);

            datos.metadata.rol = gde_actual?.GDE_COD_ORIGEN ?? null;
            datos.metadata.despacho = gde_actual;
            datos.metadata.id_unico_movil_gde = gde_actual?.ID_UNICO_MOVIL ?? null;
            await obtenerUbicacionEInsertarLog(
                Obtener_dato_local('user_activo'),
                datos
            );



            $$('#autocomplete-standalone-popup').find('.item-after').text(gde_actual.GDE_PATENTE_CAMION);
            $$('#autocomplete-standalone-popup').find('input').val(gde_actual.GDE_PATENTE_CAMION);
            $$("#tx_latitud_inicial").val(gde_actual.GDE_COORDENADA_INICIAL_X);
            $$("#tx_longitud_inicial").val(gde_actual.GDE_COORDENADA_INICIAL_Y);

            $$('#tabla_proveedores [type="radio"]').each(function (i, chk) {
                //alert(chk.value+"--"+id_gde);
                if (chk.value == gde_actual.DocEntry) {
                    chk.checked = true;
                }
            });


            combo_productos(gde_actual.GDE_COD_PROYECTO, 1);
            recargar_combo_transportista2();
        } catch (ex) {
            app.dialog.alert("Ha ocurrido un error al cargar los datos en borrrador");
        } finally {
            app.dialog.close();
        }


    } else {
        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local('user_activo'),
            datos
        );
    }

}



function guardar_datos_guia(latitud, longitud) {
    var gde = new CL_GDE();
    var cont = 0;
    $$('#tabla_proveedores [type="radio"]').each(function (i, chk) {
        if (chk.checked) {
            cont++;
            gde.DocEntry = chk.value;
        }
    });




    if (cont == 1) {
        gde.EMP_ID = 1;
        gde.ENVIADO = 0;
        gde.GDE_COD_DESPACHADOR = Obtener_dato_local("rut_activo");
        gde.GDE_COD_TRANSPORTISTA = $$("#lb_cod_transportista").val();
        gde.GDE_NOMBRE_TRANSPORTISTA = $$("#lb_nombre_transportista").val();
        gde.GDE_RUT_CONDUCTOR = $$("#tx_rut_chofer").val();
        gde.GDE_NOM_CONDUCTOR = $$("#tx_nom_chofer").val();
        gde.GDE_PATENTE_CAMION = $$("#lb_patente").val();
        gde.GDE_PATENTE_CARRO = $$("#tx_patente_carro").val().toUpperCase();
        gde.GDE_COORDENADA_X = latitud;
        gde.GDE_COORDENADA_Y = longitud;
        gde.GDE_COORDENADA_INICIAL_X = $$("#tx_latitud_inicial").val();
        gde.GDE_COORDENADA_INICIAL_Y = $$("#tx_longitud_inicial").val();
        gde.GDE_COD_PRODUCTO = $$("#combo_producto").val();
        gde.GDE_PATENTE_EX = 0;

        if (patente_excepcion_permitida == 1) {
            gde.GDE_PATENTE_EX = 1;
        }


        DATOS_seleccionar_datos_proveedores_por_DocEntry(gde.DocEntry, gde.GDE_COD_PRODUCTO, function (proveedor) {



            gde.GDE_COD_CLIENTE = proveedor.C_codigo;
            gde.GDE_NOMBRE_CLIENTE = proveedor.SN_Nombre
            gde.GDE_DESTINO = proveedor.SN_Destino
            gde.GDE_COD_PROYECTO = proveedor.project;
            gde.GDE_NOMBRE_PREDIO = proveedor.Predio;
            gde.GDE_ROL_COMUNA = proveedor.Rol_comuna;
            gde.GDE_ROL = proveedor.Rol;
            gde.GDE_NOMBRE_PRODUCTO = proveedor.Description;
            gde.GDE_COD_ORIGEN = proveedor.NumAtCard;
            gde.ID_UNICO_MOVIL = "gde_pro" + obtener_IDUNICO();
            gde.GDE_ESTADO_MOVIL = "B";

            if (idgde_acutal != "-1") {

                DATOS_actualiza_gde_proveedor(gde, idgde_acutal, function (result_guardado) {


                    abrir_detalles(idgde_acutal, 2);

                });

            } else {

                DATOS_guarda_gde_proveedor(gde, function (result_guardado) {

                    Guardar_dato_local("id_proceso_activo", result_guardado.insertId);
                    Guardar_dato_local("id_unico_proceso_activo", gde.ID_UNICO_MOVIL);
                    Guardar_dato_local("hora_inicio_proceso", Date.now());
                    abrir_detalles(result_guardado.insertId, 2);

                });
            }
        });


    } else {

        alert("error de seleccion");
    }

}


function abrir_detalles(id_gde, opcion) {
    var zona = 0;
    app.dialog.close();
    mainView.router.navigate('/CamionVacio/' + zona + '/' + id_gde + '/' + opcion);
}


function tabla_proveedores(id_gde) {
    var fecha_hora = fecha_actual();
    DATOS_seleccionar_datos_proveedores("1", fecha_hora, function (result) {
        var htmls = "";
        for (i = 0; i < result.length; i++) {
            htmls +=
                '<tr> <td><label class="radio"  onclick="cambia_proyecto(\'' + result[i].project + '\',\'' + result[i].NumAtCard + '\');"> ';
            htmls += "<input type='radio' class='t_proveedores' name='radio_gde_prov' value='" +
                result[i].DocEntry +
                "'><i class='icon-radio'></i></label> </td><td>" +
                result[i].Rol +
                "-" +
                result[i].Predio +
                "</td><td class='label-cell'>" +
                result[i].SN_Nombre +
                "-" +
                result[i].SN_Destino +
                "</td> </tr>";
        }

        $$("#tbody_tabla_proveedores").html(htmls);
        recargarr_datos_gde(id_gde);


    });

}





function recargar_combo_transportista() {
    $$("#combo_transporte").val(gde_actual.GDE_PATENTE_CAMION);
    //alert(gde_actual.GDE_PATENTE_CAMION);
    var seleccionado_transporte = $$('#autocomplete-standalone-popup').find('input').val();

    if (gde_actual.GDE_ESTADO_MOVIL == "I" || gde_actual.GDE_ESTADO_MOVIL == "M" || gde_actual.GDE_ESTADO_MOVIL == "E" || gde_actual.GDE_ESTADO_MOVIL == "N") {


        $$("#item6").addClass("disabled");
        $$("#autocomplete-standalone-popup").prop("disabled", true);
        $$("#tx_rut_chofer").prop("disabled", true);
        $$("#tx_nom_chofer").prop("disabled", true);
        $$("#tx_patente_carro").prop("disabled", true);
    }



    //console.log(seleccionado);

    if (seleccionado_transporte != 0) {
        $$("#datos_patente").css("display", "block");
        DATOS_seleccionar_transportePorPatente(seleccionado_transporte, function (result) {
            datos_transporte_asignado = result[0];
            $$("#lb_patente").val(result[0].PAT_CAMION);
            $$("#tx_patente_carro").val(gde_actual.GDE_PATENTE_CARRO);
            $$("#lb_rut_transportista").val(result[0].RUT_TRANSPORTISTA);
            $$("#lb_nombre_transportista").val(result[0].NOMBRE_TRANSPORTISTA);
            $$("#lb_cod_transportista").val(result[0].COD_TRANSPORTISTA);
            $$("#tx_rut_chofer").val(gde_actual.GDE_RUT_CONDUCTOR);
            $$("#tx_nom_chofer").val(gde_actual.GDE_NOMBRE_CHOFER);


            $$("input#tx_rut_chofer").rut().on('rutInvalido', function (e) {
                rut_valido = 0;
                //alert("El rut ingresado no es válido");
            });

            $$("input#rut").rut().on('rutInvalido', function (e) {
                rut_valido = 1;
            });

        });

    } else {
        $$("#datos_patente").css("display", "none");
    }
}


function recargar_combo_transportista2() {

    $$("#lb_patente").val(gde_actual.GDE_PATENTE_CAMION);
    $$("#tx_patente_carro").val(gde_actual.GDE_PATENTE_CARRO);
    $$("#lb_rut_transportista").val(gde_actual.GDE_PATENTE_CAMION);
    $$("#lb_nombre_transportista").val(gde_actual.GDE_NOMBRE_TRANSPORTISTA);
    $$("#lb_cod_transportista").val(gde_actual.GDE_COD_TRANSPORTISTA);
    $$("#tx_rut_chofer").val(gde_actual.GDE_RUT_CONDUCTOR);
    $$("#tx_nom_chofer").val(gde_actual.GDE_NOM_CONDUCTOR);

}


function volver_menu() {

    app.dialog.confirm('¿Está seguro que desea volver al menú principal?', "Emisión", function () {
        (async () => {
            inicializarDatosGde();
            app.dialog.preloader("Cargando...");
            let datos = await generarDataTrazabilidad(
                TipoAccionTypes.SALIR_INFORME_DESPACHO,
                Obtener_dato_local('user_activo'),
                {
                    rol: gdeRol,
                    despacho: gde_actual,
                    id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                }
            );

            await obtenerUbicacionEInsertarLog(
                Obtener_dato_local('user_activo'),
                datos
            );
            app.dialog.close();
            mainView.router.navigate("/");

        })();
    });

}










function valida() {
    var res = true;
    var seleccionado = false;
    $$('#tabla_proveedores [type="radio"]').each(function (i, chk) {
        if (chk.checked) {
            seleccionado = true;
        }
    });

    if (patente_excepcion_permitida == -1) {
        alerta(16);
        return false;
    }


    if (seleccionado == false) {
        alerta(3);
        return false;
    }


    if ($$("#tx_nom_chofer").val() == "" || $$("#tx_latitud_inicial").val() == "" || $$("#tx_longitud_inicial").val() == "" || $$("#lb_patente").val() == "" || $$("#lb_cod_transportista").val() == "" || $$("#lb_rut_transportista").val() == "" || $$("#lb_nombre_transportista").val() == "") {
        alerta(3);
        return false;
    }


    if (!Fn.validaRut($$("#tx_rut_chofer").val()) || $$("#tx_rut_chofer").val() == "") {
        alerta(4);
        return false;
    }


    if ($$("#combo_producto").val() == "") {
        alerta(3);
        return false;
    }

    return res;
}




async function obtener_punto_inicial() {

    app.dialog.preloader("Obteniendo Punto...");
    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.INGRESA_PUNTO_INICIAL,
        Obtener_dato_local('user_activo'),
        {
            rol: gdeRol,
            despacho: gde_actual,
            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
        }
    );



    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );


    //obtiene puntos
    const datosUbicacion = await getLocation2();

    if (datosUbicacion.status) {

        if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.puntoInicial) {
            validarGeocerca(gdeRol).then((resultadoGeocerca) => {
                let resultadoValidacion = resultadoGeocerca.validacion;


                validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.inicial).then((resultado) => {
                    //si debe cerrar control

                    if (resultado.cierra) {
                        ControlServiceAnular(idgde_acutal, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "I").then((anula) => {
                            if (anula) {
                                (async () => {
                                    let datos = await generarDataTrazabilidad(
                                        TipoAccionTypes.GEOCERCA_INVALIDA,
                                        Obtener_dato_local('user_activo'),
                                        {
                                            rol: gdeRol,
                                            despacho: gde_actual,
                                            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                        }
                                    );

                                    await obtenerUbicacionEInsertarLog(
                                        Obtener_dato_local('user_activo'),
                                        datos
                                    );
                                    app.dialog.close();
                                    app.dialog.alert(resultado.mensaje, "GFE", function () {
                                        mainView.router.navigate("/");
                                    });

                                })();

                            }
                        });
                    }
                    else {

                        if (resultado.advertencia) {
                            (async () => {
                                let datos = await generarDataTrazabilidad(
                                    TipoAccionTypes.GEOCERCA_ADVERTENCIA,
                                    Obtener_dato_local('user_activo'),
                                    {
                                        rol: gdeRol,
                                        despacho: gde_actual,
                                        id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                    }
                                );

                                await obtenerUbicacionEInsertarLog(
                                    Obtener_dato_local('user_activo'),
                                    datos
                                );
                                app.dialog.close();
                                app.dialog.alert(resultado.mensaje, "GFE", function () {
                                    asignar_puntos_inicio(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON);
                                });

                            })();

                        } else {
                            app.dialog.close();
                            asignar_puntos_inicio(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON);
                        }

                    }

                });


            }).catch((e) => {
                app.dialog.close();
                app.dialog.alert(e, "GFE")
                reject(e);
            });

        } else {
            app.dialog.close();
            asignar_puntos_inicio(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON);
        }

    } else {
        let datos = await generarDataTrazabilidad(
            TipoAccionTypes.UBICACION_DESACTIVADA,
            Obtener_dato_local('user_activo'),
            {
                rol: gdeRol,
                despacho: gde_actual,
                id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local('user_activo'),
            datos
        );
        app.dialog.close();
        app.dialog.alert("Servicios de ubicación se encuentran desactivados. Favor activar para continuar", "GFE");
        return false;
    }

}


function asignar_puntos_inicio(latitud, longitud) {
    $$("#tx_latitud_inicial").val(latitud);
    $$("#tx_longitud_inicial").val(longitud);
    $$("#btn_punto_final").css('display', 'block');
}


function alerta_geocerca_punto_inicial(geocerca) {
    alerta(17);
}




async function cambia_proyecto(codproyecto, rol) {


    app.dialog.preloader("Cargando...");
    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.SELECCION_PCR,
        Obtener_dato_local('user_activo'),
        {
            rol: rol,
            codproyecto: codproyecto,
            despacho: gde_actual,
            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
        }
    );
    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );
    gdeRol = rol;

    if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.seleccionPredio) {
        validarGeocerca(rol).then((resultado) => {
            let resultadoValidacion = resultado.validacion;
            validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.inicial).then((resultado) => {
                //si debe cerrar control
                if (resultado.cierra) {
                    ControlServiceAnular(idgde_acutal, resultado.latitud, resultado.longitud, "I", constantes.mensajeGeocercaNoValida).then((anula) => {
                        if (anula) {
                            (async () => {
                                let datos = await generarDataTrazabilidad(
                                    TipoAccionTypes.GEOCERCA_INVALIDA,
                                    Obtener_dato_local('user_activo'),
                                    {
                                        rol: rol,
                                        despacho: gde_actual,
                                        id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                    }
                                );

                                await obtenerUbicacionEInsertarLog(
                                    Obtener_dato_local('user_activo'),
                                    datos
                                );
                                app.dialog.close();
                                app.dialog.alert(resultado.mensaje, "GFE", function () {
                                    mainView.router.navigate("/");
                                });

                            })();
                        }

                    });
                }
                else {
                    combo_productos(codproyecto, 0);
                    if (resultado.advertencia) {
                        (async () => {
                            let datos = await generarDataTrazabilidad(
                                TipoAccionTypes.GEOCERCA_ADVERTENCIA,
                                Obtener_dato_local('user_activo'),
                                {
                                    rol: rol,
                                    despacho: gde_actual,
                                    id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                }
                            );

                            await obtenerUbicacionEInsertarLog(
                                Obtener_dato_local('user_activo'),
                                datos
                            );
                            app.dialog.close();
                            app.dialog.alert(resultado.mensaje, "GFE");

                        })();
                    } else {
                        app.dialog.close();
                    }
                }

            });


        }).catch((e) => {
            app.dialog.close();
            app.dialog.alert(e, "GFE")
            reject(e);
        });

    } else {
        app.dialog.close();
        combo_productos(codproyecto, 0);
    }




    //combo_productos(codproyecto, 0);


}


function recargar_combo_productos() {


    $$("#combo_producto").val(gde_actual.GDE_COD_PRODUCTO);
    var seleccionado = $$("#combo_producto").val();

    var seleccionado_texto = $("#combo_producto :selected").text();

    seleccionado_texto = seleccionado_texto.replace(/(\r\n|\n|\r)/gm, "");
    var label = '<label" >' + seleccionado_texto + ' </label>';
    var texto = label.concat('<div class="item-title" style="width: 100%;"></div>');
    $$("#texto_producto").html(texto);
}




function combo_productos(codproyecto, indicador_recarga) {

    DATOS_seleccionar_producto(codproyecto, function (result) {
        if (result != -1) {

            var htmls = "";
            htmls += "<option value='' selected disabled>SELECCIONAR</option>";
            for (i = 0; i < result.length; i++) {

                htmls += "<option value='" + result[i].COD_PRODUCTO + "'>" + result[i].NOM_PRODUCTO + "</option>";
            }

            $$("#combo_producto").html(htmls);
            $$("#texto_producto").html('SELECCIONAR<div class="item-title" style="width: 100%;"></div>');

            if (idgde_acutal != "-1" && indicador_recarga == 1) {
                recargar_combo_productos();
            }

        } else {
            hay_parametro = 0;
        }

    });

}


function combo_transporte(zona, indicador_recarga) {
    //alert("A SELECCIONAR FAENAS");

    DATOS_seleccionar_transporte(zona, function (result) {
        if (result != -1) {

            hay_parametro = 1;
            var htmls = "";
            htmls += "<option value='' selected disabled>SELECCIONAR</option>";
            for (i = 0; i < result.length; i++) {
                htmls += "<option value='" + result[i].CODIGO + "'>" + result[i].DESCRIPCION + "</option>";
            }
            $$("#combo_transporte").html(htmls);
            $$("#texto_transporte").html('SELECCIONAR<div class="item-title" style="width: 100%;"></div>');
            if (idgde_acutal != "-1" && indicador_recarga == 1) {
                recargar_combo_transportista();
            }

            //sm.unsetValue ()
        } else {
            hay_parametro = 0;
        }
    });

}


/*function cambiar_patente(){
  if($$("#tx_patente_camion").val().length>0){
    combo_transporte_mejorado(zona_activa,$$("#tx_patente_camion").val().toUpperCase(),0);
  }else{
    //combo_transporte_mejorado(zona_activa,"AAAA",0);
  }
  
}*/


function combo_transporte_mejorado(zona, valor, indicador_recarga) {

    recargar_combo_transportista2();
    if (idgde_acutal != "-1" && indicador_recarga == 1) {
        recargar_combo_transportista();
    }



}


















