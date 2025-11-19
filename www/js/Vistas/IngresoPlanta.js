// Contexto local para el flujo de evidencia de ingreso planta
var evidenciaIngresoContext = {
    fotoUrl: null,
    guias: []
};

var capturandoIngresoPlanta = false;


$$(document).on('page:init', '.page[data-name="ingreso-planta"]', async function (e, page) {


    const gdeNoConfirmadas = await DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas();

    if (gdeNoConfirmadas === "-1" || !Array.isArray(gdeNoConfirmadas) || gdeNoConfirmadas.length === 0) {
        app.dialog.alert(
            'No se encontraron guías pendientes de confirmar ingreso planta.',
            "GFE",
            function () {
                ir_atras_boton();
            }
        );
    }
    try {
        await borrarEvidenciasIngresoPlantaPendientes(gdeNoConfirmadas);

    } catch (ex) {
        app.dialog.alert(
            'Ha ocurrido un error al eliminar evidencias provisorias.',
            "GFE"
        );
    }
    // Delegación de evento para la imagen de captura
    $$('.page[data-name="ingreso-planta"]').on('click', '#imagen_confirma_planta', function () {
        capturarEvidenciaIngresoPlanta();
    });

    $$('.page[data-name="ingreso-planta"]').on('click', '#btn_confirma_ingreso_planta', function () {
        confirmarIngresoPlanta();
    });



})


async function capturarEvidenciaIngresoPlanta() {
    if (capturandoIngresoPlanta) return; // evita doble ejecución
    capturandoIngresoPlanta = true;

    try {
        const estadoGPS = await verificarEstadoGPS();
        if (!estadoGPS) {
            app.dialog.alert(
                "Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.",
                "GFE"
            );
            capturandoIngresoPlanta = false;
            return;
        }


        navigator.camera.getPicture(
            onPhotoFileSuccessIngresoPlanta,
            function (err) {
                onFail(err);              // tu handler genérico
                capturandoIngresoPlanta = false;
            },
            {
                quality: 90,
                destinationType: Camera.DestinationType.FILE_URI,
                targetWidth: 1920,
                targetHeight: 1080
            }
        );
    } catch (e) {
        console.error(e);
        capturandoIngresoPlanta = false;
        app.dialog.alert(
            "Ocurrió un error al intentar capturar la evidencia.",
            "GFE"
        );
    }
}


function onPhotoFileSuccessIngresoPlanta(imageData) {
    window.resolveLocalFileSystemURL(imageData, resolveOnSuccessIngresoPlanta, resOnError);
}

function resolveOnSuccessIngresoPlanta(entry) {
    var d = new Date();
    var n = d.getTime();
    var newFileName = Obtener_dato_local("rut_activo") + "_" + n + ".jpg";
    var myFolderApp = "fotos";

    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSys) {
        fileSys.root.getDirectory(
            myFolderApp,
            { create: true, exclusive: false },
            function (directory) {
                entry.moveTo(directory, newFileName, successMoveIngresoPlanta, resOnError);
            },
            resOnError
        );
    }, resOnError);
}


// 3) Una vez movida la foto, procesamos todas las GDE no confirmadas
function successMoveIngresoPlanta(entry) {
    var fotoUrl = entry.toURL(); // misma URL para todas las guías

    procesarEvidenciasIngresoPlanta(fotoUrl);
}

async function procesarEvidenciasIngresoPlanta(fotoUrl) {
    try {
        const gdeNoConfirmadas = await DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas();

        if (gdeNoConfirmadas === "-1" || !Array.isArray(gdeNoConfirmadas) || gdeNoConfirmadas.length === 0) {
            app.dialog.alert(
                "No se encontraron guías pendientes de confirmar ingreso planta.",
                "GFE"
            );
            capturandoIngresoPlanta = false;
            return false;
        } else {

            // Guardamos contexto para este flujo
            evidenciaIngresoContext = {
                fotoUrl: fotoUrl,
                guias: gdeNoConfirmadas
            };

            console.log(evidenciaIngresoContext);

            // Obtenemos ubicación solo una vez para todas
            getLocationIngresoPlanta();
        }



    } catch (err) {
        console.error(err);
        capturandoIngresoPlanta = false;
        app.dialog.alert(
            "Ocurrió un error al preparar las evidencias de ingreso a planta.",
            "GFE"
        );
    }
}


// 4) Ubicación para todas las evidencias
function getLocationIngresoPlanta() {
    app.dialog.preloader("Obteniendo ubicación");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            showPositionIngresoPlanta,
            errorGpsIngresoPlanta,
            options_gps
        );
    } else {
        app.dialog.close();
        app.dialog.alert(
            "Coordenadas no obtenidas. Favor revisar la configuración de GPS",
            "GFE"
        );
        guardarEvidenciasIngresoPlanta(0, 0);
    }
}

function showPositionIngresoPlanta(position) {
    app.dialog.close();
    guardarEvidenciasIngresoPlanta(
        position.coords.latitude,
        position.coords.longitude
    );
}

function errorGpsIngresoPlanta(err) {
    console.warn(err);
    app.dialog.close();
    app.dialog.alert(
        "Coordenadas no obtenidas. Favor revisar la configuración de GPS",
        "GFE"
    );
    guardarEvidenciasIngresoPlanta(0, 0);
}


// 5) Crear una evidencia por cada GDE y reutilizar fotos.js
function guardarEvidenciasIngresoPlanta(latitud, longitud) {
    const guias = evidenciaIngresoContext.guias || [];
    const fotoUrl = evidenciaIngresoContext.fotoUrl;

    if (!guias.length) {
        capturandoIngresoPlanta = false;
        return;
    }

    let pendientes = guias.length;

    guias.forEach(function (gde) {
        const evidencia = new CL_GDE_Evidencia();
        evidencia.ID_UNICO_MOVIL = "evid_gde" + obtener_IDUNICO();


        evidencia.ID_GDE = gde.ROWID;
        evidencia.ID_UNICO_MOVIL_GDE = gde.ID_UNICO_MOVIL;
        evidencia.GDE_ESTADO_MOVIL = "B";     // borrador local
        evidencia.FECHA_EVIDENCIA = "";
        evidencia.OBSERVACION = "EVIDENCIA CONFIRMA INGRESO PLANTA";
        evidencia.ARCHIVO = fotoUrl;
        evidencia.ENVIADO = 0;                // pendiente de envío
        evidencia.TIPO_EVIDENCIA = constantes.tipoEvidencia.ingresoPlanta;
        evidencia.EVIDENCIA_COORDENADA_X = latitud;
        evidencia.EVIDENCIA_COORDENADA_Y = longitud;

        console.log(evidencia);

        // 1) Borrar evidencia anterior (si existe) para esa guía/tipo
        DATOS_borra_evidencia_guia(evidencia, function () {
            // 2) Insertar la nueva evidencia
            DATOS_guardar_evidencia_guia(evidencia, function () {
                console.log("guarda");
                pendientes--;

                // Cuando termina la última inserción
                if (pendientes === 0) {
                    // Cambiamos la imagen en pantalla por la foto capturada
                    $$("#imagen_confirma_planta").attr("src", fotoUrl);

                    // Trazabilidad simple: CAPTURA_EVIDENCIA_INGRESO_PLANTA
                    (async () => {
                        try {
                            app.dialog.progress("Cargando...");

                            let datos = await generarDataTrazabilidad(
                                TipoAccionTypes.CAPTURA_EVIDENCIA_INGRESO_PLANTA,
                                Obtener_dato_local('user_activo'),
                                {
                                    cantidadGuias: guias.length,
                                    foto: fotoUrl
                                }
                            );

                            await obtenerUbicacionEInsertarLog(
                                Obtener_dato_local('user_activo'),
                                datos
                            );
                        } catch (e) {
                            console.error(e);
                        } finally {
                            app.dialog.close();
                            capturandoIngresoPlanta = false;
                            app.dialog.alert(
                                "Evidencia de ingreso a planta registrada para todas las guías pendientes.",
                                "GFE"
                            );
                        }
                    })();
                }
            });
        });
    });
}

function confirmarIngresoPlanta() {
    app.dialog.confirm(
        "¿Está seguro que desea confirmar el ingreso planta?. Se requiere una conexión a Internet activa",
        "GFE",
        async function () {

            // 1) Bloquear si versión app inválida
            const versionInvalida = parseInt(Obtener_dato_local("version_app_invalida") || "0");
            if (versionInvalida === 1) {
                app.dialog.alert(
                    "La versión de la aplicación instalada no es la última vigente. " +
                    "Actualice la app antes de confirmar el ingreso a planta.",
                    "Actualización requerida"
                );
                return false;
            }

            // 2) Validar conexión básica
            if (checkConnection() == "No network connection") {
                app.dialog.alert("No hay conexión a Internet", "GFE");
                return false;
            }

            // 3) Mostrar un único preloader y envolver TODO en try/finally
            app.dialog.preloader("Informando despacho planta...");

            try {
                // 3.1) Promisificar comprueba_conexion
                const result_conexion = await new Promise((resolve) => {
                    comprueba_conexion("0", function (res) {
                        resolve(res);
                    });
                });

                if (result_conexion != 1) {
                    app.dialog.alert("No se pudo establecer la conexión con el servidor.", "GFE");
                    return;
                }

                // 3.2) Validar evidencias locales
                const validacion = await validarEvidenciasIngresoPlantaLocales();
                if (!validacion.valido) {
                    app.dialog.alert(validacion.mensaje, "GFE");
                    return;
                }

                // 3.3) Cambiar texto del preloader y enviar al servidor


                const response = await enviarConfirmacionIngresoPlantaService();
                console.log("[INGRESO] Resultado final:", response);

                app.dialog.alert(
                    `Proceso finalizado. Total: ${response.total}, ` +
                    `exitosos: ${response.exitosos}, errores: ${response.erroneos}.`,
                    "GFE", function () {
                        ir_atras_boton();
                    }
                );
            } catch (ex) {
                const errorMessage = ex && ex.message ? ex.message : ex;
                console.error("[INGRESO] Error en confirmarIngresoPlanta:", ex);
                app.dialog.alert(
                    `Ocurrió un error durante el proceso: ${errorMessage}`,
                    "GFE"
                );
            } finally {
                // Pase lo que pase, cerramos el preloader
                try {
                    app.dialog.close();
                } catch (e) {
                    // Por si no hay diálogos abiertos, no queremos reventar aquí
                    console.warn("No había diálogo que cerrar:", e);
                }
            }
        }
    );
}

