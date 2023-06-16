var options_gps = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: Infinity
};

var id_gde_actual;
var evidencia_seleccionada = 0;
var gde_actual_puntos_gde;
var bloqueo_geocerca_punto_final = 0;


$$(document).on('page:init', '.page[data-name="puntos-gde"]', function (e, page) {



    zona_activa = mainView.router.currentRoute.params.idzona;
    id_gde = mainView.router.currentRoute.params.idgde;
    tipo_emision = mainView.router.currentRoute.params.tipoemision;
    id_gde_actual = id_gde;



    DATOS_seleccionar_puntosGDE(id_gde_actual, function (gde_result) {





        $$("#tx_latitud_inicial").val(gde_result.GDE_COORDENADA_INICIAL_X);
        $$("#tx_longitud_inicial").val(gde_result.GDE_COORDENADA_INICIAL_Y);
        $$("#tx_latitud_final").val(gde_result.GDE_COORDENADA_FINAL_X);
        $$("#tx_longitud_final").val(gde_result.GDE_COORDENADA_FINAL_Y);



        if (gde_result.GDE_HORA_PUNTO_INICIO == null || gde_result.GDE_HORA_PUNTO_INICIO == undefined || gde_result.GDE_HORA_PUNTO_INICIO == "") {
            $$("#btn_punto_final").css('display', 'none');
            $$("#btn_punto_final").css('display', 'none');
            $$("#btn_camion_cargado").css('display', 'none');

        } else {
            $$("#btn_punto_inicial").css('display', 'none');
            $$("#btn_punto_final").css('display', 'block');
        }

        if (gde_result.GDE_HORA_PUNTO_FINAL == null || gde_result.GDE_HORA_PUNTO_FINAL == undefined || gde_result.GDE_HORA_PUNTO_FINAL == "") {

            $$("#btn_camion_cargado").css('display', 'none');

        } else {
            $$("#btn_punto_final").css('display', 'none');
        }


        DATOS_seleccionar_gde_proveedor(id_gde, function (result_gde) {
            gde_actual_puntos_gde = result_gde;
        });


    });




    $$("#btn_camion_cargado").click(function () {

        DATOS_seleccionar_puntosGDE(id_gde_actual, function (gde_result) {

            if (gde_result.GDE_HORA_PUNTO_INICIO == null || gde_result.GDE_HORA_PUNTO_INICIO == undefined || gde_result.GDE_HORA_PUNTO_INICIO == "") {
                app.dialog.alert("Primero debe obtener el punto inicial", "GFE");
                return false;
            } else {
                if (gde_result.GDE_HORA_PUNTO_FINAL == null || gde_result.GDE_HORA_PUNTO_FINAL == undefined || gde_result.GDE_HORA_PUNTO_FINAL == "") {
                    app.dialog.alert("Primero debe obtener el punto final", "GFE");
                    return false;
                } else {

                    if (bloqueo_geocerca_punto_final == 1) {
                        alerta(18);
                        return false;
                    } else {
                        DATOS_seleccionar_Parametro_general(1, 10, function (result_param) {

                            var fecha_hora_inicial = new Date(gde_result.GDE_HORA_PUNTO_INICIO);
                            var fecha_hora_actual = new Date();

                            var diff = Math.abs(new Date() - new Date(gde_result.GDE_HORA_PUNTO_INICIO));
                            var minutes = Math.floor((diff / 1000) / 60);
                            var tiempo = result_param.PAG_VALOR;



                            if (minutes >= tiempo) {

                                mainView.router.navigate('/CamionCargado/' + 0 + '/' + id_gde_actual + '/' + 0);
                            } else {
                                app.dialog.alert("Actualmente lleva " + minutes + " minutos desde que obtuvo el punto inicial. \nPara obtener el punto final, debe esperar " + tiempo + " minutos...", "GFE");
                                return false;
                            }

                        });
                    }







                }

            }


        });

    });



});




function volver_camion_vacio() {

    mainView.router.navigate('/CamionVacio/' + 0 + '/' + id_gde_actual + '/' + 0);

}



function guardar_punto_ubicacion(latitud, longitud, argumento, valida_geocerca = 0, proyecto = 0) {

    //punto inicial
    if (argumento == 1) {
        asignar_puntos_inicio(latitud, longitud);

        if (valida_geocerca == 1) {
            DATOS_Obtener_Geocerca(proyecto, 1, function (geocerca) {
                var dentro_geocerca = compruebaGeocerca(geocerca, latitud, longitud);
                if (dentro_geocerca == false) {
                    DATOS_GuardaAlertaGeocerca(id_gde_actual, 1, 1, function (resGuardado) {
                        alerta_geocerca_punto_inicial(geocerca);
                    });
                } else {
                    DATOS_GuardaAlertaGeocerca(id_gde_actual, 1, 0, function (resGuardado) {
                    });
                }

            });
        }
    }

    if (argumento == 2) {
        DATOS_Actualiza_PuntoFinal(id_gde_actual, latitud, longitud, function (result) {
            $$("#tx_latitud_final").val(latitud);
            $$("#tx_longitud_final").val(longitud);
            $$("#btn_camion_cargado").css('display', 'block');

            if (valida_geocerca == 1) {
                DATOS_Obtener_Geocerca(proyecto, 1, function (geocerca) {
                    var dentro_geocerca = compruebaGeocerca(geocerca, latitud, longitud);
                    if (dentro_geocerca == false) {
                        DATOS_GuardaAlertaGeocerca(id_gde_actual, 2, 1, function (resGuardado) {
                            alerta_geocerca_punto_final(geocerca);
                        });
                    } else {
                        DATOS_GuardaAlertaGeocerca(id_gde_actual, 2, 0, function (resGuardado) {
                        });
                    }
                });
            }


        });
    }
}




function alerta_geocerca_punto_final(geocerca) {
    if (geocerca.flag == 1) {
        bloqueo_geocerca_punto_final = 1;
    } else {
        bloqueo_geocerca_punto_final = 0;
    }
    alerta(17);
}



function obtener_punto_final() {

    DATOS_seleccionar_puntosGDE(id_gde_actual, function (gde_result) {
        if (gde_result.GDE_HORA_PUNTO_INICIO == null || gde_result.GDE_HORA_PUNTO_INICIO == undefined || gde_result.GDE_HORA_PUNTO_INICIO == "") {
            app.dialog.alert("Primero debe obtener el punto inicial", "GFE");
            return false;


        } else {


            DATOS_seleccionar_Parametro_general(1, 10, function (result_param) {

                var fecha_hora_inicial = new Date(gde_result.GDE_HORA_PUNTO_INICIO);
                var fecha_hora_actual = new Date();

                var diff = Math.abs(new Date() - new Date(gde_result.GDE_HORA_PUNTO_INICIO));
                var minutes = Math.floor((diff / 1000) / 60);
                var tiempo = result_param.PAG_VALOR;

                if (minutes >= tiempo) {
                    getLocation(2, 1, gde_actual_puntos_gde.GDE_COD_PROYECTO);
                } else {
                    app.dialog.alert("Actualmente lleva " + minutes + " minutos desde que obtuvo el punto inicial. \nPara obtener el punto final, debe esperar " + tiempo + " minutos...", "GFE");

                }


            });

        }



    });





}



function getLocation(argumento, valida_geocerca = 0, proyecto = 0) {
    bloqueo_geocerca_punto_final = 0;
    app.dialog.preloader("Obteniendo ubicación");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {

            app.dialog.close();

            if (argumento == 1 || argumento == 2) {
                guardar_punto_ubicacion(position.coords.latitude, position.coords.longitude, argumento, valida_geocerca, proyecto);
            }
            if (argumento == 3) {
                emitir_guia(position.coords.latitude, position.coords.longitude);
            }

        }, function (err) {
            app.dialog.close();
            app.dialog.alert("Coordenadas no obtenidas. Favor revisar la configuración de GPS", "GFE");
            if (argumento == 3) {
                emitir_guia(0, 0);
            }
            else {
                if (argumento == 2) {
                    bloqueo_geocerca_punto_final = 1;
                }
            }


        }, options_gps);
    }
    else {
        app.dialog.close();
        app.dialog.alert("Coordenadas no obtenidas. Favor revisar la configuración de GPS", "GFE");
        if (argumento == 3) {
            emitir_guia(0, 0);
        } else {
            if (argumento == 2) {
                bloqueo_geocerca_punto_final = 1;
            }
        }


    }
}