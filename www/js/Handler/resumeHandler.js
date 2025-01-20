let appStartTime = Date.now(); // Hora real al iniciar la app
let elapsedTime = 0;           // Tiempo acumulado por el reloj interno
const THRESHOLD = 5000; // Umbral de 5 segundos
// Función para inicializar el evento resume
function initializeResumeHandler() {
    document.addEventListener("resume", function () {

        const usuarioActivo = Obtener_dato_local("user_activo");
        if (usuarioActivo && usuarioActivo != "") {
            handleTimeChange();
        }
    }, false);
}

// Función para manejar el cambio de hora
function handleTimeChange() {
    const fecha_hora = FechaHoraActual();
    // Validar contra el servidor
    comparar_fecha_hora_ws(fecha_hora, function (result_fecha) {
        if (result_fecha == 0) {
            // Hora incorrecta según el servidor
            dispatchTimeChangeEvent(false, "Hora incorrecta según el servidor");
        } else if (result_fecha === -1) {
            // No hay conexión: Validar configuración automática
            validateAutomaticDateTimeZone((isAutomatic) => {
                if (isAutomatic) {
                    dispatchTimeChangeEvent(true, "Configuración automática activa");
                } else {
                    dispatchTimeChangeEvent(false, "Configuración automática desactivada");
                }
            });
        } else {
            // Hora correcta según el servidor
            dispatchTimeChangeEvent(true, "Hora correcta según el servidor");
        }
    });
}

// Función para validar configuración automática
function validateAutomaticDateTimeZone(callback) {
    window.VerifyAutomaticDateTimeZone.isAutomaticChecked(function (isIt) {
        callback(isIt == "true");
    });
}

// Función para disparar eventos personalizados
async function dispatchTimeChangeEvent(horaCorrecta, mensaje) {


    Guardar_dato_local("horaCorrecta", horaCorrecta);

    const event = new CustomEvent("timeChangeDetected", {
        detail: {
            horaCorrecta: horaCorrecta,
            mensaje: mensaje,
            timestamp: new Date().getTime(), // Incluye un timestamp para trazabilidad
        },
    });
    document.dispatchEvent(event);
    console.log(`Evento disparado: ${mensaje}`);
}


document.addEventListener("timeChangeDetected", async function (e) {
    const { horaCorrecta, mensaje } = e.detail; // Accede a los datos adicionales
    mostarOcultarMenuPrincipal(horaCorrecta);
    if (!horaCorrecta) {
        app.dialog.alert(
            "Hay una diferencia de fecha/hora entre el dispositivo móvil y el servidor web. Se recomienda corroborar con el administrador. Validar si tiene habilitada la hora automática en la configuración.",
            "GFE",
            async function () {

                if (!horaCorrecta) {

                    app.dialog.progress("Cargando...");
                    const procesoActual = Obtener_dato_local("id_proceso_activo");
                    if (procesoActual && procesoActual != "") {
                        const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
                        const datosUbicacion = await getLocation2();



                        ControlServiceAnular(procesoActual, datosUbicacion.GPS_LAT, datosUbicacion.GPS_LON, "F", "SE DETECTÓ CAMBIO DE HORA DURANTE EL PROCESO").then((anula) => {
                            (async () => {
                                try {

                                    let datos = await generarDataTrazabilidad(
                                        TipoAccionTypes.DETECCION_CAMBIO_HORA,
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
                                TipoAccionTypes.DETECCION_CAMBIO_HORA,
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
                            alert(rutaActual);
                            if (rutaActual != "/") {
                                mainView.router.navigate("/");
                            }

                        } catch (ex) {

                        } finally {

                            app.dialog.close();
                        }
                    }

                }
            });


    }
});




