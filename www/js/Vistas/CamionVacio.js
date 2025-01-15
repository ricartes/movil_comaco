var id_gde_actual;
var tipo_evidencia_camion_vacio = 1;
var tipo_evidencia_camion_vacio_2 = 3;
var gde_actual = null;

$$(document).on('page:init', '.page[data-name="camion-vacio"]', async function (e, page) {

    id_gde_actual = mainView.router.currentRoute.params.idgde;
    const gde = await seleccionarGdeProveedor(id_gde_actual);
    gde_actual = gde;

    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.INGRESO_CAMION_VACIO,
        Obtener_dato_local('user_activo'),
        { despacho: gde_actual, id_unico_movil_gde: gde_actual && gde_actual.ID_UNICO_MOVIL ? gde_actual.ID_UNICO_MOVIL : null }
    );

    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );


    DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_vacio, function (datos_evidencia) {
        if (datos_evidencia != "-1") {
            $$("#imagen_camion_vacio").attr("src", datos_evidencia[0].ARCHIVO);
        }

        DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_vacio_2, function (datos_evidencia_2) {
            if (datos_evidencia_2 != "-1") {
                $$("#imagen_camion_vacio_2").attr("src", datos_evidencia_2[0].ARCHIVO);
            }

        });
    });


    $$("#btn_puntos").click(function () {

        DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_vacio, function (datos_evidencia) {
            DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_vacio_2, async function (datos_evidencia_2) {
                if (datos_evidencia != "-1" && datos_evidencia_2 != "-1") {

                    if (gde_actual.GDE_CAPTURA_FOTO_CAMION_VACIO == 0) {
                        const resultado = await DATOS_cambiaEstadoCamionVacio(id_gde_actual, 1);
                    }
                    mainView.router.navigate('/PuntosGDE/' + 0 + '/' + id_gde_actual + '/' + 0);

                } else {
                    app.dialog.alert("Antes de continuar. Debe capturar las imágenes del camión vacio", "Evidencia", function () {
                        return false;
                    });
                }

            });


        });
    });
});




function capturar_evidencia_camion_vacio(tipo_evidencia) {
    if (gde_actual.GDE_CAPTURA_FOTO_CAMION_VACIO == 0) {

        if (tipo_evidencia == 1) {
            capturePhotoWithFile(id_gde_actual, tipo_evidencia);
        }
        if (tipo_evidencia == 3) {
            capturePhotoWithFile(id_gde_actual, tipo_evidencia);
        }
    }
    else {
        app.dialog.alert("Ya ha capturado las evidencias necesarias para el camión vacio", "Evidencia", function () {
            return false;
        });
    }

}




async function cargar_evidencia_camion_vacio(evidencia, tipo) {

    app.dialog.preloader("Cargando...");
    const accion = tipo == 1 ? TipoAccionTypes.CAPTURA_EVIDENCIA_CAMION_VACIO1 : TipoAccionTypes.CAPTURA_EVIDENCIA_CAMION_VACIO2;
    let datos = await generarDataTrazabilidad(
        accion,
        Obtener_dato_local('user_activo'),
        { despacho: gde_actual, id_unico_movil_gde: gde_actual && gde_actual.ID_UNICO_MOVIL ? gde_actual.ID_UNICO_MOVIL : null }
    );

    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );

    if (tipo == 1) {
        $$("#imagen_camion_vacio").attr("src", evidencia.ARCHIVO);
    }
    if (tipo == 3) {
        $$("#imagen_camion_vacio_2").attr("src", evidencia.ARCHIVO);
    }


    if ((configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.camionVacio1 && tipo == 1)
        || (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.camionVacion2 && tipo == 3)) {


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


function volver_emision() {

    mainView.router.navigate('/EmisionDesdeFaena/' + 0 + '/' + id_gde_actual + '/' + 0);

}