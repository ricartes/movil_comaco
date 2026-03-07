// Variables globales para el rastreo de ubicación
let isTrackingEnabled = false;
let lastKnownLocation = null;
let ultimoTimestamp = null;
let ultimoGuardadoMs = 0;

const ultimaUbicacionPorGuia = new Map();

// Umbrales de tiempo (en ms)
const UMBRAL_MS_GDE_ACTUAL = 5 * 1000;        // 10 segundos
const UMBRAL_MS_GUIA_NO_CONFIRMADA = 5 * 1000; // 10 segundos
const UMBRAL_MS_GLOBAL = 5 * 1000;

// Distancia mínima para considerar que hubo movimiento relevante (en metros)
const DISTANCIA_MINIMA_MOVIMIENTO = 2; // puedes bajar a 5 si quieres más detalle


// Configura el plugin
function configureBackgroundGeolocation() {


    BackgroundGeolocation.configure({
        locationProvider: BackgroundGeolocation.RAW_PROVIDER, // O RAW_PROVIDER si quieres full precisión
        desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY, // Máxima precisión GPS
        stationaryRadius: 5,      // 10 metros: si se mueve menos, se considera quieto
        distanceFilter: 5,        // mínimo 10 metros entre puntos
        interval: 5000,           // intenta actualizar cada 10 segundos
        fastestInterval: 5000,     // nunca más rápido que cada 5 segundos
        activitiesInterval: 10000, // chequea actividad cada 10 segundos
        debug: false,
        stopOnTerminate: false,
        startOnBoot: true
    });


    // Maneja actualizaciones de ubicación
    BackgroundGeolocation.on('location', async function (location) {
        try {
            console.log('[BG] location recibida:', JSON.stringify(location));

            const { latitude, longitude, speed, time } = location;
            const ahoraMs = Date.now();

            console.log('[BG] ultimoTimestamp:', ultimoTimestamp, 'time actual:', time);
            if (ultimoTimestamp && time === ultimoTimestamp) {
                console.log('[BG] DESCARTA -> mismo timestamp que el anterior');
                return;
            }

            // Filtro por tiempo: mínimo 10s entre registros guardados
            if (ultimoGuardadoMs && (ahoraMs - ultimoGuardadoMs) < UMBRAL_MS_GLOBAL) {
                console.log('[BG] DESCARTA -> menos de 10s desde el último guardado');
                return;
            }

            if (lastKnownLocation) {
                const distancia = calcularDistanciaMetros(
                    latitude,
                    longitude,
                    lastKnownLocation.latitude,
                    lastKnownLocation.longitude
                );
                console.log('[BG] distancia respecto al último punto:', distancia, 'm, speed:', speed);

                if (speed <= 0 && distancia < 1) {
                    console.log('[BG] DESCARTA -> quieto y distancia < 1m');
                    return;
                }
            }

            console.log('[BG] ACEPTA -> actualiza lastKnownLocation y guarda');
            lastKnownLocation = location;
            ultimoTimestamp = time;
            ultimoGuardadoMs = ahoraMs;

            await saveLocation(location);

            console.log('[BG] saveLocation() completó OK');
            return;
        } catch (error) {
            console.error("Error al procesar la ubicación:", error);
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
        console.log("[TRACKING] ya está activo");
        return;
    }

    BackgroundGeolocation.start();

    isTrackingEnabled = true;

    console.log("[TRACKING] iniciado");

    // obtener ubicación inicial inmediatamente
    BackgroundGeolocation.getCurrentLocation(
        function (location) {
            console.log("[GPS] ubicación inicial:", location);
        },
        function (error) {
            console.warn("[GPS] error ubicación inicial:", error);
        },
        {
            maximumAge: 0,
            timeout: 10000,
            enableHighAccuracy: true
        }
    );
}

// Función para detener el rastreo
function stopTracking() {
    if (!isTrackingEnabled) {
        console.log("[TRACKING] El rastreo ya está deshabilitado.");
        return;
    }

    BackgroundGeolocation.stop();
    isTrackingEnabled = false;
    console.log("[TRACKING] BackgroundGeolocation detenido.");
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


async function saveLocation(location) {
    const usuarioActivo = Obtener_dato_local('user_activo');
    const procesoActual = Obtener_dato_local("id_proceso_activo");
    const guiasNoConfirmadas = await listarGdeProveedorNoConfirmadas();

    console.log('[SAVE] usuarioActivo:', usuarioActivo);
    console.log('[SAVE] procesoActual:', procesoActual);
    console.log('[SAVE] guiasNoConfirmadas length:', Array.isArray(guiasNoConfirmadas) ? guiasNoConfirmadas.length : 'NO ARRAY');
    console.log('[SAVE] location usada:', location);

    // 1) Guía/proceso actual
    if (procesoActual && procesoActual !== "") {
        const gde_actual = await seleccionarGdeProveedor(id_gde_actual);
        const idUnicoActual = gde_actual?.ID_UNICO_MOVIL ?? null;

        console.log('[SAVE] GDE actual:', gde_actual);
        console.log('[SAVE] idUnicoActual:', idUnicoActual);

        if (idUnicoActual && puedeRegistrarParaGuia(idUnicoActual, location, UMBRAL_MS_GDE_ACTUAL)) {
            console.log('[SAVE] -> REGISTRA para guía ACTUAL', idUnicoActual);
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.CAPTURA_UBICACION,
                usuarioActivo,
                {
                    rol: gde_actual?.GDE_COD_ORIGEN ?? null,
                    despacho: gde_actual,
                    id_unico_movil_gde: idUnicoActual
                }
            );

            await obtenerUbicacionEInsertarLog(usuarioActivo, datos, location);
            console.log('[SAVE] Insert trazabilidad guía ACTUAL OK');
        } else {
            console.log('[SAVE] NO registra para guía ACTUAL (puedeRegistrarParaGuia = false)');
        }
    }

    // 2) Guías no confirmadas
    if (Array.isArray(guiasNoConfirmadas) && guiasNoConfirmadas.length > 0) {
        for (const guia of guiasNoConfirmadas) {
            const idUnicoGuia = guia?.ID_UNICO_MOVIL ?? null;
            if (!idUnicoGuia) continue;

            console.log('[SAVE] Evaluando guía NO CONFIRMADA:', idUnicoGuia);

            if (!puedeRegistrarParaGuia(idUnicoGuia, location, UMBRAL_MS_GUIA_NO_CONFIRMADA)) {
                console.log('[SAVE] NO registra para guía', idUnicoGuia, '(puedeRegistrarParaGuia = false)');
                continue;
            }

            console.log('[SAVE] -> REGISTRA para guía NO CONFIRMADA', idUnicoGuia);

            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.CAPTURA_UBICACION,
                usuarioActivo,
                {
                    rol: guia?.GDE_COD_ORIGEN ?? null,
                    despacho: guia,
                    id_unico_movil_gde: idUnicoGuia
                }
            );

            await obtenerUbicacionEInsertarLog(usuarioActivo, datos, location);
            console.log('[SAVE] Insert trazabilidad guía', idUnicoGuia, 'OK');
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
    if (!idUnicoMovilGde) {
        console.log('[FILTRO] SIN idUnicoMovilGde -> false');
        return false;
    }

    const ahoraMs = Date.now();
    const registroPrevio = ultimaUbicacionPorGuia.get(idUnicoMovilGde);

    if (!registroPrevio) {
        console.log('[FILTRO] Primera vez para', idUnicoMovilGde, '-> true');
        ultimaUbicacionPorGuia.set(idUnicoMovilGde, {
            lat: location.latitude,
            lon: location.longitude,
            tsMs: ahoraMs,
        });
        return true;
    }

    const diffMs = ahoraMs - registroPrevio.tsMs;
    console.log('[FILTRO] diffMs:', diffMs, 'umbralMs:', umbralMs);

    if (diffMs < umbralMs) {
        console.log('[FILTRO] Rechazado por tiempo (< umbralMs)');
        return false;
    }

    const distancia = calcularDistanciaMetros(
        location.latitude,
        location.longitude,
        registroPrevio.lat,
        registroPrevio.lon
    );
    console.log('[FILTRO] distancia:', distancia, 'm');

    if (distancia < DISTANCIA_MINIMA_MOVIMIENTO) {
        console.log('[FILTRO] Rechazado por poca distancia (<', DISTANCIA_MINIMA_MOVIMIENTO, 'm)');
        return false;
    }

    console.log('[FILTRO] ACEPTA -> actualiza último punto de', idUnicoMovilGde);
    ultimaUbicacionPorGuia.set(idUnicoMovilGde, {
        lat: location.latitude,
        lon: location.longitude,
        tsMs: ahoraMs,
    });

    return true;
}






async function validarRequisitosTrackingCordova() {
    const diagnostic = cordova.plugins?.diagnostic;

    const resultado = {
        ok: false,
        gpsActivo: false,
        permisoUbicacion: false,
        permisoBackground: false,
        permisoNotificaciones: true,
        mensajes: [],
    };

    if (!diagnostic) {
        resultado.mensajes.push("Plugin diagnostic no disponible.");
        return resultado;
    }

    function getPermissionStatus(permission) {
        return new Promise((resolve, reject) => {
            diagnostic.getPermissionAuthorizationStatus(resolve, reject, permission);
        });
    }

    function requestRuntimePermission(permission) {
        return new Promise((resolve, reject) => {
            diagnostic.requestRuntimePermission(resolve, reject, permission);
        });
    }

    function requestLocationAuthorization(mode) {
        return new Promise((resolve, reject) => {
            diagnostic.requestLocationAuthorization(resolve, reject, mode);
        });
    }

    function isLocationEnabled() {
        return new Promise((resolve, reject) => {
            diagnostic.isLocationEnabled(resolve, reject);
        });
    }

    function isGpsLocationEnabled() {
        return new Promise((resolve, reject) => {
            diagnostic.isGpsLocationEnabled(resolve, reject);
        });
    }

    try {
        const locationEnabled = await isLocationEnabled();
        const gpsEnabled = await isGpsLocationEnabled();

        resultado.gpsActivo = !!(locationEnabled && gpsEnabled);

        if (!resultado.gpsActivo) {
            resultado.mensajes.push("GPS o ubicación del dispositivo desactivada.");
        }

        let statusFine = await getPermissionStatus(diagnostic.permission.ACCESS_FINE_LOCATION);

        if (
            statusFine !== diagnostic.permissionStatus.GRANTED &&
            statusFine !== diagnostic.permissionStatus.GRANTED_WHEN_IN_USE
        ) {
            statusFine = await requestRuntimePermission(diagnostic.permission.ACCESS_FINE_LOCATION);
        }

        resultado.permisoUbicacion =
            statusFine === diagnostic.permissionStatus.GRANTED ||
            statusFine === diagnostic.permissionStatus.GRANTED_WHEN_IN_USE;

        if (!resultado.permisoUbicacion) {
            resultado.mensajes.push("Permiso de ubicación no concedido.");
        }

        let statusBackground = null;
        try {
            statusBackground = await getPermissionStatus(diagnostic.permission.ACCESS_BACKGROUND_LOCATION);
        } catch (e) {
            console.warn("[TRACKING] No se pudo consultar ACCESS_BACKGROUND_LOCATION", e);
        }

        if (statusBackground !== diagnostic.permissionStatus.GRANTED) {
            try {
                statusBackground = await requestLocationAuthorization(
                    diagnostic.locationAuthorizationMode.ALWAYS
                );
            } catch (e) {
                console.warn("[TRACKING] No se pudo solicitar permiso ALWAYS", e);
            }
        }

        resultado.permisoBackground =
            statusBackground === diagnostic.permissionStatus.GRANTED ||
            statusBackground === diagnostic.permissionStatus.GRANTED_ALWAYS;

        if (!resultado.permisoBackground) {
            resultado.mensajes.push("Permiso de ubicación en segundo plano no concedido.");
        }

        try {
            let statusNotif = await getPermissionStatus(diagnostic.permission.POST_NOTIFICATIONS);

            if (statusNotif !== diagnostic.permissionStatus.GRANTED) {
                statusNotif = await requestRuntimePermission(diagnostic.permission.POST_NOTIFICATIONS);
            }

            resultado.permisoNotificaciones =
                statusNotif === diagnostic.permissionStatus.GRANTED;

            if (!resultado.permisoNotificaciones) {
                resultado.mensajes.push("Permiso de notificaciones no concedido.");
            }
        } catch (e) {
            console.warn("[TRACKING] POST_NOTIFICATIONS no aplica o no se pudo consultar", e);
            resultado.permisoNotificaciones = true;
        }

        resultado.ok =
            resultado.gpsActivo &&
            resultado.permisoUbicacion &&
            resultado.permisoBackground &&
            resultado.permisoNotificaciones;

        return resultado;
    } catch (error) {
        console.error("[TRACKING] Error validando requisitos:", error);
        resultado.mensajes.push("Error al validar requisitos del tracking.");
        return resultado;
    }
}