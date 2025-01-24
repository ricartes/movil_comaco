var id_gde_actual;
var gde_actual = null;
let intentosCamionCargado1;
let intentosCamionCargado2;
let intentosMaximosCamionCargado = constantes.cantidadMaximaIntentosCaptura;
let encuentraFotoFueraGeocercaCamionCargado;
let permiteIngresoFotografiasCamionCargado;
$$(document).on('page:init', '.page[data-name="camion-cargado"]', async function (e, page) {
    id_gde_actual = mainView.router.currentRoute.params.idgde;
    gde_actual = null;
    encuentraFotoFueraGeocercaCamionCargado = false;
    permiteIngresoFotografiasCamionCargado = true;
    intentosCamionCargado1 = 0;
    intentosCamionCargado2 = 0;
    app.dialog.progress("Cargando...")
    const gde = await seleccionarGdeProveedor(id_gde_actual);
    gde_actual = gde;


    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.INGRESO_CAMION_CARGADO,
        Obtener_dato_local('user_activo'),
        {
            rol: gde_actual?.GDE_COD_ORIGEN ?? null,
            despacho: gde_actual,
            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
        }

    );

    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );

    const parametro = await Datos_seleccionarParametroGeneralAsync(constantes.empresaPredeterminada, constantes.parametroIntentosMaximoCamionPadron);
    intentosMaximosCamionCargado = parametro && !isNaN(parseInt(parametro.PAG_VALOR)) ? parseInt(parametro.PAG_VALOR) : constantes.cantidadMaximaIntentosCaptura;
    app.dialog.close();
    DATOS_seleccionar_evidencia_guia(id_gde_actual, constantes.tipoEvidencia.camionCargado1, function (datos_evidencia) {

        if (datos_evidencia != "-1") {
            intentosCamionCargado1 = datos_evidencia[0].CANTIDAD_INTENTOS;
            const resss = manejarIntentosCapturaEvidencias(intentosCamionCargado1, intentosMaximosCamionCargado);
            intentosCamionCargado1 = resss.intentosActualizados;
            permiteIngresoFotografiasCamionCargado = !resss.debeAnular ? true : false;
            $$("#imagen_camion_cargado").attr("src", datos_evidencia[0].ARCHIVO);
        }
        DATOS_seleccionar_evidencia_guia(id_gde_actual, constantes.tipoEvidencia.camionCargado2, function (datos_evidencia_2) {

            if (datos_evidencia_2 != "-1") {

                intentosCamionCargado2 = datos_evidencia_2[0].CANTIDAD_INTENTOS;
                const resss = manejarIntentosCapturaEvidencias(intentosCamionCargado2, intentosMaximosCamionCargado);
                intentosCamionCargado2 = resss.intentosActualizados;

                permiteIngresoFotografiasCamionCargado = !resss.debeAnular ? true : false;
                $$("#imagen_camion_cargado_2").attr("src", datos_evidencia_2[0].ARCHIVO);
            }

        });

    });



    $$("#btn_padron_guia").click(async function () {


        if (encuentraFotoFueraGeocercaCamionCargado) {
            app.dialog.alert("Existen fotografías que se encuentran fuera de la geocerca. Favor corregir y e intentar nuevamente.");
            return false;
        } else {
            const estadoGPS = await verificarEstadoGPS();
            if (!estadoGPS) {
                app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
            } else {
                DATOS_seleccionar_evidencia_guia(id_gde_actual, constantes.tipoEvidencia.camionCargado1, function (datos_evidencia) {
                    DATOS_seleccionar_evidencia_guia(id_gde_actual, constantes.tipoEvidencia.camionCargado2, function (datos_evidencia_2) {
                        if (datos_evidencia != "-1" && datos_evidencia_2 != "-1") {
                            if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.avanzaHaciaPadron) {

                                app.dialog.preloader("Guardando...")
                                validarGeocerca(gde_actual.GDE_COD_ORIGEN).then((resultadoGeocerca) => {

                                    let resultadoValidacion = resultadoGeocerca.validacion;
                                    validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.final).then((resultado) => {
                                        //si debe cerrar control
                                        if (resultado.cierra) {
                                            ControlServiceAnular(id_gde_actual, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "", `${constantes.mensajeGeocercaNoValida} (ACCIÓN IR PADRÓN GUÍA)`).then((anula) => {
                                                (async () => {
                                                    let datos = await generarDataTrazabilidad(
                                                        TipoAccionTypes.GEOCERCA_INVALIDA,
                                                        Obtener_dato_local('user_activo'),
                                                        {
                                                            rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                                                            despacho: gde_actual,
                                                            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
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
                                                            rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                                                            despacho: gde_actual,
                                                            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                                                        }
                                                    );

                                                    await obtenerUbicacionEInsertarLog(
                                                        Obtener_dato_local('user_activo'),
                                                        datos
                                                    );
                                                    app.dialog.close();
                                                    app.dialog.alert(resultado.mensaje, "GFE", function () {
                                                        mainView.router.navigate('/PadronVehiculo/' + 0 + '/' + id_gde_actual + '/' + 0);
                                                    });

                                                })();
                                            } else {
                                                app.dialog.close();
                                                mainView.router.navigate('/PadronVehiculo/' + 0 + '/' + id_gde_actual + '/' + 0);
                                            }
                                        }

                                    });


                                }).catch((e) => {
                                    app.dialog.close();
                                    app.dialog.alert(e, "GFE");
                                    reject(e);
                                });

                            } else {

                                mainView.router.navigate('/PadronVehiculo/' + 0 + '/' + id_gde_actual + '/' + 0);
                            }
                        } else {
                            app.dialog.alert("Antes de continuar. Debe capturar las imágenes del camión cargado", "Evidencia", function () {
                                return false;
                            });
                        }

                    });
                });

            }
        }



    });
});


async function capturar_evidencia_camion_cargado(tipo_evidencia) {

    if (permiteIngresoFotografiasCamionCargado === false) {
        app.dialog.alert(`No puede capturar mas evidencias debido a que el despacho ha sido anulado.`, "GFE");
    } else {

        const estadoGPS = await verificarEstadoGPS();
        if (!estadoGPS) {
            app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
        } else {
            const estadoValidacion = await validacionHoraInicioTerminoCarguio(id_gde_actual);
            if (constantes.validaRangoHoraCamionCargado && !estadoValidacion.esValido) {
                app.dialog.preloader("Cargando...");
                getLocation2().then(async (coordenadas) => {
                    const mensaje = `Fecha captura camión cargado fuera de los rangos establecidos (${estadoValidacion.tiempoMinimoEspera}-${estadoValidacion.tiempoMaximoAcumulado} minutos.)`;
                    let datos = await generarDataTrazabilidad(
                        TipoAccionTypes.TIEMPO_CAPTURA_CAMION_CARGADO_FUERA_RANGO,
                        Obtener_dato_local('user_activo'),
                        {
                            rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                            despacho: gde_actual,
                            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                            mensajeMostrado: mensaje
                        }
                    );

                    await obtenerUbicacionEInsertarLog(
                        Obtener_dato_local('user_activo'),
                        datos
                    );
                    ControlServiceAnular(id_gde_actual, coordenadas.GPS_LAT, coordenadas.GPS_LON, "", mensaje).then((anula) => {
                        app.dialog.close();
                        app.dialog.alert(mensaje, "GFE", function () {
                            mainView.router.navigate("/");
                        });
                    });

                });
            } else {
                if (tipo_evidencia == constantes.tipoEvidencia.camionCargado1) {
                    capturePhotoWithFile(id_gde_actual, tipo_evidencia);
                }

                if (tipo_evidencia == constantes.tipoEvidencia.camionCargado2) {
                    capturePhotoWithFile(id_gde_actual, tipo_evidencia);
                }

            }
        }

    }



}


async function cargar_evidencia_camion_cargado(evidencia, tipo) {
    app.dialog.preloader("Cargando...");


    const accion = tipo == constantes.tipoEvidencia.camionCargado1 ? TipoAccionTypes.CAPTURA_EVIDENCIA_CAMION_CARGADO1 : TipoAccionTypes.CAPTURA_EVIDENCIA_CAMION_CARGADO2;
    let datos = await generarDataTrazabilidad(
        accion,
        Obtener_dato_local('user_activo'),
        {
            rol: gde_actual?.GDE_COD_ORIGEN ?? null,
            despacho: gde_actual,
            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
        }
    );

    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );


    if (tipo == constantes.tipoEvidencia.camionCargado1) {
        $$("#imagen_camion_cargado").attr("src", evidencia.ARCHIVO);
    }
    if (tipo == constantes.tipoEvidencia.camionCargado2) {
        $$("#imagen_camion_cargado_2").attr("src", evidencia.ARCHIVO);
    }

    if ((configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.camionCargado1 && tipo == constantes.tipoEvidencia.camionCargado1)
        || (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.camionCargado2 && tipo == constantes.tipoEvidencia.camionCargado2)) {

        encuentraFotoFueraGeocercaCamionCargado = false;
        validarGeocerca(gde_actual.GDE_COD_ORIGEN).then((resultado) => {
            let resultadoValidacion = resultado.validacion;
            validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.final).then(async (resultado) => {
                //si debe cerrar control
                if (resultado.cierra) {

                    let debeAnular = false;
                    encuentraFotoFueraGeocercaCamionCargado = true;
                    // Manejar intentos por tipo
                    if (tipo === constantes.tipoEvidencia.camionCargado1) {
                        intentosCamionCargado1++;
                        const resss = manejarIntentosCapturaEvidencias(intentosCamionCargado1, intentosMaximosCamionCargado);
                        debeAnular = resss.debeAnular;

                    } else if (tipo === constantes.tipoEvidencia.camionCargado2) {
                        intentosCamionCargado2++;
                        const resss = manejarIntentosCapturaEvidencias(intentosCamionCargado2, intentosMaximosCamionCargado);
                        debeAnular = resss.debeAnular;
                    }
                    await DATOS_ActualizarIntentosEvidencia(evidencia.ID_UNICO_MOVIL, tipo === constantes.tipoEvidencia.camionCargado1 ? intentosCamionCargado1 : intentosCamionCargado2);
                    if (debeAnular) {
                        permiteIngresoFotografiasCamionCargado = false;
                        ControlServiceAnular(id_gde_actual, resultado.latitud, resultado.longitud, "", `${constantes.mensajeGeocercaNoValida} (CAPTURA EVIDENCIA CAMIÓN CARGADO)`).then((anula) => {
                            if (anula) {
                                (async () => {
                                    let datos = await generarDataTrazabilidad(
                                        TipoAccionTypes.GEOCERCA_INVALIDA,
                                        Obtener_dato_local('user_activo'),
                                        {
                                            rol: gde_actual?.GDE_COD_ORIGEN ?? null,
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
                    } else {

                        (async () => {
                            const mensajeMostrado = tipo === constantes.tipoEvidencia.camionCargado1 ? "Camión cargado1 1: sacar foto nuevamente porque se encuentra fuera de Geocerca." : "Camión cargado 2: sacar foto nuevamente porque se encuentra fuera de Geocerca.";
                            let datos = await generarDataTrazabilidad(
                                TipoAccionTypes.ADVERTENCIA_GEOCERCA_CAPTURA_EVIDENCIA,
                                Obtener_dato_local('user_activo'),
                                {
                                    rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                                    despacho: gde_actual,
                                    id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                                    mensajeMostrado: mensajeMostrado,
                                    intentos: {
                                        camionCargado1: intentosCamionCargado1,
                                        camionCargado2: intentosCamionCargado2
                                    }
                                }
                            );

                            await obtenerUbicacionEInsertarLog(
                                Obtener_dato_local('user_activo'),
                                datos
                            );
                            app.dialog.close();
                            app.dialog.alert(mensajeMostrado, "GFE");

                        })();
                    }



                }
                else {
                    if (resultado.advertencia) {
                        app.dialog.close();
                        app.dialog.alert(resultado.mensaje, "GFE");
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
    }
}


function volver_punto_gde() {
    mainView.router.navigate('/PuntosGDE/' + 0 + '/' + id_gde_actual + '/' + 0);
}