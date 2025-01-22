var options_gps = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: Infinity
};

var id_gde_actual;
var evidencia_seleccionada = 0;
var gde_actual_puntos_gde;
var bloqueo_geocerca_punto_final = 0;


$$(document).on('page:init', '.page[data-name="puntos-gde"]', async function (e, page) {



    zona_activa = mainView.router.currentRoute.params.idzona;
    id_gde = mainView.router.currentRoute.params.idgde;
    tipo_emision = mainView.router.currentRoute.params.tipoemision;
    id_gde_actual = id_gde;

    app.dialog.progress("Cargando...")
    gde_actual_puntos_gde = await seleccionarGdeProveedor(id_gde);


    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.INGRESO_PUNTOS_GDE,
        Obtener_dato_local('user_activo'),
        {
            rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
            despacho: gde_actual_puntos_gde,
            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
        }

    );

    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );

    app.dialog.close();

    obtenerDiferenciaCamionCargadoPuntoInicial();

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            // La aplicación está de nuevo en primer plano
            const ahora = new Date();
            const tiempoRestante = result_param.PAG_VALOR * 60 - Math.floor((ahora - horaPuntoInicio) / 1000);

            // Actualiza el texto del botón inmediatamente
            if (tiempoRestante <= 0) {
                $("#btn_punto_final").text("OBTENER PUNTO FINAL").removeClass("disabled").removeAttr("disabled");
            }
        }
    });


    $$("#tx_latitud_inicial").val(gde_actual_puntos_gde.GDE_COORDENADA_INICIAL_X);
    $$("#tx_longitud_inicial").val(gde_actual_puntos_gde.GDE_COORDENADA_INICIAL_Y);
    $$("#tx_latitud_final").val(gde_actual_puntos_gde.GDE_COORDENADA_FINAL_X);
    $$("#tx_longitud_final").val(gde_actual_puntos_gde.GDE_COORDENADA_FINAL_Y);



    if (gde_actual_puntos_gde.GDE_HORA_PUNTO_INICIO == undefined || gde_actual_puntos_gde.GDE_HORA_PUNTO_INICIO == null || gde_actual_puntos_gde.GDE_HORA_PUNTO_INICIO == "") {
        $$("#btn_punto_final").css('display', 'none');
        $$("#btn_punto_final").css('display', 'none');
        $$("#btn_camion_cargado").css('display', 'none');

    } else {
        $$("#btn_punto_inicial").css('display', 'none');
        $$("#btn_punto_final").css('display', 'block');
    }

    if (gde_actual_puntos_gde.GDE_HORA_PUNTO_FINAL == undefined || gde_actual_puntos_gde.GDE_HORA_PUNTO_FINAL == null || gde_actual_puntos_gde.GDE_HORA_PUNTO_FINAL == "") {
        $$("#btn_camion_cargado").css('display', 'none');
    } else {
        $$("#btn_punto_final").css('display', 'none');
    }



    $$("#btn_camion_cargado").click(async function () {


        const estadoGPS = await verificarEstadoGPS();
        if (!estadoGPS) {
            app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
        } else {
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



                                var diff = Math.abs(new Date() - new Date(gde_result.GDE_HORA_PUNTO_INICIO));
                                var minutes = Math.floor((diff / 1000) / 60);
                                var tiempo = result_param.PAG_VALOR;



                                if (minutes >= tiempo) {

                                    if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.avanzaHaciaCamionCargado) {
                                        app.dialog.preloader("Guardando...");
                                        validarGeocerca(gde_actual_puntos_gde.GDE_COD_ORIGEN).then((resultadoGeocerca) => {

                                            let resultadoValidacion = resultadoGeocerca.validacion;
                                            validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.final).then((resultado) => {
                                                //si debe cerrar control
                                                if (resultado.cierra) {
                                                    ControlServiceAnular(id_gde_actual, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "F").then((anula) => {
                                                        (async () => {
                                                            let datos = await generarDataTrazabilidad(
                                                                TipoAccionTypes.GEOCERCA_INVALIDA,
                                                                Obtener_dato_local('user_activo'),
                                                                {
                                                                    rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                                                    despacho: gde_actual_puntos_gde,
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
                                                    });
                                                }
                                                else {
                                                    if (resultado.advertencia) {
                                                        (async () => {
                                                            let datos = await generarDataTrazabilidad(
                                                                TipoAccionTypes.GEOCERCA_ADVERTENCIA,
                                                                Obtener_dato_local('user_activo'),
                                                                {
                                                                    rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                                                    despacho: gde_actual_puntos_gde,
                                                                    id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                                                }

                                                            );

                                                            await obtenerUbicacionEInsertarLog(
                                                                Obtener_dato_local('user_activo'),
                                                                datos
                                                            );
                                                            app.dialog.close();

                                                            app.dialog.alert(resultado.mensaje, "GFE", function () {
                                                                mainView.router.navigate('/CamionCargado/' + 0 + '/' + id_gde_actual + '/' + 0);
                                                            });

                                                        })();
                                                    } else {
                                                        app.dialog.close();
                                                        mainView.router.navigate('/CamionCargado/' + 0 + '/' + id_gde_actual + '/' + 0);
                                                    }
                                                }

                                            });


                                        }).catch((e) => {
                                            app.dialog.close();
                                            app.dialog.alert(e, "GFE");
                                            reject(e);
                                        });

                                    } else {
                                        mainView.router.navigate('/CamionCargado/' + 0 + '/' + id_gde_actual + '/' + 0);
                                    }
                                } else {
                                    app.dialog.alert("Actualmente lleva " + minutes + " minutos desde que obtuvo el punto inicial. \nPara obtener el punto final, debe esperar " + tiempo + " minutos...", "GFE");
                                    return false;
                                }

                            });
                        }

                    }

                }


            });

        }



    });



});



function obtenerDiferenciaCamionCargadoPuntoInicial() {




    DATOS_seleccionar_puntosGDE(id_gde_actual, function (gde_result) {
        if (gde_result.GDE_HORA_PUNTO_INICIO == null || gde_result.GDE_HORA_PUNTO_INICIO == undefined || gde_result.GDE_HORA_PUNTO_INICIO == "") {
            app.dialog.alert("Primero debe obtener el punto inicial", "GFE");
            return false;

        } else {

            DATOS_seleccionar_Parametro_general(1, 10, async function (result_param) {
                const btnPuntoFinal = $$("#btn_punto_final");
                const horaPuntoInicio = new Date(gde_result.GDE_HORA_PUNTO_INICIO);
                // Actualizar la pantalla cada segundo
                let intervalo = setInterval(() => {
                    // Obtén la hora actual
                    const ahora = new Date();

                    // Calcula el tiempo restante dinámicamente
                    const tiempoRestante = result_param.PAG_VALOR * 60 - Math.floor((ahora - horaPuntoInicio) / 1000);

                    const btnPuntoFinal = $("#btn_punto_final"); // Usando jQuery para manejar el botón

                    if (tiempoRestante <= 0) {
                        // El tiempo ha llegado a 0, habilitar el botón
                        btnPuntoFinal.text("OBTENER PUNTO FINAL"); // Actualiza el texto del botón
                        btnPuntoFinal.removeClass("disabled");
                        btnPuntoFinal.removeAttr("disabled");

                        // Detén el intervalo
                        clearInterval(intervalo);
                    } else {
                        // Convierte tiempo restante a minutos y segundos
                        const minutos = Math.floor(tiempoRestante / 60);
                        const segundos = tiempoRestante % 60;

                        // Actualiza el texto del botón con el tiempo restante
                        btnPuntoFinal.text(`Debe esperar ${minutos}:${segundos < 10 ? "0" : ""}${segundos} para obtener el punto final`);
                    }
                }, 1000);



            });

        }



    });


}





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



async function obtener_punto_final() {

    const estadoGPS = await verificarEstadoGPS();
    if (!estadoGPS) {
        app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
    } else {
        DATOS_seleccionar_puntosGDE(id_gde_actual, function (gde_result) {
            if (gde_result.GDE_HORA_PUNTO_INICIO == null || gde_result.GDE_HORA_PUNTO_INICIO == undefined || gde_result.GDE_HORA_PUNTO_INICIO == "") {
                app.dialog.alert("Primero debe obtener el punto inicial", "GFE");
                return false;

            } else {

                DATOS_seleccionar_Parametro_general(1, 10, async function (result_param) {
             

                    const diff = Math.abs(new Date() - new Date(gde_result.GDE_HORA_PUNTO_INICIO));
                    const minutes = Math.floor((diff / 1000) / 60);
                    const tiempo = result_param.PAG_VALOR;

                    if (minutes >= tiempo) {
                        getLocation(2, 1, gde_actual_puntos_gde.GDE_COD_PROYECTO);
                    } else {
                        app.dialog.progress("Cargando...")
                        const mensaje = `Actualmente lleva ${minutes} minutos desde que obtuvo el punto inicial. 
                        Para obtener el punto final, debe esperar ${tiempo} minutos...`;

                        let datos = await generarDataTrazabilidad(
                            TipoAccionTypes.ALERTA_ESPERA_PUNTO_FINAL,
                            Obtener_dato_local('user_activo'),
                            {
                                rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                despacho: gde_actual_puntos_gde,
                                id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                                mensajeMostrado: mensaje
                            }

                        );

                        await obtenerUbicacionEInsertarLog(
                            Obtener_dato_local('user_activo'),
                            datos
                        );
                        app.dialog.close();
                        app.dialog.alert(mensaje, "GFE");

                    }


                });

            }



        });
    }







}



async function getLocation(argumento, valida_geocerca = 0, proyecto = 0) {


    app.dialog.preloader("Obteniendo punto...")

    //trazabilidad
    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.INGRESA_PUNTO_FINAL,
        Obtener_dato_local('user_activo'),
        {
            rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
            despacho: gde_actual_puntos_gde,
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
        if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.puntoFinal) {
            validarGeocerca(gde_actual_puntos_gde.GDE_COD_ORIGEN).then((resultadoGeocerca) => {
                let resultadoValidacion = resultadoGeocerca.validacion;
                validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.final).then((resultado) => {
                    //si debe cerrar control
                    if (resultado.cierra) {
                        ControlServiceAnular(id_gde_actual, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "F", constantes.mensajeGeocercaNoValida).then((anula) => {
                            if (anula) {
                                (async () => {
                                    let datos = await generarDataTrazabilidad(
                                        TipoAccionTypes.GEOCERCA_INVALIDA,
                                        Obtener_dato_local('user_activo'),
                                        {
                                            rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                            despacho: gde_actual_puntos_gde,
                                            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                        }

                                    );

                                    await obtenerUbicacionEInsertarLog(
                                        Obtener_dato_local('user_activo'),
                                        datos,
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
                                        rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                        despacho: gde_actual_puntos_gde,
                                        id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                    }

                                );
                                await obtenerUbicacionEInsertarLog(
                                    Obtener_dato_local('user_activo'),
                                    datos,
                                );
                                app.dialog.close();
                                app.dialog.alert(resultado.mensaje, "GFE", function () {
                                    guardar_punto_ubicacion(datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON, argumento, valida_geocerca, proyecto);
                                });

                            })();

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
        let datos = await generarDataTrazabilidad(
            TipoAccionTypes.UBICACION_DESACTIVADA,
            Obtener_dato_local('user_activo'),
            {
                rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                despacho: gde_actual_puntos_gde,
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