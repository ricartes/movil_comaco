// Variables globales para el rastreo de ubicación
let isTrackingEnabled = false;
let lastKnownLocation = null;
let ultimoTimestamp = null;
let ultimoGuardadoMs = 0;

const ultimaUbicacionPorGuia = new Map();

// Umbrales de tiempo (en ms)
const UMBRAL_MS_GDE_ACTUAL = 10 * 1000;        // 10 segundos
const UMBRAL_MS_GUIA_NO_CONFIRMADA = 30 * 1000; // 30 segundos

// Distancia mínima para considerar que hubo movimiento relevante (en metros)
const DISTANCIA_MINIMA_MOVIMIENTO = 10; // puedes bajar a 5 si quieres más detalle


// Configura el plugin
function configureBackgroundGeolocation() {


    BackgroundGeolocation.configure({
        locationProvider: BackgroundGeolocation.RAW_PROVIDER, // O RAW_PROVIDER si quieres full precisión
        desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY, // Máxima precisión GPS
        stationaryRadius: 10,      // 10 metros: si se mueve menos, se considera quieto
        distanceFilter: 10,        // mínimo 10 metros entre puntos
        interval: 10000,           // intenta actualizar cada 10 segundos
        fastestInterval: 5000,     // nunca más rápido que cada 5 segundos
        activitiesInterval: 10000, // chequea actividad cada 10 segundos
        debug: false,
        stopOnTerminate: false,
        startOnBoot: true
    });


    // Maneja actualizaciones de ubicación
    BackgroundGeolocation.on('location', async function (location) {
        try {
            const { latitude, longitude, speed, time } = location;
            const ahoraMs = Date.now();

            if (ultimoTimestamp && time === ultimoTimestamp) {
                return;
            }

            // Filtro por tiempo: mínimo 10s entre registros guardados
            if (ultimoGuardadoMs && (ahoraMs - ultimoGuardadoMs) < 10000) {
                return;
            }

            if (lastKnownLocation) {
                const distancia = calcularDistanciaMetros(
                    latitude,
                    longitude,
                    lastKnownLocation.latitude,
                    lastKnownLocation.longitude
                );


                if (speed <= 0 && distancia < 1) {

                    return;
                }
            }
            lastKnownLocation = location;
            ultimoTimestamp = time;
            ultimoGuardadoMs = ahoraMs;

            // Guardar ubicación en la base de datos
            await saveLocation(location);

            // Indica que la ubicación ha sido procesada
            return;
        } catch (error) {
            console.error("Error al procesar la ubicación:", error);

            // Asegúrate de llamar a `finish` incluso si ocurre un error
            return;
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
// Función para guardar la ubicación en una base de datos o API
async function saveLocation(location) {
    const usuarioActivo = Obtener_dato_local('user_activo');
    const procesoActual = Obtener_dato_local("id_proceso_activo");
    const guiasNoConfirmadas = await listarGdeProveedorNoConfirmadas();

    // 1) Guía/proceso actual
    if (procesoActual && procesoActual !== "") {
        const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
        const idUnicoActual = gde_actual?.ID_UNICO_MOVIL ?? null;

        if (idUnicoActual && puedeRegistrarParaGuia(idUnicoActual, location, UMBRAL_MS_GDE_ACTUAL)) {
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.CAPTURA_UBICACION,
                usuarioActivo,
                {
                    rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                    despacho: gde_actual,
                    id_unico_movil_gde: idUnicoActual
                }
            );

            await obtenerUbicacionEInsertarLog(
                usuarioActivo,
                datos,
                location
            );
        }
    }

    // 2) Guías no confirmadas
    if (Array.isArray(guiasNoConfirmadas) && guiasNoConfirmadas.length > 0) {
        for (const guia of guiasNoConfirmadas) {
            const idUnicoGuia = guia?.ID_UNICO_MOVIL ?? null;
            if (!idUnicoGuia) continue;

            // Solo registramos si pasó suficiente tiempo y se movió lo suficiente
            if (!puedeRegistrarParaGuia(idUnicoGuia, location, UMBRAL_MS_GUIA_NO_CONFIRMADA)) {
                continue;
            }

            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.CAPTURA_UBICACION,
                usuarioActivo,
                {
                    rol: guia?.GDE_COD_ORIGEN ?? null,
                    despacho: guia,
                    id_unico_movil_gde: idUnicoGuia
                }
            );

            await obtenerUbicacionEInsertarLog(
                usuarioActivo,
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



function puedeRegistrarParaGuia(idUnicoMovilGde, location, umbralMs) {
    if (!idUnicoMovilGde) return false; // sin ID no registramos

    const ahoraMs = Date.now();
    const registroPrevio = ultimaUbicacionPorGuia.get(idUnicoMovilGde);

    if (!registroPrevio) {
        // Primera vez: siempre registramos
        ultimaUbicacionPorGuia.set(idUnicoMovilGde, {
            lat: location.latitude,
            lon: location.longitude,
            tsMs: ahoraMs,
        });
        return true;
    }

    const diffMs = ahoraMs - registroPrevio.tsMs;

    // Si no ha pasado el tiempo mínimo, no registres
    if (diffMs < umbralMs) {
        return false;
    }

    // Calcula la distancia desde el último punto guardado para ESTA guía
    const distancia = calcularDistanciaMetros(
        location.latitude,
        location.longitude,
        registroPrevio.lat,
        registroPrevio.lon
    );

    // Si se movió muy poco, no vale la pena guardar
    if (distancia < DISTANCIA_MINIMA_MOVIMIENTO) {
        return false;
    }

    // OK, actualizamos último punto y permitimos registrar
    ultimaUbicacionPorGuia.set(idUnicoMovilGde, {
        lat: location.latitude,
        lon: location.longitude,
        tsMs: ahoraMs,
    });

    return true;
}
