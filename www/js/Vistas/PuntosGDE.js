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
            destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
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

            DATOS_seleccionar_puntosGDE(id_gde_actual, function (gde_result) {
                DATOS_seleccionar_Parametro_general(1, 10, async function (result_param) {
                    // La aplicación está de nuevo en primer plano
                    const ahora = new Date();
                    const tiempo = result_param.PAG_VALOR ?? 2;
                    const horaPuntoInicio = new Date(gde_result.GDE_HORA_PUNTO_INICIO);
                    const tiempoRestante = tiempo * 60 - Math.floor((ahora - horaPuntoInicio) / 1000);

                    // Actualiza el texto del botón inmediatamente
                    if (tiempoRestante <= 0) {
                        $("#btn_punto_final").text("CAPTURAR PUNTO CARGA MADERA").removeClass("disabled").removeAttr("disabled");
                    }

                });
            });


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
                        app.dialog.alert("Primero debe capturar el punto carga madera", "GFE");
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
                                            validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.final).then(async (resultado) => {

                                                let intentos = 0;
                                                let resultadoUbicacionSimulada = await detectarUbicacionSimulada();


                                                do {

                                                    if (resultadoUbicacionSimulada.esUbicacionSimulada) {
                                                        if (intentos === 0) {
                                                            // Solo registramos trazabilidad en el primer intento
                                                            let datos = await generarDataTrazabilidad(
                                                                TipoAccionTypes.UTILIZA_UBICACION_SIMULADA,
                                                                Obtener_dato_local('user_activo'),
                                                                {
                                                                    rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                                                    destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
                                                                    despacho: gde_actual_puntos_gde,
                                                                    id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                                                                    resultadoUbicacionSimulada: resultadoUbicacionSimulada
                                                                }
                                                            );

                                                            await obtenerUbicacionEInsertarLog(
                                                                Obtener_dato_local('user_activo'),
                                                                datos
                                                            );
                                                        }

                                                        // Cerramos cualquier diálogo previo para evitar errores
                                                        try {
                                                            app.dialog.close();
                                                        } catch (e) {
                                                            console.warn("No había diálogos abiertos.");
                                                        }

                                                        // Mostramos el cuadro de diálogo y esperamos hasta que el usuario presione "Confirmar"
                                                        await new Promise((resolve) => {
                                                            app.dialog.alert(
                                                                'Se detectó ubicación adulterada... Debe utilizar la ubicación real para poder continuar.',
                                                                "GFE Proveedores",
                                                                async function () {
                                                                    app.dialog.progress("Cargando..."); // Mostrar progreso mientras se verifica la nueva ubicación
                                                                    setTimeout(async () => {
                                                                        resultadoUbicacionSimulada = await detectarUbicacionSimulada();
                                                                        //app.dialog.close(); // Cerramos el progreso después de validar
                                                                        resolve(); // Salimos del Promise y el ciclo continúa si sigue siendo Fake GPS
                                                                    }, 1500); // Pequeña espera para evitar consultas instantáneas
                                                                }
                                                            );
                                                        });

                                                        intentos++; // Contamos los intentos
                                                    }

                                                } while (resultadoUbicacionSimulada.esUbicacionSimulada); // Solo salimos cuando la ubicación es real

                                                // 🔹 Aquí el flujo principal continúa una vez que la ubicación es válida

                                                //si debe cerrar control
                                                if (resultado.cierra) {
                                                    ControlServiceAnular(id_gde_actual, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "", `${constantes.mensajeGeocercaNoValida} (ACCIÓN IR A CAMIÓN CARGADO)`).then((anula) => {
                                                        (async () => {
                                                            let datos = await generarDataTrazabilidad(
                                                                TipoAccionTypes.GEOCERCA_INVALIDA,
                                                                Obtener_dato_local('user_activo'),
                                                                {
                                                                    rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                                                    destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
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
                                                                    destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
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
                                    app.dialog.alert("Actualmente lleva " + minutes + " minutos desde que obtuvo el punto inicial. \nPara capturar el punto carga madera, debe esperar " + tiempo + " minutos...", "GFE");
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
                    const minutosEspera = result_param.PAG_VALOR ?? 2;
                    const tiempoRestante = minutosEspera * 60 - Math.floor((ahora - horaPuntoInicio) / 1000);

                    const btnPuntoFinal = $("#btn_punto_final"); // Usando jQuery para manejar el botón

                    if (tiempoRestante <= 0) {
                        // El tiempo ha llegado a 0, habilitar el botón
                        btnPuntoFinal.text("CAPTURAR PUNTO CARGA MADERA"); // Actualiza el texto del botón
                        btnPuntoFinal.removeClass("disabled");
                        btnPuntoFinal.removeAttr("disabled");

                        // Detén el intervalo
                        clearInterval(intervalo);
                    } else {
                        // Convierte tiempo restante a minutos y segundos
                        const minutos = Math.floor(tiempoRestante / 60);
                        const segundos = tiempoRestante % 60;

                        // Actualiza el texto del botón con el tiempo restante
                        btnPuntoFinal.text(`Debe esperar ${minutos}:${segundos < 10 ? "0" : ""}${segundos} para capturar el punto carga madera`);
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

    // punto inicial
    if (argumento == 1) {
        asignar_puntos_inicio(latitud, longitud);
    }

    // punto carga madera, antes punto final
    if (argumento == 2) {
        DATOS_Actualiza_PuntoFinal(id_gde_actual, latitud, longitud, function (result) {
            $$("#tx_latitud_final").val(latitud);
            $$("#tx_longitud_final").val(longitud);

            (async function () {
                try {
                    const resultadoQr = await generarQrTrazabilidadPorPuntoCarga(
                        gde_actual_puntos_gde,
                        {
                            latitud: latitud,
                            longitud: longitud,
                            accuracy: null
                        }
                    );

                    if (resultadoQr && resultadoQr.ok) {
                        let datos = await generarDataTrazabilidad(
                            TipoAccionTypes.INGRESA_PUNTO_FINAL,
                            Obtener_dato_local('user_activo'),
                            {
                                rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
                                despacho: gde_actual_puntos_gde,
                                id_unico_movil_gde: gde_actual_puntos_gde?.ID_UNICO_MOVIL ?? null,
                                qr: {
                                    qrId: resultadoQr.qr?.QR_ID ?? null,
                                    estado: resultadoQr.qr?.ESTADO ?? null,
                                    yaExistia: resultadoQr.yaExistia === true
                                },
                                coordenadaCarga: {
                                    latitud: latitud,
                                    longitud: longitud
                                }
                            }
                        );

                        await obtenerUbicacionEInsertarLog(
                            Obtener_dato_local('user_activo'),
                            datos
                        );

                        if (resultadoQr.yaExistia) {
                            app.dialog.alert(
                                "Punto carga madera registrado. Esta guía ya tenía QR de trazabilidad generado.",
                                "GFE"
                            );
                        } else {
                            app.dialog.alert(
                                "Punto carga madera registrado y QR de trazabilidad generado correctamente.",
                                "GFE"
                            );
                        }
                    } else {
                        app.dialog.alert(
                            (resultadoQr && resultadoQr.mensaje)
                                ? "Punto carga madera registrado, pero no fue posible generar el QR de trazabilidad: " + resultadoQr.mensaje
                                : "Punto carga madera registrado, pero no fue posible generar el QR de trazabilidad.",
                            "GFE"
                        );
                    }

                } catch (ex) {
                    console.error("[QR TRAZABILIDAD] Error generando QR desde punto carga:", ex);

                    app.dialog.alert(
                        "El punto carga madera fue registrado, pero no fue posible generar el QR de trazabilidad. Revise el módulo QR Trazabilidad.",
                        "GFE"
                    );
                } finally {
                    $$("#btn_camion_cargado").css('display', 'block');
                }
            })();
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
                    const tiempo = result_param.PAG_VALOR ?? 2;

                    if (minutes >= tiempo) {
                        getLocation(2, 1, gde_actual_puntos_gde.GDE_COD_PROYECTO);
                    } else {
                        app.dialog.progress("Cargando...")
                        const mensaje = `Actualmente lleva ${minutes} minutos desde que obtuvo el punto inicial. 
                        Para capturar el punto carga madera, debe esperar ${tiempo} minutos...`;

                        let datos = await generarDataTrazabilidad(
                            TipoAccionTypes.ALERTA_ESPERA_PUNTO_FINAL,
                            Obtener_dato_local('user_activo'),
                            {
                                rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
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
            destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
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
                validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.final).then(async (resultado) => {


                    let intentos = 0;
                    let resultadoUbicacionSimulada = await detectarUbicacionSimulada();


                    do {

                        if (resultadoUbicacionSimulada.esUbicacionSimulada) {
                            if (intentos === 0) {
                                // Solo registramos trazabilidad en el primer intento
                                let datos = await generarDataTrazabilidad(
                                    TipoAccionTypes.UTILIZA_UBICACION_SIMULADA,
                                    Obtener_dato_local('user_activo'),
                                    {
                                        rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                        destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
                                        despacho: gde_actual_puntos_gde,
                                        id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                                        resultadoUbicacionSimulada: resultadoUbicacionSimulada
                                    }
                                );

                                await obtenerUbicacionEInsertarLog(
                                    Obtener_dato_local('user_activo'),
                                    datos
                                );
                            }

                            // Cerramos cualquier diálogo previo para evitar errores
                            try {
                                app.dialog.close();
                            } catch (e) {
                                console.warn("No había diálogos abiertos.");
                            }

                            // Mostramos el cuadro de diálogo y esperamos hasta que el usuario presione "Confirmar"
                            await new Promise((resolve) => {
                                app.dialog.alert(
                                    'Se detectó ubicación adulterada... Debe utilizar la ubicación real para poder continuar.',
                                    "GFE Proveedores",
                                    async function () {
                                        app.dialog.progress("Cargando..."); // Mostrar progreso mientras se verifica la nueva ubicación
                                        setTimeout(async () => {
                                            resultadoUbicacionSimulada = await detectarUbicacionSimulada();
                                            //app.dialog.close(); // Cerramos el progreso después de validar
                                            resolve(); // Salimos del Promise y el ciclo continúa si sigue siendo Fake GPS
                                        }, 1500); // Pequeña espera para evitar consultas instantáneas
                                    }
                                );
                            });

                            intentos++; // Contamos los intentos
                        }

                    } while (resultadoUbicacionSimulada.esUbicacionSimulada); // Solo salimos cuando la ubicación es real

                    // 🔹 Aquí el flujo principal continúa una vez que la ubicación es válida

                    //si debe cerrar control
                    if (resultado.cierra) {
                        ControlServiceAnular(id_gde_actual, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "", `${constantes.mensajeGeocercaNoValida} (CAPTURAR PUNTO CARGA MADERA)`).then((anula) => {
                            if (anula) {
                                (async () => {
                                    let datos = await generarDataTrazabilidad(
                                        TipoAccionTypes.GEOCERCA_INVALIDA,
                                        Obtener_dato_local('user_activo'),
                                        {
                                            rol: gde_actual_puntos_gde?.GDE_COD_ORIGEN ?? null,
                                            destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
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
                                        destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
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
                destino: gde_actual_puntos_gde?.GDE_COD_DESTINO ?? null,
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
