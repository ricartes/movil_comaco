
function inicializarGpsDiagnosticHandler() {
    cordova.plugins.diagnostic.registerLocationStateChangeHandler((state) => {
        const usuarioActivo = Obtener_dato_local("user_activo");
        if (usuarioActivo && usuarioActivo != "") {
            handleGpsStateChange(state);
        }

    });
}

function handleGpsStateChange(state) {
    if (state === cordova.plugins.diagnostic.locationMode.LOCATION_OFF) {
        const event = new CustomEvent("gpsOffDetected", {
            detail: {
                timestamp: new Date().getTime(), // Incluye un timestamp para trazabilidad
            },
        });
        document.dispatchEvent(event);
    }
}

function verificarEstadoGPS() {
    return new Promise((resolve, reject) => {
        if (typeof cordova === "undefined" || typeof cordova.plugins === "undefined") {
            reject("Cordova o el plugin 'cordova.plugins.diagnostic' no están disponibles.");
            return;
        }

        cordova.plugins.diagnostic.isLocationEnabled(
            (enabled) => {
                resolve(enabled); // Devuelve `true` si el GPS está activado, `false` si no.
            },
            (error) => {
                reject("Error al verificar el estado del GPS: " + error); // Maneja errores.
            }
        );
    });
}


document.addEventListener("gpsOffDetected", async function (e) {
    const mensaje = "Se detectó que el GPS ha sido apagado. Favor habilitar y volver a iniciar el proceso";
    const procesoActual = Obtener_dato_local("id_proceso_activo");

    // Función para manejar la trazabilidad y logs
    const manejarTrazabilidadYLogs = async (adicional = {}) => {
        try {
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.DETECCION_GPS_APAGADO,
                Obtener_dato_local("user_activo"),
                adicional
            );

            await obtenerUbicacionEInsertarLog(
                Obtener_dato_local("user_activo"),
                datos
            );
        } catch (ex) {
            console.error("Error en la trazabilidad:", ex);
        }
    };


    if (procesoActual && procesoActual !== "") {
        const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
        const datosUbicacion = await getLocation2();
        // TODO: VALIDAR PARAMETRO MOVIL PARA DETERMINAR SI DEBE ANULAR LA GUIA.
        //       SI EL PARAMETRO INDICA QUE NO SE ANULA, SOLO SE DEBE MANEJAR TRAZABILIDAD.

        const anulaGuia = true; // Este valor debería determinarse dinámicamente según la validación

        try {
            // Manejar trazabilidad y logs
            manejarTrazabilidadYLogs({
                rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                despacho: gde_actual,
                id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                mensaje: mensaje
            });

            // Anular la guía si corresponde
            if (anulaGuia) {
                await ControlServiceAnular(
                    procesoActual,
                    datosUbicacion.GPS_LAT,
                    datosUbicacion.GPS_LON,
                    "F",
                    "SE DETECTÓ CAMBIO DE ESTADO GPS FUERA DE LÍNEA"
                );

                app.dialog.alert(
                    mensaje,
                    "GFE",
                    async function () {
                        inicializarDatosGde(); // Ejecutar inicialización independientemente de errores
                        mainView.router.navigate("/"); // Navegación inmediata

                    });


            }
        } catch (error) {
            console.error("Error en ControlServiceAnular:", error);
        }
    } else {
        // Ejecutar trazabilidad sin datos adicionales
        manejarTrazabilidadYLogs({ mensaje });
    }

});

