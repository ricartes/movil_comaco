var id_gde_actual;
var tipo_evidencia_camion_cargado = 2;
var tipo_evidencia_camion_cargado_2 = 4;
var gde_actual = null;
$$(document).on('page:init', '.page[data-name="camion-cargado"]', async function (e, page) {

    id_gde_actual = mainView.router.currentRoute.params.idgde;
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
    app.dialog.close();
    DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_cargado, function (datos_evidencia) {

        if (datos_evidencia != "-1") {
            $$("#imagen_camion_cargado").attr("src", datos_evidencia[0].ARCHIVO);
        }
        DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_cargado_2, function (datos_evidencia_2) {
            
            if (datos_evidencia_2 != "-1") {
                $$("#imagen_camion_cargado_2").attr("src", datos_evidencia_2[0].ARCHIVO);
            }

        });


    });



    $$("#btn_padron_guia").click(function () {
        DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_cargado, function (datos_evidencia) {
            DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_cargado_2, function (datos_evidencia_2) {
                if (datos_evidencia != "-1" && datos_evidencia_2 != "-1") {
                    mainView.router.navigate('/PadronVehiculo/' + 0 + '/' + id_gde_actual + '/' + 0);
                } else {
                    app.dialog.alert("Antes de continuar. Debe capturar las imágenes del camión cargado", "Evidencia", function () {
                        return false;
                    });
                }

            });
        });

    });
});


async function capturar_evidencia_camion_cargado(tipo_evidencia) {

    const estadoValidacion = await validacionHoraInicioTerminoCarguio(id_gde_actual);

    if (!estadoValidacion) {
        app.dialog.preloader("Cargando...");
        getLocation2().then((coordenadas) => {
            ControlServiceAnular(id_gde_actual, coordenadas.GPS_LAT, coordenadas.GPS_LON, "F", constantes.mensajeHoraCamionCargadoNoValida).then((anula) => {
                app.dialog.close();
                app.dialog.alert("Fecha captura camión cargado fuera de los rangos establecidos", "GFE", function () {
                    mainView.router.navigate("/");
                });
            });

        });
    } else {
        if (tipo_evidencia == 2) {
            capturePhotoWithFile(id_gde_actual, tipo_evidencia);
        }

        if (tipo_evidencia == 4) {
            capturePhotoWithFile(id_gde_actual, tipo_evidencia);
        }

    }
}


async function cargar_evidencia_camion_cargado(evidencia, tipo) {
    app.dialog.preloader("Cargando...");


    const accion = tipo == 2 ? TipoAccionTypes.CAPTURA_EVIDENCIA_CAMION_CARGADO1 : TipoAccionTypes.CAPTURA_EVIDENCIA_CAMION_CARGADO2;
    let datos = await generarDataTrazabilidad(
        accion,
        Obtener_dato_local('user_activo'),
        { despacho: gde_actual, id_unico_movil_gde: gde_actual && gde_actual.ID_UNICO_MOVIL ? gde_actual.ID_UNICO_MOVIL : null }
    );

    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );


    if (tipo == 2) {
        $$("#imagen_camion_cargado").attr("src", evidencia.ARCHIVO);
    }
    if (tipo == 4) {
        $$("#imagen_camion_cargado_2").attr("src", evidencia.ARCHIVO);
    }

    if ((configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.camionCargado1 && tipo == 2)
        || (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.camionCargado2 && tipo == 4)) {

        validarGeocerca(gde_actual.GDE_COD_ORIGEN).then((resultado) => {
            let resultadoValidacion = resultado.validacion;
            validarCierreControl(resultadoValidacion, id_gde_actual, 1).then((resultado) => {
                //si debe cerrar control
                if (resultado.cierra) {
                    ControlServiceAnular(idgde_acutal, resultado.latitud, resultado.longitud, "I", constantes.mensajeGeocercaNoValida).then((anula) => {
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