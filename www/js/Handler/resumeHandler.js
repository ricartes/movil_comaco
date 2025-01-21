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
function handleTimeChange(menuPrincipal = false) {
    const fecha_hora = FechaHoraActual();

    comparar_fecha_hora_ws(fecha_hora, function (result_fecha) {
        if (result_fecha == 0) {
            // Hora incorrecta según el servidor
            dispatchTimeChangeEvent(
                false,
                `Se ha detectado que la hora está incorrecta (${fecha_hora}). Favor configurar la fecha/hora en automático.`,
                menuPrincipal
            );

        } else if (result_fecha === -1) {
            // No hay conexión: Validar configuración automática
            validateAutomaticDateTimeZone((isAutomatic) => {
                if (isAutomatic) {
                    dispatchTimeChangeEvent(true, "Configuración automática activa", menuPrincipal);
                } else {

                    dispatchTimeChangeEvent(false, `(${fecha_hora}) Se ha detectado que la configuración de fecha/hora NO está en automático. Favor configurar la fecha/hora en automático.`, menuPrincipal);
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
async function dispatchTimeChangeEvent(horaCorrecta, mensaje, menuPrincipal) {

    Guardar_dato_local("horaCorrecta", horaCorrecta);
    const event = new CustomEvent("timeChangeDetected", {
        detail: {
            horaCorrecta: horaCorrecta,
            mensaje: mensaje,
            timestamp: new Date().getTime(),
            menuPrincipal: menuPrincipal
        },
    });
    document.dispatchEvent(event);
}


document.addEventListener("timeChangeDetected", async function (e) {
    const { horaCorrecta, mensaje, menuPrincipal } = e.detail; // Accede a los datos adicionales
    const rutaActual = mainView.router.currentRoute.path;
    const procesoActual = Obtener_dato_local("id_proceso_activo");
    const manejarTrazabilidadYLogs = async (adicional = {}) => {
        try {
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.DETECCION_CAMBIO_HORA,
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

    if (!horaCorrecta) {
        if (procesoActual && procesoActual !== "") {
            const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
            const anulaGuia = await Datos_seleccionarParametroGeneralAsync(constantes.empresaPredeterminada, constantes.parametroDetieneProcesoCambioHora); // Este valor debería determinarse dinámicamente según la validación
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
                    const datosUbicacion = await getLocation2();
                    await ControlServiceAnular(
                        procesoActual,
                        datosUbicacion.GPS_LAT,
                        datosUbicacion.GPS_LON,
                        "F",
                        "SE DETECTÓ CAMBIO DE HORA DURANTE EL PROCESO"
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

            manejarTrazabilidadYLogs({ mensaje });
        }

    }
});




