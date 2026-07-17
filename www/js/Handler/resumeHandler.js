let appStartTime = Date.now(); // Hora real al iniciar la app
let elapsedTime = 0;           // Tiempo acumulado por el reloj interno
const THRESHOLD = 5000; // Umbral de 5 segundos
// Función para inicializar el evento resume
async function manejarResumeInteractivo() {

        const usuarioActivo = Obtener_dato_local("user_activo");
        if (usuarioActivo && usuarioActivo != "") {
            if (typeof seguimientoSqliteLista !== "undefined" && seguimientoSqliteLista &&
                typeof inicializarProgramadorEnvioSeguimiento === "function") {
                inicializarProgramadorEnvioSeguimiento();
                solicitarEnvioSeguimiento("inicio_o_resume", true);
            }


            let intentos = 0;
            let resultadoUbicacionSimulada = await detectarUbicacionSimulada();

            do {

                if (resultadoUbicacionSimulada.esUbicacionSimulada) {

                    if (intentos === 0) {
                        const id_gde_actual = Obtener_dato_local("id_proceso_activo");
                        let adicionales = {
                            rol: null,
                            despacho: null,
                            id_unico_movil_gde: null,
                            resultadoUbicacionSimulada: resultadoUbicacionSimulada
                        };

                        // Solo obtenemos datos si procesoActual existe
                        if (id_gde_actual) {
                            try {
                                const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
                                if (gde_actual) {
                                    adicionales = {
                                        rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                                        despacho: gde_actual,
                                        id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null,
                                        resultadoUbicacionSimulada: resultadoUbicacionSimulada
                                    };
                                }
                            } catch (error) {
                                console.error("Error obteniendo GDE:", error);
                            }
                        }

                        let datos = await generarDataTrazabilidad(
                            TipoAccionTypes.UTILIZA_UBICACION_SIMULADA,
                            Obtener_dato_local('user_activo'),
                            adicionales
                        );

                        await obtenerUbicacionEInsertarLog(
                            Obtener_dato_local('user_activo'),
                            datos
                        );

                    }

                    // Cerramos cualquier diálogo previo para evitar errores
                    try {
                        app.dialog.close();
                    } catch (e) {
                        console.warn("No había diálogos abiertos.");
                    }

                    // Mostramos el cuadro de diálogo y esperamos hasta que el usuario presione "Confirmar"
                    await new Promise((resolve) => {
                        app.dialog.alert(
                            'Se detectó ubicación adulterada... Debe utilizar la ubicación real para poder continuar.',
                            "GFE Proveedores",
                            async function () {
                                app.dialog.progress("Cargando..."); // Mostrar progreso mientras se verifica la nueva ubicación
                                setTimeout(async () => {
                                    resultadoUbicacionSimulada = await detectarUbicacionSimulada();
                                    app.dialog.close(); // Cerramos el progreso después de validar
                                    resolve(); // Salimos del Promise y el ciclo continúa si sigue siendo Fake GPS
                                }, 1500); // Pequeña espera para evitar consultas instantáneas
                            }
                        );
                    });

                    intentos++; // Contamos los intentos
                }

            } while (resultadoUbicacionSimulada.esUbicacionSimulada); // Solo salimos cuando la ubicación es real


            handleTimeChange();
        }
}

// Función para manejar el cambio de hora
function handleTimeChange(menuPrincipal = false) {
    const fecha_hora = FechaHoraActual();

    validateAutomaticDateTimeZone((isAutomatic) => {
        if (isAutomatic) {
            dispatchTimeChangeEvent(true, "Configuración automática activa", menuPrincipal);
        } else {

            dispatchTimeChangeEvent(false, `(${fecha_hora}) Se ha detectado que la configuración de fecha/hora NO está en automático. Favor configurar la fecha/hora en automático.`, menuPrincipal);
        }
    });

    /*comparar_fecha_hora_ws(fecha_hora, function (result_fecha) {
        if (result_fecha == 0) {
            // Hora incorrecta según el servidor
            dispatchTimeChangeEvent(
                false,
                `Se ha detectado que la hora está incorrecta (${fecha_hora}). Favor configurar la fecha/hora en automático.`,
                menuPrincipal
            );

        } else if (result_fecha === -1) {
            // No hay conexión: Validar configuración automática

        } else {
            // Hora correcta según el servidor
            dispatchTimeChangeEvent(true, "Hora correcta según el servidor");
        }
    });*/
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
    const id_gde_actual = Obtener_dato_local("id_proceso_activo");
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
                if (anulaGuia && parseInt(anulaGuia.PAG_VALOR) === 1) {
                    const datosUbicacion = await getLocation2();
                    await ControlServiceAnular(
                        procesoActual,
                        datosUbicacion.GPS_LAT,
                        datosUbicacion.GPS_LON,
                        "",
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




