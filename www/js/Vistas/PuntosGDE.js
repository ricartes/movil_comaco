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



    DATOS_seleccionar_gde_proveedor(id_gde, function (gde_result) {
        gde_actual_puntos_gde = gde_result;
    

        $$("#tx_latitud_inicial").val(gde_result.GDE_COORDENADA_INICIAL_X);
        $$("#tx_longitud_inicial").val(gde_result.GDE_COORDENADA_INICIAL_Y);
        $$("#tx_latitud_final").val(gde_result.GDE_COORDENADA_FINAL_X);
        $$("#tx_longitud_final").val(gde_result.GDE_COORDENADA_FINAL_Y);



        if (gde_result.GDE_HORA_PUNTO_INICIO == undefined || gde_result.GDE_HORA_PUNTO_INICIO == null || gde_result.GDE_HORA_PUNTO_INICIO == "") {
            $$("#btn_punto_final").css('display', 'none');
            $$("#btn_punto_final").css('display', 'none');
            $$("#btn_camion_cargado").css('display', 'none');

        } else {
            $$("#btn_punto_inicial").css('display', 'none');
            $$("#btn_punto_final").css('display', 'block');
        }

        if (gde_result.GDE_HORA_PUNTO_FINAL == undefined || gde_result.GDE_HORA_PUNTO_FINAL == null || gde_result.GDE_HORA_PUNTO_FINAL == "") {
            $$("#btn_camion_cargado").css('display', 'none');
        } else {
            $$("#btn_punto_final").css('display', 'none');
        }

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
    }

    if (argumento == 2) {
        DATOS_Actualiza_PuntoFinal(id_gde_actual, latitud, longitud, function (result) {
            $$("#tx_latitud_final").val(latitud);
            $$("#tx_longitud_final").val(longitud);
            $$("#btn_camion_cargado").css('display', 'block');
        });
    }
}



/**
 * 
 * @param {*} geocerca 
 */
function alerta_geocerca_punto_final(geocerca) {
    if (geocerca.flag == 1) {
        ///al haber bloqueo por geocerca, se oculta el boton, hasta que tome un punto que corresponda
        $$("#btn_camion_cargado").css('display', 'none');
        bloqueo_geocerca_punto_final = 1;
    } else {
        $$("#btn_camion_cargado").css('display', 'block');
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
                    getLocation(2, 1, gde_actual_puntos_gde.GDE_COD_ORIGEN);
                } else {
                    app.dialog.alert("Actualmente lleva " + minutes + " minutos desde que obtuvo el punto inicial. \nPara obtener el punto final, debe esperar " + tiempo + " minutos...", "GFE");

                }


            });

        }



    });





}



async function getLocation(argumento, valida_geocerca = 0, proyecto = 0) {


    app.dialog.preloader("Obteniendo punto...")

    //obtiene puntos
    const datosUbicacion = await getLocation2();

    if (datosUbicacion.status) {
        if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.puntoFinal) {
            validarGeocerca(proyecto).then((resultadoGeocerca) => {
                let resultadoValidacion = resultadoGeocerca.validacion;
                validarCierreControl(resultadoValidacion, id_gde_actual, 2).then((resultado) => {
                    //si debe cerrar control
                    if (resultado.cierra) {
                        ControlServiceAnular(id_gde_actual, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "F").then((anula) => {
                            if (anula) {
                                app.dialog.close();
                                app.dialog.alert(resultado.mensaje, "GFE", function () {
                                    mainView.router.navigate("/");
                                });
                            }
                        });
                    }
                    else {

                        if (resultado.advertencia) {
                            app.dialog.close();
                            app.dialog.alert(resultado.mensaje, "GFE", function () {
                                guardar_punto_ubicacion(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON, argumento, valida_geocerca, proyecto);
                            });

                        } else {
                            app.dialog.close();
                            guardar_punto_ubicacion(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON, argumento, valida_geocerca, proyecto);
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
            guardar_punto_ubicacion(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON, argumento, valida_geocerca, proyecto);
        }

    } else {
        app.dialog.close();
        app.dialog.alert("Servicios de ubicación se encuentran desactivados. Favor activar para continuar", "GFE");
        return false;
    }

}