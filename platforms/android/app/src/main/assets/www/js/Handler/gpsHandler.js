

function inicializarGpsDiagnosticHandler() {
    cordova.plugins.diagnostic.registerLocationStateChangeHandler((state) => {
        const usuarioActivo = Obtener_dato_local("user_activo");
        if (usuarioActivo && usuarioActivo != "") {
            handleGpsStateChange(state);
        }

    });
}

let isGpsOn = null; // Variable para rastrear el estado inicial del GPS

function handleGpsStateChange(state) {


    if (state === cordova.plugins.diagnostic.locationMode.LOCATION_OFF) {
        if (isGpsOn !== false) {
            // Solo dispara el evento si el GPS estaba encendido previamente o no ha sido verificado
            isGpsOn = false;
            const event = new CustomEvent("gpsOffDetected", {
                detail: {
                    timestamp: new Date().getTime(), // Incluye un timestamp para trazabilidad
                },
            });
            document.dispatchEvent(event);
        }
    } else {
        if (isGpsOn !== true) {
            // Solo dispara el evento si el GPS estaba apagado previamente o no ha sido verificado
            isGpsOn = true;
            const event = new CustomEvent("gpsOnDetected", {
                detail: {
                    timestamp: new Date().getTime(), // Incluye un timestamp para trazabilidad
                    locationMode: state, // Incluye el estado del GPS para información adicional
                },
            });
            document.dispatchEvent(event);
        }
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


document.addEventListener("gpsOnDetected", async function (e) {

    const manejarTrazabilidadYLogs = async (adicional = {}) => {
        try {
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.DETECCION_GPS_ENCENDIDO,
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

    const procesoActual = Obtener_dato_local("id_proceso_activo");
    if (procesoActual && procesoActual !== "") {
        const gde_actual = await seleccionarGdeProveedor(id_gde_actual);

        try {
            // Manejar trazabilidad y logs
            manejarTrazabilidadYLogs({
                rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                despacho: gde_actual,
                id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
            });


        } catch (error) {
            console.error("Error en ControlServiceAnular:", error);
        }
    } else {
        // Ejecutar trazabilidad sin datos adicionales
        manejarTrazabilidadYLogs();
    }

});

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

        const anulaGuia = await Datos_seleccionarParametroGeneralAsync(constantes.empresaPredeterminada, constantes.parametroDetieneProcesoApagaGPS); // Este valor debería determinarse dinámicamente según la validación
        try {
            // Manejar trazabilidad y logs
            manejarTrazabilidadYLogs({
                rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                despacho: gde_actual,
                id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                mensaje: mensaje
            });

            // Anular la guía si corresponde
            if (parseInt(anulaGuia.PAG_VALOR) === 1) {
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
                    function () {
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

