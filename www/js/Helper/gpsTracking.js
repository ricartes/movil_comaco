// Variables globales para el rastreo de ubicación
let isTrackingEnabled = false;
let lastKnownLocation = null;
let ultimoTimestamp = null;

// Configura el plugin
function configureBackgroundGeolocation() {


    BackgroundGeolocation.configure({
        locationProvider: BackgroundGeolocation.RAW_PROVIDER, // O RAW_PROVIDER si quieres full precisión
        desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY, // Máxima precisión GPS
        stationaryRadius: 1,         // Considera "quieto" si se mueve menos de 1 metro
        distanceFilter: 1,           // Captura cada 1 metro de movimiento
        interval: 2000,              // Intenta actualizar cada 5 segundos
        fastestInterval: 2000,       // Lo más rápido que puede capturar es cada 3 segundos
        activitiesInterval: 3000,    // Verifica actividad cada 5 segundos
        debug: false,
        stopOnTerminate: false,
        startOnBoot: true
    });


    // Maneja actualizaciones de ubicación
    BackgroundGeolocation.on('location', async function (location) {
        try {
            const { latitude, longitude, speed, time } = location;

            if (ultimoTimestamp && time === ultimoTimestamp) {

                return BackgroundGeolocation.finish();
            }


            if (lastKnownLocation) {
                const distancia = calcularDistanciaMetros(
                    latitude,
                    longitude,
                    lastKnownLocation.latitude,
                    lastKnownLocation.longitude
                );


                if (speed <= 0 && distancia < 1) {

                    return BackgroundGeolocation.finish();
                }
            }
            lastKnownLocation = location;
            ultimoTimestamp = time;

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
        /*if (stationaryLocation.accuracy && stationaryLocation.accuracy <= 20) {
            alert("Ubicación estacionaria válida:", stationaryLocation);
        } else {
            alert("Ubicación estacionaria ignorada por baja precisión:", stationaryLocation);
        }*/
    });



    // Manejo de errores
    BackgroundGeolocation.on('error', function (error) {
        console.error("Error durante el rastreo:", error);
    });
}


function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const toRad = (x) => x * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
            isTrackingEnabled = true
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
    isTrackingEnabled = false;
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
    const guiasNoConfirmadas = await listarGdeProveedorNoConfirmadas();

    if (procesoActual && procesoActual !== "") {
        const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
        const datos = await generarDataTrazabilidad(
            TipoAccionTypes.CAPTURA_UBICACION,
            Obtener_dato_local('user_activo'),
            {
                rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                despacho: gde_actual,
                id_unico_movil_gde: gde_actual.ID_UNICO_MOVIL ?? null
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local('user_activo'),
            datos,
            location
        );
    }

    if (Array.isArray(guiasNoConfirmadas) && guiasNoConfirmadas.length > 0) {
        for (const guia of guiasNoConfirmadas) {
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.CAPTURA_UBICACION,
                Obtener_dato_local('user_activo'),
                {
                    rol: guia?.GDE_COD_ORIGEN ?? null,
                    despacho: guia,
                    id_unico_movil_gde: guia.ID_UNICO_MOVIL ?? null
                }
            );

            await obtenerUbicacionEInsertarLog(
                Obtener_dato_local('user_activo'),
                datos,
                location
            );
        }
    }




}

// Validar si la ubicación es antigua
function esUbicacionAntigua(timestamp) {
    const ahora = new Date().getTime();
    const tiempoUbicacion = new Date(timestamp).getTime();
    const diferenciaMinutos = (ahora - tiempoUbicacion) / (1000 * 60); // Diferencia en minutos
    return diferenciaMinutos > 10; // Retorna true si supera los 10 minutos
}
