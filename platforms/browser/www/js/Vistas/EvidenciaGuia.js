var options_gps = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: Infinity
};

var id_gde_actual;
var gde_actual = null;
var evidencia_seleccionada = 0;
var tipo_evidencia_general = 6;

let cantidadEvidencias = 0;

$$(document).on('page:init', '.page[data-name="evidencia-guia"]', async function (e, page) {

    zona_activa = mainView.router.currentRoute.params.idzona;
    id_gde = mainView.router.currentRoute.params.idgde;
    tipo_emision = mainView.router.currentRoute.params.tipoemision;
    id_gde_actual = id_gde;

    app.dialog.progress("Cargando...")
    gde_actual = await seleccionarGdeProveedor(id_gde_actual);


    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.INGRESO_EVIDENCIA_ADICIONALES,
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


    cargar_datos_evidencia(id_gde);
    cargar_datos_usuario(1);
    $$("#btn_nueva_evidencia").click(function () {
        capturePhotoWithFile(id_gde, tipo_evidencia_general);
    });

    $$("#btn_emitir").click(function () {
        app.dialog.confirm('¿Está seguro que desea informar Despacho?', "GFE Proveedores", function () {
            app.dialog.preloader("Informando despacho...")
            if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.informarDespacho) {

                validarGeocerca(gde_actual.GDE_COD_ORIGEN).then((resultadoGeocerca) => {

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
                                            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                        }
                                    );

                                    await obtenerUbicacionEInsertarLog(
                                        Obtener_dato_local('user_activo'),
                                        datos
                                    );
                                    app.dialog.close();
                                    app.dialog.alert(resultado.mensaje, "GFE", function () {
                                        app.dialog.preloader("Informando despacho...")
                                        emitir_guia();
                                    });

                                })();
                            } else {
                                emitir_guia();
                            }
                        }

                    });


                }).catch((e) => {
                    app.dialog.close();
                    app.dialog.alert(e, "GFE");
                    reject(e);
                });

            } else {
                emitir_guia();
            }




        });

    });

});







async function emitir_guia() {



    let gde = gde_actual;
    gde.ROWID = id_gde_actual;

    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.INFORMA_DESPACHO,
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

    const datosUbicacion = await getLocation2();
    gde.GDE_COORDENADA_X = datosUbicacion.GPS_LAT;
    gde.GDE_COORDENADA_Y = datosUbicacion.GPS_LON;
    app.dialog.close();

    if (!datosUbicacion.status) {
        app.dialog.close();
        app.dialog.alert("Coordenadas no obtenidas. Favor revisar la configuración de GPS", "GFE", function () {
            confirmEmisionDespacho(id_gde_actual, gde);
        });
    } else {
        confirmEmisionDespacho(id_gde_actual, gde);
    }
}



function confirmEmisionDespacho(id_gde, gde) {
    inicializarDatosGde();
    const estado = "I";
    DATOS_cambiar_estado_gde_proveedores(id_gde, estado, function (result1) {
        DATOS_cambiar_estado_gde_evidencia(id_gde, estado, function (result2) {

            DATOS_asigna_coordenadas(gde, function (result3) {

                app.dialog.alert("Despacho informado correctamente.", "GFE", function () {
                    mainView.router.navigate('/');
                });
            });
        });
    });

}





function recargar_datos_gde(id_gde) {

    $$('#tx_guia_proveedor').val(gde_actual.GDE_GUIA_PROVEEDOR);
    $$('#tx_volumen_proveedor').val(gde_actual.GDE_VOLUMEN_PROVEEDOR);
    $$('#tx_anio_cosecha').val(gde_actual.GDE_ANO_COSECHA);
    $$("#tx_comentario").val(gde_actual.GDE_COMENTARIO);

}




function cargar_datos_evidencia(id_gde) {

    var htmls = "";
    DATOS_seleccionar_evidencia_guia(id_gde, tipo_evidencia_general, function (datos_evidencia) {

        if (datos_evidencia != "-1") {
            cantidadEvidencias = datos_evidencia.length;
            for (i = 0; i < datos_evidencia.length; i++) {
                htmls += "<li class='swipeout'>";
                htmls += "<a href='#' class='item-link item-content swipeout-content'>";
                htmls += '<div class="item-media" onclick="visualizar_foto(\'' + datos_evidencia[i].ARCHIVO + '\')" ><img src="' + datos_evidencia[i].ARCHIVO + '" width="80"/></div></div>';
                htmls += "<div class='item-inner'>";
                htmls += "<div class='item-title-row'>";
                htmls += " <div class='item-title'>Evidencia " + parseInt(i + 1) + "</div><div class='item-after'></div>";
                htmls += "</div>";
                htmls += "<div class='item-subtitle'>" + datos_evidencia[i].FECHA_FORMAT + "</div>";
                htmls += "<div class='item-text'>" + datos_evidencia[i].OBSERVACION + "</div>";
                htmls += "</div>";
                htmls += "</div>";
                htmls += "</a>";

                htmls += '<div class="swipeout-actions-right">';
                htmls += '<a onclick="observacion(\'' + datos_evidencia[i].ROWID + '\',\'' + datos_evidencia[i].OBSERVACION + '\',\'' + id_gde + '\');"  class="open-more-actions" >Observación</a>';
                htmls += '<a onclick="eliminar_evidencia(\'' + datos_evidencia[i].ROWID + '\',\'' + datos_evidencia[i].ARCHIVO + '\',\'' + id_gde + '\');"  class="swipeout" style="background:#FF3B30;">Eliminar</a>';
                htmls += '</div>';
                htmls += "</li>";
            }

        } else {
            htmls += "<div class='block-title'>Evidencias</div><div class='block'><p>No hay datos registrados. Presionar botón (+) para ingresar una nueva evidencia</p></div><br><br>";
        }


        $$("#listado_evidencias").html(htmls);



        recargar_datos_gde(id_gde);


    });

}


async function confirmaCargaEvidencia(id_gde) {
    app.dialog.progress("Cargando...")
    let datos = await generarDataTrazabilidad(
        TipoAccionTypes.CAPTURA_EVIDENCIA_ADICIONAL,
        Obtener_dato_local('user_activo'),
        {
            rol: gde_actual?.GDE_COD_ORIGEN ?? null,
            despacho: gde_actual,
            id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
            mensajeMostrado: `EVIDENCIA n° ${cantidadEvidencias + 1}`
        }
    );

    await obtenerUbicacionEInsertarLog(
        Obtener_dato_local('user_activo'),
        datos
    );




    if (configuracionGeocercas.habilitado && configuracionGeocercas.habilitadoPorAccion.evidenciaOtros) {


        validarGeocerca(gde_actual.GDE_COD_ORIGEN).then((resultadoGeocerca) => {
            let resultadoValidacion = resultadoGeocerca.validacion;
            validarCierreControl(resultadoValidacion, id_gde, constantes.tipoPunto.final).then((resultado) => {
                //si debe cerrar control

                if (resultado.cierra) {

                    ControlServiceAnular(id_gde, resultadoGeocerca.latitud, resultadoGeocerca.longitud, "F").then((anula) => {
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
                                    id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
                                }
                            );

                            await obtenerUbicacionEInsertarLog(
                                Obtener_dato_local('user_activo'),
                                datos
                            );
                            app.dialog.close();
                            cargar_datos_evidencia(id_gde);
                            app.dialog.alert(resultado.mensaje, "GFE");

                        })();
                    } else {
                        app.dialog.close();
                        cargar_datos_evidencia(id_gde);

                    }
                }

            });


        }).catch((e) => {
            app.dialog.close();
            app.dialog.alert(e, "GFE");
            reject(e);
        });


    } else {
        cargar_datos_evidencia(id_gde);
        app.dialog.close();
    }
}



function actualizar_num_guia() {

    var num_guia = $$("#tx_guia_proveedor").val();
    DATOS_actualiza_num_guia(id_gde_actual, num_guia, 0, function (result) {
        //alert("guardado hora salida");

    });

}


function actualizar_vol_proveedor() {
    var vol_proveedor = $$("#tx_volumen_proveedor").val();
    DATOS_actualiza_volumen_proveedor(id_gde_actual, vol_proveedor, function (result) {


    });


}



function actualizar_anio_cosecha() {
    var anio_cosecha = $$("#tx_anio_cosecha").val();
    DATOS_actualiza_anio_cosecha(id_gde_actual, anio_cosecha, function (result) {


    });


}



function actualizar_comentarios() {
    var comentarios = $$("#tx_comentario").val();
    DATOS_actualiza_comentarios(id_gde_actual, comentarios, function (result) {


    });


}


function visualizar_foto(ruta) {
    var myPhotoBrowserStandalone = app.photoBrowser.create({
        navbarOfText: 'de',
        photos: [
            ruta,
        ]
    })


    myPhotoBrowserStandalone.open();
}




function observacion(id_evidencia, observacion_registrada, id_gde) {

    //evidencia_seleccionada=id_evidencia;
    var dialog = app.dialog.prompt('Ingrese la observación', "GFE Proveedores", callbackOk, callbackCancel);
    dialog.$el.find('input').val(observacion_registrada);


    function callbackOk(observacion_ingresada) {
        var evidencia = new CL_GDE_Evidencia();
        evidencia.ROWID = id_evidencia;
        evidencia.OBSERVACION = observacion_ingresada;
        DATOS_actualizar_observacion_evidencia_guia(evidencia, function (result) {

            cargar_datos_evidencia(id_gde_actual);
        });
    };


    function callbackCancel(cancel) {
        cargar_datos_evidencia(id_gde);
    };
}




function eliminar_evidencia(id_evidencia, archivo, id_gde) {

    app.dialog.confirm('¿Está seguro que desea eliminar esta evidencia?', "GFE Proveedores", function () {


        DATOS_borrar_evidencia_guia(id_evidencia, function (result_borrar) {
            borra_archivo_foto(id_gde, archivo);
        });
    });

}


function volver_padron_vehiculo() {

    mainView.router.navigate('/PadronVehiculo/' + 0 + '/' + id_gde_actual + '/' + 0);
}









