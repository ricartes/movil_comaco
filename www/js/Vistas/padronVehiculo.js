var id_gde_actual;
var gde_actual = null;

let intentosPadronVehiculo;
let intentosMaximosPadronVehiculo = constantes.cantidadMaximaIntentosCaptura;
let encuentraFotoFueraGeocercaPadronVehiculo;
let permiteIngresoFotografiasPadronVehiculo;
$$(document).on('page:init', '.page[data-name="padron-vehiculo"]', async function (e, page) {

    app.dialog.preloader("Cargando...")
    encuentraFotoFueraGeocercaPadronVehiculo = false;
    permiteIngresoFotografiasPadronVehiculo = true;
    intentosPadronVehiculo = 0;
    id_gde_actual = mainView.router.currentRoute.params.idgde;
    const gde = await seleccionarGdeProveedor(id_gde_actual);
    gde_actual = gde;



    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.INGRESO_PADRON_VEHICULO,
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

    DATOS_seleccionar_evidencia_guia(id_gde_actual, constantes.tipoEvidencia.padronVehiculo, function (datos_evidencia) {
        if (datos_evidencia != "-1") {

            intentosPadronVehiculo = datos_evidencia[0].CANTIDAD_INTENTOS;
            const resss = manejarIntentosCapturaEvidencias(intentosPadronVehiculo, intentosMaximosPadronVehiculo);
            intentosPadronVehiculo = resss.intentosActualizados;
            permiteIngresoFotografiasPadronVehiculo = !resss.debeAnular ? true : false;
            $$("#imagen_padron").attr("src", datos_evidencia[0].ARCHIVO);
        }
    });




    $$("#btn_evidencia_guia").click(async function () {


        if (encuentraFotoFueraGeocercaPadronVehiculo) {
            app.dialog.alert("Existen fotografías que se encuentran fuera de la geocerca. Favor corregir e intentar nuevamente.");
            return false;
        } else {
            const estadoGPS = await verificarEstadoGPS();
            if (!estadoGPS) {
                app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
            } else {

                DATOS_seleccionar_evidencia_guia(id_gde_actual, constantes.tipoEvidencia.padronVehiculo, function (datos_evidencia) {

                    if (datos_evidencia != "-1") {
                        if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.avanzaHaciaEvidencia) {
                            app.dialog.preloader("Guardando...")
                            validarGeocerca(gde_actual.GDE_COD_ORIGEN).then((resultadoGeocerca) => {

                                let resultadoValidacion = resultadoGeocerca.validacion;
                                validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.final).then((resultado) => {
                                    //si debe cerrar control
                                    if (resultado.cierra) {
                                        ControlServiceAnular(id_gde_actual, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "", `${constantes.mensajeGeocercaNoValida} (ACCIÓN IR A EVIDENCIAS)`).then((anula) => {
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
                                                    mainView.router.navigate('/EvidenciaGuia/' + 0 + '/' + id_gde_actual + '/' + 0);
                                                });

                                            })();
                                        } else {
                                            app.dialog.close();
                                            mainView.router.navigate('/EvidenciaGuia/' + 0 + '/' + id_gde_actual + '/' + 0);
                                        }
                                    }

                                });


                            }).catch((e) => {
                                app.dialog.close();
                                app.dialog.alert(e, "GFE");
                                reject(e);
                            });


                        } else {
                            mainView.router.navigate('/EvidenciaGuia/' + 0 + '/' + id_gde_actual + '/' + 0);
                        }
                    } else {
                        app.dialog.alert("Antes de continuar. Debe capturar una imagen del padrón del vehículo", "Evidencia", function () {
                            return false;
                        });
                    }
                });

            }
        }


    });

});




async function capturar_evidencia_padron(tipo_evidencia) {

    if (permiteIngresoFotografiasCamionCargado === false) {
        app.dialog.alert(`No puede capturar mas evidencias debido a que el despacho ha sido anulado.`, "GFE");
    } else {

        const estadoGPS = await verificarEstadoGPS();
        if (!estadoGPS) {
            app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
        } else {
            if (tipo_evidencia == constantes.tipoEvidencia.padronVehiculo) {
                capturePhotoWithFile(id_gde_actual, tipo_evidencia);
            }
        }
    }

}


async function cargar_evidencia_padron_vehiculo(evidencia, tipo) {

    if (tipo == constantes.tipoEvidencia.padronVehiculo) {
        $$("#imagen_padron").attr("src", evidencia.ARCHIVO);

        app.dialog.progress("Cargando...");
        let datos = await generarDataTrazabilidad(
            TipoAccionTypes.CAPTURA_EVIDENCIA_PADRON_VEHICULO,
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


        if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.padronVehiculo) {

            validarGeocerca(gde_actual.GDE_COD_ORIGEN).then((resultado) => {
                let resultadoValidacion = resultado.validacion;
                validarCierreControl(resultadoValidacion, id_gde_actual, constantes.tipoPunto.final).then(async (resultado) => {
                    //si debe cerrar control
                    if (!resultado.cierra) { //TODO: DESCOMENTAR


                        let debeAnular = false;
                        encuentraFotoFueraGeocercaPadronVehiculo = true;
                        intentosPadronVehiculo++;
                        const resss = manejarIntentosCapturaEvidencias(intentosPadronVehiculo, intentosMaximosPadronVehiculo);
                        debeAnular = resss.debeAnular;
                        await DATOS_ActualizarIntentosEvidencia(evidencia.ID_UNICO_MOVIL, intentosPadronVehiculo);

                        if (debeAnular) {
                            permiteIngresoFotografiasCamionCargado = false;
                            app.dialog.close();
                            /*ControlServiceAnular(idgde_acutal, resultado.latitud, resultado.longitud, "", `${constantes.mensajeGeocercaNoValida} (CAPTURA EVIDENCIA PADRÓN VEHÍCULO)`).then((anula) => {
                                if (anula) {
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
                                }

                            });*/

                        } else {
                            (async () => {
                                const mensajeMostrado = "Padrón vehículo: sacar foto nuevamente porque se encuentra fuera de Geocerca."
                                let datos = await generarDataTrazabilidad(
                                    TipoAccionTypes.ADVERTENCIA_GEOCERCA_CAPTURA_EVIDENCIA,
                                    Obtener_dato_local('user_activo'),
                                    {
                                        rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                                        despacho: gde_actual,
                                        id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                                        mensajeMostrado: mensajeMostrado,
                                        intentos: {
                                            padronVehiculo: intentosPadronVehiculo,
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
        }
    }
}



function volver_camion_cargado() {
    mainView.router.navigate('/CamionCargado/' + 0 + '/' + id_gde_actual + '/' + 0);
}

/*function volver_emision(){

    mainView.router.navigate('/EmisionDesdeFaena/'+0+'/'+id_gde_actual+'/'+0);

}*/

