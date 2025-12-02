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
// 5) Crear una evidencia por cada GDE y reutilizar fotos.js
async function guardarEvidenciasIngresoPlanta(latitud, longitud) {
    const guias = evidenciaIngresoContext.guias || [];
    const fotoUrl = evidenciaIngresoContext.fotoUrl;

    if (!guias.length) {
        capturandoIngresoPlanta = false;
        return;
    }

    capturandoIngresoPlanta = true;
    app.dialog.progress("Cargando...");

    const anuladas = [];
    const advertencias = [];

    try {
        // 1) Validar mock location UNA SOLA VEZ antes de procesar guías
        // Usamos la primera guía como referencia para trazabilidad
        const gdeReferencia = guias[0] || null;
        await validarUbicacionNoSimuladaGlobal(gdeReferencia);

        // 2) Procesar guías una por una
        for (const gde of guias) {
            // 2.1) Guardar evidencia (borrar + insertar) para esta guía
            const evidenciaIdUnico = await new Promise((resolve, reject) => {
                const evidencia = new CL_GDE_Evidencia();
                evidencia.ID_UNICO_MOVIL = "evid_gde" + obtener_IDUNICO();

                evidencia.ID_GDE = gde.ROWID;
                evidencia.ID_UNICO_MOVIL_GDE = gde.ID_UNICO_MOVIL;
                evidencia.GDE_ESTADO_MOVIL = "B";
                evidencia.FECHA_EVIDENCIA = "";
                evidencia.OBSERVACION = "EVIDENCIA CONFIRMA INGRESO PLANTA";
                evidencia.ARCHIVO = fotoUrl;
                evidencia.ENVIADO = 0;
                evidencia.TIPO_EVIDENCIA = constantes.tipoEvidencia.ingresoPlanta;
                evidencia.EVIDENCIA_COORDENADA_X = latitud;
                evidencia.EVIDENCIA_COORDENADA_Y = longitud;

                DATOS_borra_evidencia_guia(evidencia, function () {
                    DATOS_guardar_evidencia_guia(evidencia, function () {
                        resolve(evidencia.ID_UNICO_MOVIL);
                    }, reject);
                }, reject);
            });

            // 2.2) Trazabilidad CAPTURA_EVIDENCIA_INGRESO_PLANTA (por guía)
            const datosCap = await generarDataTrazabilidad(
                TipoAccionTypes.CAPTURA_EVIDENCIA_INGRESO_PLANTA,
                Obtener_dato_local("user_activo"),
                {
                    cantidadGuias: guias.length,
                    foto: fotoUrl,
                    rol: gde?.GDE_COD_ORIGEN ?? null,
                    despacho: gde,
                    id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
                }
            );

            await obtenerUbicacionEInsertarLog(
                Obtener_dato_local("user_activo"),
                datosCap
            );

            // 2.3) Geocerca por guía (SIN mock location aquí, ya se validó antes)
            let geoRes = {
                anulada: false,
                advertencia: false,
                mensaje: null
            };

            if (configuracionGeocercas.habilitado &&
                configuracionGeocercas.habilitadoPorAccion.evidenciaIngresoPlanta) {

                geoRes = await procesarGeocercaIngresoPlantaPorGuia(gde, evidenciaIdUnico);
            }

            // Solo guardamos resumen en memoria para mostrar mensaje.
            // NO anulamos todavía; eso se hace en confirmarIngresoPlanta.
            if (geoRes.anulada) {
                anuladas.push({ gde, mensaje: geoRes.mensaje });
            } else if (geoRes.advertencia) {
                advertencias.push({ gde, mensaje: geoRes.mensaje });
            }
        }

        // 3) Al final, actualizar imagen y mostrar resumen global
        $$("#imagen_confirma_planta").attr("src", fotoUrl);

        let mensajeFinal =
            "Evidencia de ingreso a planta registrada para todas las guías procesadas.";

        if (anuladas.length) {
            mensajeFinal +=
                `\n\n${anuladas.length} guía(s) se encuentran FUERA de geocerca ` +
                `y serán anuladas al confirmar ingreso planta.`;
        }

        if (advertencias.length) {
            mensajeFinal +=
                `\n\n${advertencias.length} guía(s) presentan ADVERTENCIA de geocerca. ` +
                `Se recomienda revisar su posición antes de confirmar.`;
        }

        app.dialog.alert(mensajeFinal, "GFE");

    } catch (error) {
        console.error("Error en flujo de ingreso a planta:", error);
        app.dialog.alert(
            "Ocurrió un error al registrar las evidencias de ingreso a planta. Intente nuevamente.",
            "GFE"
        );
    } finally {
        try { app.dialog.close(); } catch { }
        capturandoIngresoPlanta = false;
    }
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

                // 3.2-bis) Aplicar anulaciones por geocerca ANTES de enviar al servidor
                const resumenGeocerca = await aplicarAnulacionPorGeocercaEnConfirmacion();

                // 3.3) Enviar al servidor las guías que queden válidas
                const response = await enviarConfirmacionIngresoPlantaService();
                console.log("[INGRESO] Resultado final:", response);

                let mensajeFinal =
                    `Proceso finalizado.\n\n` +
                    `Total: ${response.total}, exitosos: ${response.exitosos}, errores: ${response.erroneos}.`;

                if (resumenGeocerca && resumenGeocerca.anuladas > 0) {
                    mensajeFinal +=
                        `\n\nAdicionalmente, ${resumenGeocerca.anuladas} guía(s) ` +
                        `fueron anuladas por encontrarse fuera de la geocerca.`;
                }

                app.dialog.alert(
                    mensajeFinal,
                    "GFE",
                    function () {
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



async function validarUbicacionNoSimuladaGlobal(gdeReferencia) {
    let intentos = 0;
    let resultadoUbicacionSimulada = await detectarUbicacionSimulada();

    while (resultadoUbicacionSimulada.esUbicacionSimulada) {
        if (intentos === 0) {
            // Trazabilidad solo en el primer intento
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.UTILIZA_UBICACION_SIMULADA,
                Obtener_dato_local("user_activo"),
                {
                    rol: gdeReferencia?.GDE_COD_ORIGEN ?? null,
                    despacho: gdeReferencia,
                    id_unico_movil_gde: gdeReferencia?.ID_UNICO_MOVIL ?? null,
                    resultadoUbicacionSimulada
                }
            );

            await obtenerUbicacionEInsertarLog(
                Obtener_dato_local("user_activo"),
                datos
            );
        }

        // Cerramos diálogos previos por seguridad
        try { app.dialog.close(); } catch { }

        // Alerta que obliga al usuario a usar GPS real
        await new Promise((resolve) => {
            app.dialog.alert(
                "Se detectó ubicación adulterada... Debe utilizar la ubicación real para poder continuar.",
                "GFE Proveedores",
                async function () {
                    app.dialog.progress("Verificando ubicación...");
                    setTimeout(async () => {
                        resultadoUbicacionSimulada = await detectarUbicacionSimulada();
                        try { app.dialog.close(); } catch { }
                        resolve();
                    }, 1500);
                }
            );
        });

        intentos++;
    }

    // Sale del while solo cuando la ubicación ya NO es simulada
    return true;
}



async function procesarGeocercaIngresoPlantaPorGuia(gde, evidenciaIdUnico) {
    const resumen = {
        anulada: false,
        advertencia: false,
        mensaje: null,
    };

    if (!configuracionGeocercas.habilitado ||
        !configuracionGeocercas.habilitadoPorAccion.ingresoPlanta) {
        return resumen;
    }

    // 1) Validar geocerca
    const resGeo = await validarGeocerca(gde.GDE_COD_ORIGEN);
    const resultadoValidacion = resGeo.validacion;

    // 2) Validar cierre control
    const resultado = await validarCierreControl(
        resultadoValidacion,
        gde.ROWID,                      // o id_gde_actual
        constantes.tipoPunto.final
    );

    // Aquí ya asumimos que la ubicación es real (mock location validado antes)

    if (resultado.cierra) {
        resumen.anulada = true;
        resumen.mensaje = resultado.mensaje || "Guía fuera de geocerca (ingreso planta).";

        // Trazabilidad geocerca inválida (solo registramos, no anulamos aún)
        const datos = await generarDataTrazabilidad(
            TipoAccionTypes.GEOCERCA_INVALIDA,
            Obtener_dato_local("user_activo"),
            {
                rol: gde?.GDE_COD_ORIGEN ?? null,
                despacho: gde,
                id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
                contexto: "CAPTURA_EVIDENCIA_INGRESO_PLANTA"
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local("user_activo"),
            datos
        );

    } else if (resultado.advertencia) {
        resumen.advertencia = true;
        resumen.mensaje = resultado.mensaje || "Advertencia de geocerca en ingreso planta.";

        const datos = await generarDataTrazabilidad(
            TipoAccionTypes.GEOCERCA_ADVERTENCIA,
            Obtener_dato_local("user_activo"),
            {
                rol: gde?.GDE_COD_ORIGEN ?? null,
                despacho: gde,
                id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
                contexto: "CAPTURA_EVIDENCIA_INGRESO_PLANTA"
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local("user_activo"),
            datos
        );
    }

    return resumen;
}

async function aplicarAnulacionPorGeocercaEnConfirmacion() {
    const resumen = {
        total: 0,
        anuladas: 0
    };

    // Obtenemos nuevamente las guías pendientes
    const guiasPendientes = await DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas();

    if (guiasPendientes === "-1" || !Array.isArray(guiasPendientes) || guiasPendientes.length === 0) {
        return resumen;
    }

    resumen.total = guiasPendientes.length;

    for (const gde of guiasPendientes) {
        // Reutilizamos validarGeocerca + validarCierreControl,
        // pero AQUÍ sí aplicamos la anulación.
        try {
            const resGeo = await validarGeocerca(gde.GDE_COD_ORIGEN);
            const resultadoValidacion = resGeo.validacion;

            const resultado = await validarCierreControl(
                resultadoValidacion,
                gde.ROWID,
                constantes.tipoPunto.final
            );

            if (resultado.cierra) {
                // Aquí sí se anula efectivamente la guía
                const anula = await ControlServiceAnular(
                    gde.ROWID,
                    resultado.latitud,
                    resultado.longitud,
                    "",
                    `${constantes.mensajeGeocercaNoValida} (CONFIRMA INGRESO PLANTA)`
                );

                if (anula) {
                    resumen.anuladas++;

                    // Si quieres, puedes registrar una trazabilidad específica de ANULACIÓN aquí
                    // distinta a la de la captura (opcional).
                }
            }

        } catch (e) {
            console.error("Error aplicando anulación por geocerca en confirmación:", e);
        }
    }

    return resumen;
}
