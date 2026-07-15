// Variables globales para el rastreo de ubicación
let isTrackingEnabled = false;
let lastKnownLocation = null;
let ultimoTimestamp = null;
let ultimoGuardadoMs = 0;

const ultimaUbicacionPorGuia = new Map();
const ultimaUbicacionLegacyPorGuia = new Map();

let lastKnownLocationLegacy = null;
let ultimoTimestampLegacy = null;
let ultimoGuardadoLegacyMs = 0;
let colaCapturasGps = Promise.resolve();
let colaOperacionesGps = Promise.resolve();
let temporizadorInicioGps = null;
let inicioTrackingMs = 0;
let ultimoDiagnosticoGps = null;
let configuracionGpsEfectiva = null;

// Umbrales de tiempo (en ms)
const UMBRAL_MS_GDE_ACTUAL = 5 * 1000;        // 10 segundos
const UMBRAL_MS_GUIA_NO_CONFIRMADA = 5 * 1000; // 10 segundos
const UMBRAL_MS_GLOBAL = 5 * 1000;

// Distancia mínima para considerar que hubo movimiento relevante (en metros)
const DISTANCIA_MINIMA_MOVIMIENTO = 2; // puedes bajar a 5 si quieres más detalle


let ultimaUbicacionRecibidaMs = 0;
const UMBRAL_RESTART_SIN_UBICACION_MS = 30000; // 30 segundos


let appVisible = true;

document.addEventListener("pause", function () {
    appVisible = false;
    console.log("[APP] pause -> appVisible = false");
}, false);

document.addEventListener("resume", function () {
    appVisible = true;
    console.log("[APP] resume -> appVisible = true");
}, false);


// Configura el plugin
function configureBackgroundGeolocation() {


    Promise.resolve(BackgroundGeolocation.configure({
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
    })).then(function () {
        return registrarDiagnosticoGps();
    }).catch(function (error) {
        console.error("[TRACKING][DIAGNOSTICO] No fue posible obtener la configuración efectiva:", error);
    });


    // Maneja actualizaciones de ubicación
    BackgroundGeolocation.on('location', function (location) {
        return encolarCapturaGps(location, new Date());
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


function normalizarCapturaGps(location, fechaRecepcion) {
    if (!location || typeof location !== "object") {
        throw new Error("CAPTURA_NULA");
    }

    if (!SEGUIMIENTO_numeroFinito(location.latitude) || location.latitude < -90 || location.latitude > 90) {
        throw new Error("LATITUD_INVALIDA");
    }

    if (!SEGUIMIENTO_numeroFinito(location.longitude) || location.longitude < -180 || location.longitude > 180) {
        throw new Error("LONGITUD_INVALIDA");
    }

    if (location.time === undefined || location.time === null || location.time === "") {
        throw new Error("FECHA_CAPTURA_AUSENTE");
    }

    if (typeof location.time === "string") {
        const timeTexto = location.time.trim();
        if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(timeTexto)) {
            throw new Error("FECHA_CAPTURA_SIN_ZONA");
        }
    }

    const fechaCaptura = new Date(location.time);
    if (!Number.isFinite(fechaCaptura.getTime())) {
        throw new Error("FECHA_CAPTURA_INVALIDA");
    }

    const fechaUtc = fechaCaptura.toISOString();
    if (!fechaUtc.endsWith("Z")) {
        throw new Error("FECHA_CAPTURA_NO_UTC");
    }

    if (!SEGUIMIENTO_numeroFinito(location.accuracy) || location.accuracy < 0) {
        throw new Error("PRECISION_INVALIDA");
    }

    const fechaRecepcionMs = new Date(fechaRecepcion).getTime();
    if (!Number.isFinite(fechaRecepcionMs)) {
        throw new Error("FECHA_RECEPCION_INVALIDA");
    }

    const speed = SEGUIMIENTO_numeroFinito(location.speed) && location.speed >= 0
        ? location.speed
        : null;
    const bearing = SEGUIMIENTO_numeroFinito(location.bearing) && location.bearing >= 0 && location.bearing < 360
        ? location.bearing
        : null;
    const altitude = SEGUIMIENTO_numeroFinito(location.altitude)
        ? location.altitude
        : null;
    const mockProvider = location.isFromMockProvider === true ||
        location.isFromMockProvider === 1 ||
        location.isFromMockProvider === "1" ||
        (typeof location.isFromMockProvider === "string" && location.isFromMockProvider.toLowerCase() === "true");

    return {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: speed,
        bearing: bearing,
        altitude: altitude,
        isFromMockProvider: mockProvider,
        time: fechaUtc,
        fechaRecepcionMs: fechaRecepcionMs
    };
}

function encolarCapturaGps(location, fechaRecepcion) {
    ultimaUbicacionRecibidaMs = new Date(fechaRecepcion).getTime();

    const tarea = colaCapturasGps.then(function () {
        return procesarCapturaGps(location, fechaRecepcion);
    });

    colaCapturasGps = tarea.catch(function (error) {
        console.error("[GPS] Error controlado procesando captura:", error);
    });

    return tarea;
}

async function procesarCapturaGps(location, fechaRecepcion) {
    let captura;
    try {
        captura = normalizarCapturaGps(location, fechaRecepcion);
    } catch (error) {
        console.warn("[GPS][RECHAZO]", error && error.message ? error.message : "CAPTURA_INVALIDA");
        return { capturaValida: false, nuevoPersistido: false, legacyPersistido: false };
    }

    return await saveLocation(captura);
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
    return reconciliarEstadoGpsNativo();
}

// Función para detener el rastreo
function stopTracking() {
    cancelarInicioGpsDiferido();
    return serializarOperacionGps(async function () {
        const status = await consultarStatusGps();
        await detenerGpsSiCorresponde(status);
        return status;
    });
}

function serializarOperacionGps(operacion) {
    const tarea = colaOperacionesGps.then(operacion, operacion);
    colaOperacionesGps = tarea.catch(function (error) {
        console.error("[TRACKING] Operación GPS fallida:", error);
    });
    return tarea;
}

function consultarStatusGps() {
    return new Promise(function (resolve, reject) {
        BackgroundGeolocation.checkStatus(resolve, reject);
    });
}

function consultarConfigGps() {
    return new Promise(function (resolve, reject) {
        BackgroundGeolocation.getConfig(resolve, reject);
    });
}

function cancelarInicioGpsDiferido() {
    if (temporizadorInicioGps !== null) {
        clearTimeout(temporizadorInicioGps);
        temporizadorInicioGps = null;
        console.log("[TRACKING] Inicio GPS diferido cancelado.");
    }
}

function programarInicioGpsDiferido() {
    cancelarInicioGpsDiferido();
    temporizadorInicioGps = setTimeout(function () {
        temporizadorInicioGps = null;
        reconciliarEstadoGpsNativo().catch(function (error) {
            console.error("[TRACKING] No fue posible reconciliar el inicio GPS diferido:", error);
        });
    }, 500);
}

async function iniciarGpsSiCorresponde(status) {
    if (status.isRunning) {
        if (!isTrackingEnabled) {
            inicioTrackingMs = Date.now();
        }
        isTrackingEnabled = true;

        const referenciaActividadMs = ultimaUbicacionRecibidaMs || inicioTrackingMs;
        const sinUbicacionReciente = referenciaActividadMs &&
            (Date.now() - referenciaActividadMs) > UMBRAL_RESTART_SIN_UBICACION_MS;

        if (appVisible && sinUbicacionReciente && temporizadorInicioGps === null) {
            console.warn("[TRACKING] Servicio activo sin ubicaciones recientes; se programará una reconciliación.");
            await Promise.resolve(BackgroundGeolocation.stop());
            isTrackingEnabled = false;
            inicioTrackingMs = 0;
            programarInicioGpsDiferido();
        }
        return;
    }

    cancelarInicioGpsDiferido();
    await Promise.resolve(BackgroundGeolocation.start());
    isTrackingEnabled = true;
    inicioTrackingMs = Date.now();
    console.log("[TRACKING] BackgroundGeolocation iniciado por diferencia de estado.");
}

async function detenerGpsSiCorresponde(status) {
    cancelarInicioGpsDiferido();

    if (status.isRunning) {
        await Promise.resolve(BackgroundGeolocation.stop());
        console.log("[TRACKING] BackgroundGeolocation detenido por diferencia de estado.");
    }

    isTrackingEnabled = false;
    inicioTrackingMs = 0;
    ultimaUbicacionRecibidaMs = 0;
}

function extraerIdGuiaActiva(guia) {
    return SEGUIMIENTO_textoCapturaDisponible(guia && (
        guia.ID_UNICO_MOVIL || guia.ID_UNICO_MOVIL_GDE
    ));
}

function limpiarUltimaUbicacionGuiasInactivas(guiasActivas, limpiarTodas) {
    const idsActivos = new Set();
    (Array.isArray(guiasActivas) ? guiasActivas : []).forEach(function (guia) {
        const idGuia = extraerIdGuiaActiva(guia);
        if (idGuia) {
            idsActivos.add(idGuia.toUpperCase());
        }
    });

    [ultimaUbicacionPorGuia, ultimaUbicacionLegacyPorGuia].forEach(function (mapa) {
        limpiarMapaUltimaUbicacionGuias(mapa, idsActivos, limpiarTodas);
    });
}

function limpiarMapaUltimaUbicacionGuias(mapa, guiasActivas, limpiarTodas) {
    const idsActivos = guiasActivas instanceof Set
        ? guiasActivas
        : new Set((Array.isArray(guiasActivas) ? guiasActivas : []).map(function (guia) {
            const idGuia = extraerIdGuiaActiva(guia);
            return idGuia ? idGuia.toUpperCase() : null;
        }).filter(Boolean));

    Array.from(mapa.keys()).forEach(function (idGuia) {
        const clave = String(idGuia).trim().toUpperCase();
        if (limpiarTodas || (idsActivos.size > 0 && !idsActivos.has(clave))) {
            mapa.delete(idGuia);
        }
    });
}

async function obtenerContextoReconciliacionGps(contexto) {
    if (contexto) {
        return contexto;
    }

    const usuarioActivo = Obtener_dato_local("rut_activo");
    const procesoActual = Obtener_dato_local("id_proceso_activo");
    const guiasActivas = typeof DATOS_seleccionarGdeProveedorConfirmadas === "function"
        ? await DATOS_seleccionarGdeProveedorConfirmadas()
        : await listarGdeProveedorNoConfirmadas();
    const validacion = await validarRequisitosTrackingCordova();

    return {
        usuarioActivo: usuarioActivo,
        procesoActual: procesoActual,
        guiasActivas: Array.isArray(guiasActivas) ? guiasActivas : [],
        validacion: validacion
    };
}

async function registrarDiagnosticoGps(config, status) {
    const configEfectiva = config || configuracionGpsEfectiva || await consultarConfigGps();
    const statusEfectivo = status || await consultarStatusGps();
    configuracionGpsEfectiva = configEfectiva;

    const diagnostico = {
        locationProvider: configEfectiva.locationProvider,
        desiredAccuracy: configEfectiva.desiredAccuracy,
        distanceFilter: configEfectiva.distanceFilter,
        interval: configEfectiva.interval,
        fastestInterval: configEfectiva.fastestInterval,
        startForeground: configEfectiva.startForeground,
        stopOnTerminate: configEfectiva.stopOnTerminate,
        startOnBoot: configEfectiva.startOnBoot,
        notificationsEnabled: configEfectiva.notificationsEnabled,
        isRunning: statusEfectivo.isRunning,
        authorization: statusEfectivo.authorization,
        locationServicesEnabled: statusEfectivo.locationServicesEnabled
    };

    const diagnosticoSerializado = JSON.stringify(diagnostico);
    if (diagnosticoSerializado !== ultimoDiagnosticoGps) {
        ultimoDiagnosticoGps = diagnosticoSerializado;
        console.log("[TRACKING][DIAGNOSTICO]", diagnosticoSerializado);
    }

    return diagnostico;
}

function reconciliarEstadoGpsNativo(contexto) {
    return serializarOperacionGps(async function () {
        const estado = await obtenerContextoReconciliacionGps(contexto);
        const guiasActivas = Array.isArray(estado.guiasActivas) ? estado.guiasActivas : [];
        const haySesion = !!SEGUIMIENTO_textoCapturaDisponible(estado.usuarioActivo);
        const hayGuiasActivas = !!SEGUIMIENTO_textoCapturaDisponible(estado.procesoActual) || guiasActivas.length > 0;
        const permisosValidos = !!(estado.validacion && estado.validacion.ok);
        const debeEstarActivo = haySesion && hayGuiasActivas && permisosValidos;
        const status = await consultarStatusGps();

        limpiarUltimaUbicacionGuiasInactivas(guiasActivas, !hayGuiasActivas);
        try {
            await registrarDiagnosticoGps(null, status);
        } catch (error) {
            console.error("[TRACKING][DIAGNOSTICO] Error controlado:", error);
        }

        if (debeEstarActivo) {
            if (typeof activarBackgroundModeSeguro === "function") {
                activarBackgroundModeSeguro();
            }
            await iniciarGpsSiCorresponde(status);
        } else {
            await detenerGpsSiCorresponde(status);
            if (typeof desactivarBackgroundModeSeguro === "function") {
                desactivarBackgroundModeSeguro();
            }
        }

        return {
            debeEstarActivo: debeEstarActivo,
            haySesion: haySesion,
            hayGuiasActivas: hayGuiasActivas,
            permisosValidos: permisosValidos,
            isRunning: isTrackingEnabled,
            isTrackingEnabled: isTrackingEnabled
        };
    });
}
// Obtener la última ubicación registrada
function getLastKnownLocation() {
    if (lastKnownLocation) {
        // Usar esUbicacionAntigua para validar la antigüedad
        if (esUbicacionAntigua(lastKnownLocation.time)) {
            console.warn("La última ubicación conocida es antigua. Obteniendo una nueva ubicación...");

            // Solicitar una nueva ubicación y actualizar lastKnownLocation
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const ubicacionActual = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            time: new Date(position.timestamp).toISOString()
                        };
                        resolve(ubicacionActual); // No avanza el filtro sin persistencia
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
                    const ubicacionActual = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        time: new Date(position.timestamp).toISOString()
                    };
                    resolve(ubicacionActual); // No avanza el filtro sin persistencia
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


async function obtenerGuiasCandidatasCaptura() {
    const procesoActual = Obtener_dato_local("id_proceso_activo");
    const guiasNoConfirmadas = await listarGdeProveedorNoConfirmadas();
    const guias = [];
    const idsAgregados = new Set();

    async function agregarGuia(guia, umbralMs) {
        const idGuia = extraerIdGuiaActiva(guia);
        if (!idGuia) {
            return;
        }

        const clave = idGuia.toUpperCase();
        if (!idsAgregados.has(clave)) {
            idsAgregados.add(clave);
            guias.push({ guia: guia, idGuia: idGuia, umbralMs: umbralMs });
        }
    }

    if (procesoActual && procesoActual !== "") {
        await agregarGuia(await seleccionarGdeProveedor(procesoActual), UMBRAL_MS_GDE_ACTUAL);
    }

    for (const guia of (Array.isArray(guiasNoConfirmadas) ? guiasNoConfirmadas : [])) {
        await agregarGuia(guia, UMBRAL_MS_GUIA_NO_CONFIRMADA);
    }

    return guias;
}

function capturaSuperaFiltroGlobal(captura, ultimaLocation, ultimoTime, ultimoGuardado) {
    if (ultimoTime && captura.time === ultimoTime) {
        return false;
    }

    if (ultimoGuardado && (captura.fechaRecepcionMs - ultimoGuardado) < UMBRAL_MS_GLOBAL) {
        return false;
    }

    if (ultimaLocation) {
        const distancia = calcularDistanciaMetros(
            captura.latitude,
            captura.longitude,
            ultimaLocation.latitude,
            ultimaLocation.longitude
        );
        if ((captura.speed === null || captura.speed <= 0) && distancia < 1) {
            return false;
        }
    }

    return true;
}

function confirmarFiltroGlobalNuevo(captura) {
    lastKnownLocation = captura;
    ultimoTimestamp = captura.time;
    ultimoGuardadoMs = captura.fechaRecepcionMs;
}

function confirmarFiltroGlobalLegacy(captura) {
    lastKnownLocationLegacy = captura;
    ultimoTimestampLegacy = captura.time;
    ultimoGuardadoLegacyMs = captura.fechaRecepcionMs;
}

async function registrarCapturaTrazabilidadLegacy(captura, usuarioActivo, guiasCandidatas) {
    if (typeof HABILITAR_UBICACION_TRAZABILIDAD_LEGACY !== "undefined" && !HABILITAR_UBICACION_TRAZABILIDAD_LEGACY) {
        return 0;
    }

    if (!capturaSuperaFiltroGlobal(captura, lastKnownLocationLegacy, ultimoTimestampLegacy, ultimoGuardadoLegacyMs)) {
        return 0;
    }

    let cantidadPersistida = 0;
    for (const candidato of guiasCandidatas) {
        if (!puedeRegistrarParaGuiaEnMapa(
            ultimaUbicacionLegacyPorGuia,
            candidato.idGuia,
            captura,
            candidato.umbralMs
        )) {
            continue;
        }

        try {
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.CAPTURA_UBICACION,
                usuarioActivo,
                {
                    rol: candidato.guia && candidato.guia.GDE_COD_ORIGEN,
                    despacho: candidato.guia,
                    id_unico_movil_gde: candidato.idGuia
                }
            );

            await obtenerUbicacionEInsertarLog(usuarioActivo, datos, captura);
            confirmarRegistroParaGuia(ultimaUbicacionLegacyPorGuia, candidato.idGuia, captura);
            cantidadPersistida++;
        } catch (error) {
            console.error("[SAVE][LEGACY] Error controlado para una guía:", error);
        }
    }

    if (cantidadPersistida > 0) {
        confirmarFiltroGlobalLegacy(captura);
    }
    return cantidadPersistida;
}

async function saveLocation(location) {
    let captura = location;
    if (!captura || !Number.isFinite(captura.fechaRecepcionMs)) {
        captura = normalizarCapturaGps(location, new Date());
    }

    const usuarioActivo = Obtener_dato_local('user_activo');
    const guiasCandidatas = await obtenerGuiasCandidatasCaptura();
    const guias = guiasCandidatas.map(function (candidato) { return candidato.guia; });
    const guiasCapturables = SEGUIMIENTO_guiasCapturables(guias);
    limpiarMapaUltimaUbicacionGuias(
        ultimaUbicacionPorGuia,
        guiasCapturables,
        guiasCapturables.length === 0
    );
    limpiarMapaUltimaUbicacionGuias(
        ultimaUbicacionLegacyPorGuia,
        guias,
        guias.length === 0
    );

    let nuevoPersistido = false;
    let legacyPersistido = false;

    if (typeof HABILITAR_CAPTURA_SEGUIMIENTO_NUEVO === "undefined" || HABILITAR_CAPTURA_SEGUIMIENTO_NUEVO) {
        try {
            if (capturaSuperaFiltroGlobal(captura, lastKnownLocation, ultimoTimestamp, ultimoGuardadoMs)) {
                const insertadas = await registrarCapturaSeguimientoNueva(captura, guias);
                nuevoPersistido = Array.isArray(insertadas) && insertadas.length > 0;
                if (nuevoPersistido) {
                    confirmarFiltroGlobalNuevo(captura);
                }
            }
        } catch (error) {
            console.error("[SAVE][SEGUIMIENTO] Error controlado guardando captura nueva:", error);
        }
    }

    try {
        legacyPersistido = (await registrarCapturaTrazabilidadLegacy(captura, usuarioActivo, guiasCandidatas)) > 0;
    } catch (error) {
        console.error("[SAVE][LEGACY] Error controlado guardando acción 33:", error);
    }

    return {
        capturaValida: true,
        nuevoPersistido: nuevoPersistido,
        legacyPersistido: legacyPersistido
    };
}

function SEGUIMIENTO_numeroFinito(valor) {
    return typeof valor === "number" && Number.isFinite(valor);
}

function SEGUIMIENTO_valorFinitoNullable(valor, validar) {
    return SEGUIMIENTO_numeroFinito(valor) && validar(valor) ? valor : null;
}

function SEGUIMIENTO_textoCapturaDisponible(valor) {
    if (typeof valor !== "string") {
        return null;
    }

    var texto = valor.trim();
    var minuscula = texto.toLowerCase();
    return texto !== "" && minuscula !== "undefined" && minuscula !== "null" ? texto : null;
}

function SEGUIMIENTO_fechaCapturaUtc(location) {
    if (!location || location.time === undefined || location.time === null || location.time === "") {
        throw new Error("FECHA_CAPTURA_AUSENTE");
    }

    var fechaCaptura = new Date(location.time);
    if (isNaN(fechaCaptura.getTime())) {
        throw new Error("FECHA_CAPTURA_INVALIDA");
    }
    return fechaCaptura.toISOString();
}

function SEGUIMIENTO_guiaNoAnulada(guia) {
    var anulada = guia.GDE_ANULADA === 1 || guia.GDE_ANULADA === "1";
    var fechaAnulacion = SEGUIMIENTO_textoCapturaDisponible(guia.FECHA_ANULACION);
    var motivoAnulacion = SEGUIMIENTO_textoCapturaDisponible(guia.GDE_MOTIVO_ANULACION);
    return !anulada && !fechaAnulacion && !motivoAnulacion;
}

function SEGUIMIENTO_guiasCapturables(guias) {
    var guiasPorId = {};

    (Array.isArray(guias) ? guias : []).forEach(function (guia) {
        if (!guia) {
            return;
        }

        var idGuia = SEGUIMIENTO_textoCapturaDisponible(guia.ID_UNICO_MOVIL);
        if (!idGuia) {
            return;
        }

        var estado = SEGUIMIENTO_textoCapturaDisponible(guia.GDE_ESTADO_MOVIL);
        var ingresoPendiente = guia.GDE_CONFIRMA_INGRESO_PLANTA === 0 || guia.GDE_CONFIRMA_INGRESO_PLANTA === "0";
        if ((estado !== "I" && estado !== "E") || !ingresoPendiente || !SEGUIMIENTO_guiaNoAnulada(guia)) {
            return;
        }

        var idSeguimiento;
        try {
            idSeguimiento = SEGUIMIENTO_uuidObligatorio(guia.ID_UNICO_SEGUIMIENTO, "ID_UNICO_SEGUIMIENTO");
        } catch (error) {
            console.warn("[SAVE] Guía activa sin ID_UNICO_SEGUIMIENTO válido:", idGuia);
            return;
        }

        var claveGuia = idGuia.toUpperCase();
        if (!guiasPorId[claveGuia]) {
            guiasPorId[claveGuia] = {
                ID_UNICO_MOVIL_GDE: idGuia,
                ID_UNICO_SEGUIMIENTO: idSeguimiento
            };
        }
    });

    return Object.keys(guiasPorId).map(function (clave) {
        return guiasPorId[clave];
    });
}

async function registrarCapturaSeguimientoNueva(location, guiasQueSuperaronFiltros) {
    if (typeof HABILITAR_CAPTURA_SEGUIMIENTO_NUEVO !== "undefined" && !HABILITAR_CAPTURA_SEGUIMIENTO_NUEVO) {
        return [];
    }

    var captura = location;
    try {
        if (!captura || !Number.isFinite(captura.fechaRecepcionMs)) {
            captura = normalizarCapturaGps(location, new Date());
        }
    } catch (error) {
        console.warn("[SAVE][SEGUIMIENTO] Captura rechazada:", error && error.message ? error.message : "CAPTURA_INVALIDA");
        return [];
    }

    var guias = SEGUIMIENTO_guiasCapturables(guiasQueSuperaronFiltros).filter(function (guia) {
        return puedeRegistrarParaGuiaEnMapa(
            ultimaUbicacionPorGuia,
            guia.ID_UNICO_MOVIL_GDE,
            captura,
            UMBRAL_MS_GUIA_NO_CONFIRMADA
        );
    });
    if (guias.length === 0) {
        return [];
    }

    var fechaDispositivoUtc = SEGUIMIENTO_fechaCapturaUtc(captura);
    var precision = captura.accuracy;
    var velocidad = captura.speed;
    var rumbo = SEGUIMIENTO_valorFinitoNullable(captura.bearing, function (valor) {
        return valor >= 0 && valor < 360;
    });
    var altitud = SEGUIMIENTO_valorFinitoNullable(captura.altitude, function () { return true; });
    var esSimulada = captura.isFromMockProvider === true;

    var posiciones = guias.map(function (guia) {
        return {
            ID_UNICO_MOVIL_GDE: guia.ID_UNICO_MOVIL_GDE,
            ID_UNICO_SEGUIMIENTO: guia.ID_UNICO_SEGUIMIENTO,
            SECUENCIA_LOCAL: null,
            FECHA_DISPOSITIVO_UTC: fechaDispositivoUtc,
            LATITUD: captura.latitude,
            LONGITUD: captura.longitude,
            PRECISION_METROS: precision,
            VELOCIDAD_MPS: velocidad,
            RUMBO_GRADOS: rumbo,
            ALTITUD_METROS: altitud,
            ES_UBICACION_SIMULADA: esSimulada,
            ORIGEN_CAPTURA: "GPS"
        };
    });

    var insertadas = await insertarPosicionesSeguimientoPendientes(posiciones);
    guias.forEach(function (guia) {
        confirmarRegistroParaGuia(ultimaUbicacionPorGuia, guia.ID_UNICO_MOVIL_GDE, captura);
    });
    return insertadas;
}


// Validar si la ubicación es antigua
function esUbicacionAntigua(timestamp) {
    const ahora = new Date().getTime();
    const tiempoUbicacion = new Date(timestamp).getTime();
    const diferenciaMinutos = (ahora - tiempoUbicacion) / (1000 * 60); // Diferencia en minutos
    return diferenciaMinutos > 10; // Retorna true si supera los 10 minutos
}



function puedeRegistrarParaGuiaEnMapa(mapa, idUnicoMovilGde, location, umbralMs) {
    if (!idUnicoMovilGde) {
        return false;
    }

    const registroPrevio = mapa.get(idUnicoMovilGde);
    if (!registroPrevio) {
        return true;
    }

    const diffMs = location.fechaRecepcionMs - registroPrevio.tsMs;
    if (diffMs < umbralMs) {
        return false;
    }

    const distancia = calcularDistanciaMetros(
        location.latitude,
        location.longitude,
        registroPrevio.lat,
        registroPrevio.lon
    );
    return distancia >= DISTANCIA_MINIMA_MOVIMIENTO;
}

function confirmarRegistroParaGuia(mapa, idUnicoMovilGde, location) {
    mapa.set(idUnicoMovilGde, {
        lat: location.latitude,
        lon: location.longitude,
        tsMs: location.fechaRecepcionMs
    });
}

function puedeRegistrarParaGuia(idUnicoMovilGde, location, umbralMs) {
    return puedeRegistrarParaGuiaEnMapa(
        ultimaUbicacionPorGuia,
        idUnicoMovilGde,
        location,
        umbralMs
    );
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
