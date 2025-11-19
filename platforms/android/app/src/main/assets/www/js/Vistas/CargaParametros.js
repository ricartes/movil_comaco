
var $$ = Dom7;
//

$$(document).on('page:init', '.page[data-name=carga-parametros]', function (e, page) {
    //alert("entro a carga parametros");





    $$('#btn_carga_parametros').on('click', function () {
        $$('#btn_carga_parametros').addClass("disabled");
        $$(".link").addClass("disabled");
        //$$('#btn_atras_parametro').bind('click', false);
        carga_parametros();
    });
});






function carga_parametros() {

    var rut = Obtener_dato_local("rut_activo");
    var username = Obtener_dato_local("user_activo");
    var empresa = Obtener_dato_local("empresa_activo");


    if (checkConnection() == "No network connection") {
        app.dialog.alert("No hay conexión a Internet", "GFE PROVEEDORES");
        return false;
    } else {

        comprueba_conexion("0", async function (result_conexion) {

            if (result_conexion == 1) {
                try {

                    let datos = await generarDataTrazabilidad(
                        TipoAccionTypes.INICIA_CARGA_PARAMETROS,
                        Obtener_dato_local('user_activo')
                    );

                    await obtenerUbicacionEInsertarLog(
                        Obtener_dato_local('user_activo'),
                        datos
                    );

                    try {
                        const versionValida = await validarVersionApp();
                        Guardar_dato_local("version_app_invalida", versionValida ? 0 : 1);
                        if (!versionValida) {
                            let datos = await generarDataTrazabilidad(
                                TipoAccionTypes.VERSION_INCORRECTA_APP,
                                Obtener_dato_local('user_activo')
                            );

                            await obtenerUbicacionEInsertarLog(
                                Obtener_dato_local('user_activo'),
                                datos
                            );

                            // Versión desactualizada => no seguimos con carga de parámetros
                            envio_automatico_activado = 1;
                            $$(".link").removeClass("disabled");
                            $$('#btn_carga_parametros').removeClass("disabled");

                            app.dialog.alert(
                                "La versión de la aplicación instalada en este dispositivo no es la última vigente. " +
                                "Por favor, actualice la app antes de continuar.",
                                "Actualización requerida"
                            );

                            return false;
                        }
                    } catch (ex) {
                        throw ex;
                    }

                    cargar_orden_compra(username, empresa, 0, function (result) {
                        if (result > 0) {

                            cargar_transporte(rut, result, function (result3) {
                                if (result3 > 0) {

                                    cargar_empresa(rut, result3, function (result4) {
                                        if (result4 > 0) {

                                            cargar_parametros_generales(rut, "1", result4, function (result5) {

                                                if (result5 > 0) {
                                                    cargar_patente_ex(rut, "1", result5, function (result6) {
                                                        if (result6 > 6) {


                                                            ws_cargaGeocercas(rut, "1", result6, function (result7) {
                                                                if (result7 > 0) {
                                                                    envio_automatico_activado = 1;
                                                                    $$('#btn_carga_parametros').addClass("disabled");
                                                                    $$(".link").removeClass("disabled");
                                                                    Guardar_dato_local("fecha_hora_carga_parametros", FechaHoraActual());

                                                                    (async () => {
                                                                        let datos = await generarDataTrazabilidad(
                                                                            TipoAccionTypes.FINALIZA_CARGA_PARAMETROS,
                                                                            Obtener_dato_local('user_activo')
                                                                        );

                                                                        const resultado = await obtenerUbicacionEInsertarLog(
                                                                            Obtener_dato_local('user_activo'),
                                                                            datos
                                                                        );

                                                                        app.dialog.alert("Parametros cargados correctamente", "Carga parámetros", function () {
                                                                            mainView.router.navigate('/');
                                                                        });
                                                                    })();



                                                                } else {
                                                                    mensaje = "Error al cargar Geocercas";
                                                                    app.dialog.alert(
                                                                        mensaje,
                                                                        "GFE"
                                                                    );

                                                                }

                                                            });




                                                        } else {
                                                            mensaje = "Error al cargar patentes ex";
                                                            app.dialog.alert(mensaje, "GFE");
                                                        }

                                                    });



                                                } else {
                                                    mensaje = "Error al cargar parametro general";
                                                    app.dialog.alert(mensaje, "GFE");
                                                }


                                            });


                                        } else {
                                            mensaje = "Error al cargar datos de empresa";
                                            app.dialog.alert(mensaje, "GFE");
                                        }


                                    });



                                } else {
                                    mensaje = "Error al cargar datos Transporte";
                                    app.dialog.alert(mensaje, "GFE");

                                }


                            });



                        } else {
                            envio_automatico_activado = 1;
                            var mensaje = "";
                            if (result == 0) {
                                mensaje = "No hay parámetros por cargar para el usuario ingresado.\n Compruebe con el administrador que tenga zonas asignadas";
                            } else {
                                mensaje = "Error al cargar Orden Compra";
                            }

                            app.dialog.alert(mensaje, "GFE");
                            $$(".link").removeClass("disabled");
                            $$('#btn_carga_parametros').removeClass("disabled")
                            return false;
                        }

                    });

                } catch (e) {
                    console.error("Error en carga_parametros:", e);
                    envio_automatico_activado = 1;
                    $$(".link").removeClass("disabled");
                    $$('#btn_carga_parametros').removeClass("disabled");
                    app.dialog.alert(
                        "Ocurrió un error al intentar cargar los parámetros. Intente nuevamente.",
                        "GFE"
                    );
                    return false;
                }

            } else {

                $$(".link").removeClass("disabled");
                $$('#btn_carga_parametros').removeClass("disabled")
                envio_automatico_activado = 1;
                app.dialog.alert("No se ha podido establecer la conexion con el servidor", "Carga de guías")
                return false;

            }


        });


    }


}



function confirmacarga() {
    alert("si");
}


function cambiar_estado(texto, estado) {

    //if(estado==1)$$("#nombre_parametro").css('color', 'green');
    $$("#nombre_parametro").html(texto);
}


function cambia_progressbar(porcentaje) {
    //alert("entro a cambiar progressbar");

    /*if(porcentaje=="100"){
        $$("#nombre_parametro").css('color', 'green');
    }
    if(porcentaje=="-1"){
        $$("#nombre_parametro").css('color', 'red');
    }else{
        app.progressbar.set(".progressbar",porcentaje , "");
    }*/


    //alert(porcentaje);

    app.progressbar.set(".progressbar", porcentaje, "");
    //alert(parametro);

    //$$("#nombre_parametro").html(parametro)	
}