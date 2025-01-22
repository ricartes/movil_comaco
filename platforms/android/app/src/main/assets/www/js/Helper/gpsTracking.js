// Variables globales para el rastreo de ubicación
let isTrackingEnabled = false;
let lastKnownLocation = null;

// Configura el plugin
function configureBackgroundGeolocation() {





    BackgroundGeolocation.configure(
        {
            desiredAccuracy: 10, // Alta precisión
            stationaryRadius: 5, // Radio para estado estacionario
            distanceFilter: 10, // Distancia mínima entre actualizaciones
            debug: false, // Notificaciones de depuración desactivadas
            interval: 10000, // Actualización cada 10 segundos (deseado)
            fastestInterval: 5000, // No más rápido que cada 5 segundos
            activitiesInterval: 10000, // Revisión de actividad cada 10 segundos
            stopOnTerminate: false, // Continúa en segundo plano
            startOnBoot: true, // Comienza automáticamente tras reiniciar
        },
        function (state) {

        },
        function (error) {
            //alert(error);
            alert("Error en la configuración del plugin:", error);
        }
    );

    // Maneja actualizaciones de ubicación
    BackgroundGeolocation.on('location', async function (location) {
        try {
            lastKnownLocation = location;

            // Guardar ubicación en la base de datos
            await saveLocation(location);

            // Indica que la ubicación ha sido procesada
            BackgroundGeolocation.finish();
        } catch (error) {
            console.error("Error al procesar la ubicación:", error);

            // Asegúrate de llamar a `finish` incluso si ocurre un error
            BackgroundGeolocation.finish();
        }
    });

    BackgroundGeolocation.on('stationary', function (stationaryLocation) {
        if (stationaryLocation.accuracy && stationaryLocation.accuracy <= 20) {
            alert("Ubicación estacionaria válida:", stationaryLocation);
        } else {
            alert("Ubicación estacionaria ignorada por baja precisión:", stationaryLocation);
        }
    });



    // Manejo de errores
    BackgroundGeolocation.on('error', function (error) {
        console.error("Error durante el rastreo:", error);
    });
}

// Función para iniciar el rastreo
function startTracking() {
    if (isTrackingEnabled) {
        console.log("El rastreo ya está habilitado.");
        return;
    }


    BackgroundGeolocation.checkStatus(function (status) {
        console.log('[INFO] BackgroundGeolocation service is running', status.isRunning);
        console.log('[INFO] BackgroundGeolocation services enabled', status.locationServicesEnabled);
        console.log('[INFO] BackgroundGeolocation auth status: ' + status.authorization);

        // you don't need to check status before start (this is just the example)

        if (!status.isRunning) {
            BackgroundGeolocation.start(); //triggers start on start event
        }
    });

    /*BackgroundGeolocation.start(() => {
        isTrackingEnabled = true;
        alert("Rastreo de ubicación iniciado.");
    });*/
}

// Función para detener el rastreo
function stopTracking() {
    if (!isTrackingEnabled) {
        console.log("El rastreo ya está deshabilitado.");
        return;
    }
    BackgroundGeolocation.removeAllListeners();
    BackgroundGeolocation.stop();
}

// Obtener la última ubicación registrada
function getLastKnownLocation() {
    if (lastKnownLocation) {
        // Usar esUbicacionAntigua para validar la antigüedad
        if (esUbicacionAntigua(lastKnownLocation.timestamp)) {
            console.warn("La última ubicación conocida es antigua. Obteniendo una nueva ubicación...");

            // Solicitar una nueva ubicación y actualizar lastKnownLocation
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        lastKnownLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            timestamp: position.timestamp
                        };
                        resolve(lastKnownLocation); // Retorna la nueva ubicación
                    },
                    (error) => {
                        console.error("Error al obtener la nueva ubicación:", error.message);
                        reject(error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            });
        } else {
            // La ubicación es válida
            return Promise.resolve(lastKnownLocation);
        }
    } else {
        console.warn("No se ha registrado ninguna ubicación aún. Intentando obtener una nueva ubicación...");

        // Solicitar una nueva ubicación si no hay una conocida
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    lastKnownLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        timestamp: position.timestamp
                    };
                    resolve(lastKnownLocation); // Retorna la nueva ubicación
                },
                (error) => {
                    console.error("Error al obtener la nueva ubicación:", error.message);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }
}


// Función para guardar la ubicación en una base de datos o API
async function saveLocation(location) {
    // Aquí implementa la lógica para almacenar la ubicación

    const procesoActual = Obtener_dato_local("id_proceso_activo");
    const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
    if (procesoActual && procesoActual !== "") {
        let datos = await generarDataTrazabilidad(
            TipoAccionTypes.CAPTURA_UBICACION,
            Obtener_dato_local('user_activo'),
            {
                rol: gdeRol,
                despacho: gde_actual,
                id_unico_movil_gde: gde_actual?.ID_UNICO_MOVIL ?? null
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local('user_activo'),
            datos,
            location
        );
    }

}

// Validar si la ubicación es antigua
function esUbicacionAntigua(timestamp) {
    const ahora = new Date().getTime();
    const tiempoUbicacion = new Date(timestamp).getTime();
    const diferenciaMinutos = (ahora - tiempoUbicacion) / (1000 * 60); // Diferencia en minutos
    return diferenciaMinutos > 10; // Retorna true si supera los 10 minutos
}
