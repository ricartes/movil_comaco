
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

    mostarOcultarMenuPrincipal(false);
    const mensaje = "Se detecto que el GPS ha sido apagado. Favor habilitar y volver a iniciar el proceso";
    app.dialog.alert(
        mensaje,
        "GFE",
        async function () {
            app.dialog.progress("Cargando...");
            const procesoActual = Obtener_dato_local("id_proceso_activo");
            if (procesoActual && procesoActual != "") {
                const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
                const datosUbicacion = await getLocation2();


                ControlServiceAnular(procesoActual, datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON, "F", "SE DETECTÓ CAMBIO DE ESTADO GPS FUERA DE LINEA").then((anula) => {
                    (async () => {
                        try {

                            let datos = await generarDataTrazabilidad(
                                TipoAccionTypes.DETECCION_GPS_APAGADO,
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


                        } catch (ex) { } finally {
                            inicializarDatosGde();
                            app.dialog.close();
                            mainView.router.navigate("/");
                        }


                    })();
                });

            } else {

                try {
                    let datos = await generarDataTrazabilidad(
                        TipoAccionTypes.DETECCION_GPS_APAGADO,
                        Obtener_dato_local("user_activo"),
                        {
                            mensaje: mensaje
                        }
                    );

                    await obtenerUbicacionEInsertarLog(
                        Obtener_dato_local("user_activo"),
                        datos
                    );
                    const rutaActual = mainView.router.currentRoute.path;
                    if (rutaActual != "/") {
                        mainView.router.navigate("/");
                    }
                } catch (ex) {

                } finally {

                    app.dialog.close();
                }
            }


        });



});
