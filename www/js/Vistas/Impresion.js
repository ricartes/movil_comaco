var $$ = Dom7;
var zona_activa;
var id_gde;
var tipo_volumen;
var gde_actual;
var tipo_emision;


$$(document).on('page:init', '.page[data-name="impresion"]', function (e, page) {





    zona_activa = mainView.router.currentRoute.params.idzona;
    $$("#usuario1").html(Obtener_dato_local("user_activo"))
    $$("#zona1").html(zona_activa)
    id_gde = mainView.router.currentRoute.params.idgde;
    tipo_volumen = parseInt(mainView.router.currentRoute.params.tipovolumen);
    tipo_emision = mainView.router.currentRoute.params.tipoemision;





    if (id_gde != "-1") {
        //alert("recarga gde");
        DATOS_seleccionar_gde(id_gde, function (result) {

            gde_actual = result;
            //alert(gde_actual.GDE_ESTADO_MOVIL);
            if (gde_actual.GDE_ESTADO_MOVIL == "B" || gde_actual.GDE_ESTADO_MOVIL == "P") {
                //$("#row_imprimir").css("display","none");
                $$("#row_emitir").css("display", "none");

                $$("#row_anular").css("display", "none");
                $$("#row_cedible").css("display", "none");
                $$("#row_reenviar_fotos").css("display", "none");

                if (gde_actual.GDE_ESTADO_MOVIL == "B") {
                    $$("#row_borrador").css("display", "none");
                }
            }


            if (gde_actual.GDE_ESTADO_MOVIL == "M") {

                $$("#row_borrador").css("display", "none");
                $$("#row_emitir").css("display", "none");
                $$("#row_anular").css("display", "none");
                $$("#row_cedible").css("display", "none");
                $$("#row_cedible").css("display", "none");
                $$("#row_borra_borrador").css("display", "none");
                $$("#row_reenviar_fotos").css("display", "none");
                //$$("#row_reimprimir").css("display","block");
                //$$("#row_imprimir").css("display","none");
            }

            if (gde_actual.GDE_ESTADO_MOVIL == "I") {
                $$("#row_borrador").css("display", "none");
                $$("#row_imprimir").css("display", "none");
                $$("#row_emitir").css("display", "none");
                $$("#row_cedible").css("display", "none");
                $$("#row_borra_borrador").css("display", "none");
                //$$("#row_reimprimir").css("display","block");
            }

            if (gde_actual.GDE_ESTADO_MOVIL == "N" || gde_actual.GDE_ESTADO_MOVIL == "E") {
                $$("#row_borrador").css("display", "none");
                $$("#row_imprimir").css("display", "none");
                $$("#row_emitir").css("display", "none");
                $$("#row_cedible").css("display", "none");
                $$("#row_borra_borrador").css("display", "none");


                var bits = gde_actual.GDE_FECHA_EMISION.split(/\D/);
                var fecha_emision_date = new Date(bits[0], --bits[1], bits[2], bits[3], bits[4]);
                var hoy = new Date();
                const diffTime = Math.abs(hoy - fecha_emision_date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));




                if (gde_actual.GDE_ESTADO_MOVIL == "N" || gde_actual.GDE_ANULADA == 1 || diffDays >= 7) {
                    $$("#row_anular").css("display", "none");
                }
            }



        });

        //alert(zona_activa);

    }

});


function volver_comentarios() {
    if (gde_actual.GDE_ESTADO_MOVIL == "N" || gde_actual.GDE_ESTADO_MOVIL == "E") {
        //alert("menu");
        seleccion_zonas();
        mainView.router.navigate('/');
    } else {
        mainView.router.navigate('/Comentarios/' + zona_activa + '/' + id_gde + '/' + tipo_volumen + '/' + tipo_emision);
    }
}


function vista_preliminar(origen) {
    //alert("vista preliminar");
    mainView.router.navigate('/VistaPreliminar/' + zona_activa + '/' + id_gde + '/' + tipo_volumen + '/' + tipo_emision + '/' + origen);
}

function vista_preliminar_cedible(origen) {
    mainView.router.navigate('/VistaPreliminarCedible/' + zona_activa + '/' + id_gde + '/' + tipo_volumen + '/' + tipo_emision + '/' + origen);
}


function guardar_borrador() {
    var estado = "B";

    DATOS_cambiar_estado_gde(id_gde, estado, function (result) {
        if (tipo_volumen == 2) {
            DATOS_cambia_estado_gdep_pulpable(id_gde, estado, function (result2) {
                app.dialog.alert("Borrador guardado correctamente", "GFE", function () {

                    mainView.router.navigate('/');
                    seleccion_zonas();
                });

            });

        } else {
            DATOS_cambia_estado_gdep_aserrable(id_gde, estado, function (result1) {
                app.dialog.alert("Borrador guardado correctamente", "GFE", function () {

                    mainView.router.navigate('/');
                    seleccion_zonas();
                });


            });
        }
    });

}



function descartar_borrador() {

    app.dialog.confirm('¿Está seguro que desea descartar el borrador?', "GFE", function () {
        if (tipo_volumen == 2) {

            DATOS_descartar_borrador_pulpable(id_gde, function (result) {
                DATOS_descartar_borrador(id_gde, function (result) {
                    app.dialog.alert("Borrador descartado correctamente", "GFE", function () {

                        mainView.router.navigate('/');
                        seleccion_zonas();
                    });

                });

            });

        } else {

            DATOS_descartar_borrador_aserrable(id_gde, function (result) {
                DATOS_descartar_borrador(id_gde, function (result) {

                    app.dialog.alert("Borrador descartado correctamente", "GFE", function () {

                        mainView.router.navigate('/');
                        seleccion_zonas();
                    });

                });

            });

        }
    });
}


function emitir_guia() {


    var estado = "M";

    DATOS_cambiar_estado_gde(id_gde, estado, function (result) {

        if (tipo_volumen == 2) {

            DATOS_cambia_estado_gdep_pulpable(id_gde, estado, function (result2) {

                app.dialog.alert("Guia emitida correctamente", "GFE", function () {

                    mainView.router.navigate('/');
                    seleccion_zonas();
                });


            });

        } else {
            DATOS_cambia_estado_gdep_aserrable(id_gde, estado, function (result2) {
                app.dialog.alert("Guia emitida correctamente", "GFE", function () {

                    mainView.router.navigate('/');
                    seleccion_zonas();
                });


            });
        }
    });
}


function reenviarFotos() {
    app.dialog.confirm('¿Está seguro que desea reenviar las fotos?', "GFE", function () {

        reenviarFotosService(id_gde)
            .then(message => {
                app.dialog.alert(message, "GFE");
            })
            .catch(error => {
                app.dialog.alert(error, "GFE");
            });

    });


}



function anular_guia() {

    // Prompt

    app.dialog.prompt('Ingresar motivo Anulación Guía', "GFE", function (motivo) {


        if (motivo == "") {
            app.dialog.alert("Falta ingresar motivo anulación", "GFE", function () {
                return false;
            });
        } else {
            var estado = "N";
            var rut = Obtener_dato_local("rut_activo");
            var empresa = Obtener_dato_local("empresa_activo");


            DATOS_Existe_folio(estado, rut, empresa, gde_actual.GDE_FOLIO, function (contador) {
                if (contador > 0) {


                    if (gde_actual.ENVIADO == 1) {

                        var bits = gde_actual.GDE_FECHA_EMISION.split(/\D/);
                        var fecha_emision_date = new Date(bits[0], --bits[1], bits[2], bits[3], bits[4]);
                        var hoy = new Date();
                        const diffTime = Math.abs(hoy - fecha_emision_date);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays >= 7) {
                            app.dialog.alert("No se puede anular, han pasado 7 o mas días desde que la guia fue emitida", "GFE", function () {
                                return false;
                            });

                        } else {
                            if (checkConnection() == "No network connection") {
                                app.dialog.alert("Conexión a Internet no detectada", "GFE", function () {
                                    return false;
                                });
                            } else {

                                app.dialog.preloader("Anulando guía");
                                comprueba_conexion("0", function (result_conexion) {
                                    if (result_conexion == 1) {
                                        anular_guia_ws(gde_actual.GDE_FOLIO, motivo, function (resultado_ws) {

                                            if (resultado_ws == "ok") {
                                                DATOS_Cambia_estado_folio(estado, rut, empresa, gde_actual.GDE_FOLIO, function (result) {

                                                    DATOS_cambiar_estado_gde(id_gde, estado, function (resul4) {

                                                        DATOS_motivo_anulacion_gde(id_gde, motivo, function (resul5) {

                                                            if (tipo_volumen == 2) {
                                                                DATOS_cambia_estado_gdep_pulpable(id_gde, estado, function (result2) {
                                                                    app.dialog.close();
                                                                    app.dialog.alert("Guia anulada correctamente", "GFE", function () {

                                                                        mainView.router.navigate('/');
                                                                        seleccion_zonas();
                                                                    });
                                                                });

                                                            } else {
                                                                DATOS_cambia_estado_gdep_aserrable(id_gde, estado, function (result2) {
                                                                    app.dialog.close();
                                                                    app.dialog.alert("Guia anulada correctamente", "GFE", function () {

                                                                        mainView.router.navigate('/');
                                                                        seleccion_zonas();
                                                                    });
                                                                });
                                                            }
                                                        });
                                                    });
                                                });

                                            } else {
                                                app.dialog.close();
                                                app.dialog.alert("Error ws", "GFE", function () {
                                                    return false;
                                                });
                                            }

                                        });

                                    } else {
                                        app.dialog.close();
                                        app.dialog.alert("No se ha podido establecer la conexión al servidor", "GFE", function () {
                                            return false;
                                        });

                                    }


                                });


                            }

                        }








                    } else {

                        DATOS_Cambia_estado_folio(estado, rut, empresa, gde_actual.GDE_FOLIO, function (result) {

                            DATOS_cambiar_estado_gde(id_gde, estado, function (resul4) {

                                DATOS_motivo_anulacion_gde(id_gde, motivo, function (resul5) {

                                    if (tipo_volumen == 2) {
                                        DATOS_cambia_estado_gdep_pulpable(id_gde, estado, function (result2) {
                                            app.dialog.alert("Guia anulada correctamente", "GFE", function () {

                                                mainView.router.navigate('/');
                                                seleccion_zonas();
                                            });
                                        });

                                    } else {
                                        DATOS_cambia_estado_gdep_aserrable(id_gde, estado, function (result2) {
                                            app.dialog.alert("Guia anulada correctamente", "GFE", function () {

                                                mainView.router.navigate('/');
                                                seleccion_zonas();
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    }
                } else {



                    if (gde_actual.ENVIADO == 1) {


                        var bits = gde_actual.GDE_FECHA_EMISION.split(/\D/);
                        var fecha_emision_date = new Date(bits[0], --bits[1], bits[2], bits[3], bits[4]);
                        var hoy = new Date();
                        const diffTime = Math.abs(hoy - fecha_emision_date);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays >= 7) {
                            app.dialog.alert("No se puede anular, han pasado 7 o mas días desde que la guia fue emitida", "GFE", function () {
                                return false;
                            });

                        } else {
                            if (checkConnection() == "No network connection") {
                                app.dialog.alert("Conexión a Internet no detectada", "GFE", function () {
                                    return false;
                                });
                            } else {
                                app.dialog.close();
                                comprueba_conexion("0", function (result_conexion) {
                                    if (result_conexion == 1) {
                                        anular_guia_ws(gde_actual.GDE_FOLIO, motivo, function (resultado_ws) {

                                            if (resultado_ws == "ok") {
                                                DATOS_Cambia_estado_folio(estado, rut, empresa, gde_actual.GDE_FOLIO, function (result) {

                                                    DATOS_cambiar_estado_gde(id_gde, estado, function (resul4) {

                                                        DATOS_motivo_anulacion_gde(id_gde, motivo, function (resul5) {

                                                            if (tipo_volumen == 2) {
                                                                DATOS_cambia_estado_gdep_pulpable(id_gde, estado, function (result2) {
                                                                    app.dialog.close();
                                                                    app.dialog.alert("Guia anulada correctamente", "GFE", function () {

                                                                        mainView.router.navigate('/');
                                                                        seleccion_zonas();
                                                                    });
                                                                });

                                                            } else {
                                                                DATOS_cambia_estado_gdep_aserrable(id_gde, estado, function (result2) {
                                                                    app.dialog.close();
                                                                    app.dialog.alert("Guia anulada correctamente", "GFE", function () {

                                                                        mainView.router.navigate('/');
                                                                        seleccion_zonas();
                                                                    });
                                                                });
                                                            }
                                                        });
                                                    });
                                                });

                                            } else {
                                                app.dialog.close();
                                                app.dialog.alert("Error en webservice", "GFE", function () {
                                                    return false;
                                                });
                                            }

                                        });

                                    } else {
                                        app.dialog.close();
                                        app.dialog.alert("No se ha podido establecer la conexión al servidor", "GFE", function () {
                                            return false;
                                        });

                                    }


                                });


                            }

                        }





                    } else {

                        DATOS_cambiar_estado_gde(id_gde, estado, function (resul4) {

                            DATOS_motivo_anulacion_gde(id_gde, motivo, function (resul5) {

                                if (tipo_volumen == 2) {
                                    DATOS_cambia_estado_gdep_pulpable(id_gde, estado, function (result2) {
                                        app.dialog.alert("Guia anulada correctamente", "GFE", function () {

                                            mainView.router.navigate('/');
                                            seleccion_zonas();
                                        });
                                    });

                                } else {
                                    DATOS_cambia_estado_gdep_aserrable(id_gde, estado, function (result2) {
                                        app.dialog.alert("Guia anulada correctamente", "GFE", function () {

                                            mainView.router.navigate('/');
                                            seleccion_zonas();
                                        });
                                    });
                                }
                            });
                        });

                    }
                }
            });



        }

    });


}

function despertarEnvioGuiaPersistida() {
    if (!gde_actual || (gde_actual.ENVIADO != 0 && gde_actual.ENVIADO !== "0")) {
        return;
    }

    // DATOS_asigna_coordenadas invoca este flujo sólo después del COMMIT.
    // El diferimiento evita reentrancia; no se usa como confirmación de commit.
    setTimeout(function () {
        if (typeof solicitarEnvioAutomaticoDatos === "function") {
            solicitarEnvioAutomaticoDatos("guia_emitida", true);
        }
    }, 0);
}

function finalizarEmisionGuiaPersistida() {
    despertarEnvioGuiaPersistida();
    app.dialog.alert("Guia emitida correctamente. Folio corresponder al N° " + folio_asignado.NUM_FOLIO + " ", "GFE", function () {
        mainView.router.navigate('/VistaPreliminar/' + zona_activa + '/' + id_gde + '/' + tipo_volumen + '/' + tipo_emision + '/' + origen);
    });
}


function generar_guia_imprimible() {
    var rut = Obtener_dato_local("rut_activo");
    var empresa = Obtener_dato_local("empresa_activo");
    DATOS_ObtenerNumFolio(rut, empresa, function (folios) {


        if (folios == -1) {

            app.dialog.alert("No hay folios disponible para ingreso", "GFE", function () {
                return false;
                //mainView.router.navigate('/');
                //seleccion_zonas();
            });
        } else {
            getLocation();
        }

    });
}


function imprimir_guia() {
    var estado = "I";
    var rut = Obtener_dato_local("rut_activo");
    var empresa = Obtener_dato_local("empresa_activo");




    DATOS_ObtenerNumFolio(rut, empresa, function (folios) {

        if (folios == -1) {

            app.dialog.alert("No hay folios disponible para ingreso", "GFE", function () {
                //mainView.router.navigate('/');
                //seleccion_zonas();
            });


        } else {

            folio_asignado = folios[0];




            //alert("folio_asignado ES "+folio_asignado.NUM_FOLIO);

            DATOS_asigna_folio_gde(id_gde, folio_asignado.NUM_FOLIO, function (resul1) {
                //alert("SE ASIGNO EL FOLIO A LA GDE");
                DATOS_Cambia_estado_folio('O', rut, empresa, folio_asignado.NUM_FOLIO, function (resul2) {
                    //alert("SE CAMBIA EL ESTADO FOLIO A LA GDE");
                    DATOS_Descuenta_cantidad_folio(rut, empresa, folio_asignado.NUM_FOLIO, function (resul3) {
                        //alert("SE DESCUENTA LA CANTIDAD DE FOLIOS");
                        DATOS_cambiar_estado_gde(id_gde, estado, function (resul4) {
                            //alert("SE CAMBIA EL ESTADO DE GDE")
                            if (tipo_volumen == 2) {
                                DATOS_asigna_folio_gde_pulpable(id_gde, folio_asignado.NUM_FOLIO, function (result5) {
                                    //alert("ASIGNA FOLIO GDE PULPABLE")
                                    DATOS_cambia_estado_gdep_pulpable(id_gde, estado, function (result6) {
                                        //alert("CAMBIA ESTADO GDE PULPABLE")
                                        GenerarTED(id_gde, function (result8) {
                                            //alert("GENERA TED");
                                            DATOS_actualiza_datos_emisor(gde_actual, function (result9) {
                                                DATOS_actuaiza_datos_receptor(gde_actual, function (result10) {

                                                    DATOS_actualiza_datos_adicionales(gde_actual, function (result11) {
                                                        DATOS_actualiza_datos_origen(gde_actual, function (result12) {

                                                            DATOS_actualiza_datos_producto(gde_actual, function (result13) {
                                                                DATOS_actualiza_datos_totales(gde_actual, function (result14) {

                                                                    DATOS_asigna_coordenadas(gde_actual, function (result15) {
                                                                        finalizarEmisionGuiaPersistida();
                                                                    });



                                                                });



                                                            });

                                                        });



                                                    });


                                                });
                                                //alert("GENERA EL TED")

                                            });

                                        });


                                    });


                                });
                            } else {

                                DATOS_asigna_folio_gde_aserrable(id_gde, folio_asignado.NUM_FOLIO, function (result4) {
                                    //alert("ASIGNA FOLIO ASERRABLE")
                                    DATOS_cambia_estado_gdep_aserrable(id_gde, estado, function (result5) {
                                        GenerarTED(id_gde, function (result6) {
                                            DATOS_actualiza_datos_emisor(gde_actual, function (result9) {
                                                DATOS_actuaiza_datos_receptor(gde_actual, function (result10) {
                                                    DATOS_actualiza_datos_adicionales(gde_actual, function (result11) {
                                                        DATOS_actualiza_datos_origen(gde_actual, function (result12) {
                                                            DATOS_actualiza_datos_producto(gde_actual, function (result13) {
                                                                DATOS_actualiza_datos_totales(gde_actual, function (result14) {
                                                                    DATOS_asigna_coordenadas(gde_actual, function (result15) {
                                                                        finalizarEmisionGuiaPersistida();
                                                                    });



                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });

                                    });


                                });


                            }

                        });


                    });


                    //alert("actualice el foliO... AHORA ESTA OCUPADO");


                });
            });

        }


    });

}


function showPosition(position) {
    app.dialog.close();
    //alert("Latitude: " + position.coords.latitude + "Longitude: " + position.coords.longitude);
    gde_actual.GDE_COORDENADA_X = position.coords.latitude;
    gde_actual.GDE_COORDENADA_Y = position.coords.longitude;
    imprimir_guia();
    //return position;
    //guardar_datos_guia(position.coords.latitude,position.coords.longitude );
    //alert("Latitude: " + position.coords.latitude + "Longitude: " + position.coords.longitude);
}

function error_gps(err) {
    //console.warn('ERROR(' + err.code + '): ' + err.message);
    app.dialog.close();
    app.dialog.alert("Coordenadas no obtenidas. Favor revisar la configuración de GPS", "GFE");
    gde_actual.GDE_COORDENADA_X = 0;
    gde_actual.GDE_COORDENADA_Y = 0;
    //imprimir_guia();
};


function getLocation() {
    app.dialog.preloader("Obteniendo ubicación");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, error_gps, options_gps);
    }
    else {
        app.dialog.close();
        app.dialog.alert("Coordenadas no obtenidas. Favor revisar la configuración de GPS", "GFE");
        gde_actual.GDE_COORDENADA_X = 0;
        gde_actual.GDE_COORDENADA_Y = 0;
        //imprimir_guia();

        //return -1;
        //guardar_datos_guia(0,0 );
    }
}

function ir_menu_principal() {
    mainView.router.navigate('/');
    seleccion_zonas();
}


var options_gps = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: Infinity
};
