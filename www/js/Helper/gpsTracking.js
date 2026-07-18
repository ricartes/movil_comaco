// Fachada deliberadamente delgada: la captura, persistencia y transmisión viven en Android.
var SEGUIMIENTO_configuracionNativaPromesa = null;

function SEGUIMIENTO_obtenerDireccionServidor() {
    return new Promise(function (resolve, reject) {
        DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result) {
            if (result && result.PAG_VALOR) resolve(String(result.PAG_VALOR));
            else if (typeof url_server_nuevo === "string" && url_server_nuevo) resolve(url_server_nuevo);
            else reject(new Error("No existe DIRECCION_SERVIDOR para configurar el seguimiento nativo."));
        });
    });
}

function SEGUIMIENTO_pluginNativo() {
    if (typeof ComacoTracking === "undefined") {
        throw new Error("ComacoTracking no está disponible en esta plataforma.");
    }
    return ComacoTracking;
}

function configurarSeguimientoNativo() {
    if (SEGUIMIENTO_configuracionNativaPromesa) return SEGUIMIENTO_configuracionNativaPromesa;
    SEGUIMIENTO_configuracionNativaPromesa = SEGUIMIENTO_obtenerDireccionServidor().then(function (baseUrl) {
        return SEGUIMIENTO_pluginNativo().configurar({
            URL_SERVICIO: baseUrl,
            UUID_DISPOSITIVO: (window.device && device.uuid) || Obtener_dato_local("uid") || "browser",
            VERSION_APP: Obtener_dato_local("version_app") || "",
            INTERVALO_MS: 5000,
            DISTANCIA_METROS: 5,
            TAMANO_LOTE: 50,
            TIMEOUT_HTTP_MS: 15000,
            REINTENTOS_CORTOS: 3,
            VERSION_ESQUEMA: 1
        });
    }).catch(function (error) {
        SEGUIMIENTO_configuracionNativaPromesa = null;
        throw error;
    });
    return SEGUIMIENTO_configuracionNativaPromesa;
}

function SEGUIMIENTO_registrarCredencialesNativas(credenciales) {
    return configurarSeguimientoNativo().then(async function () {
        var resultado = await SEGUIMIENTO_pluginNativo().sincronizarSeguimientos(credenciales || []);
        await TRACKING_POLICY_procesarResultado(resultado, "registro_seguimiento");
        return resultado;
    });
}

function reconciliarEstadoGpsNativo() {
    return configurarSeguimientoNativo().then(async function () {
        var credenciales = typeof listarCredencialesSeguimientoActivas === "function"
            ? await listarCredencialesSeguimientoActivas() : [];
        var sincronizacion = await SEGUIMIENTO_pluginNativo().sincronizarSeguimientos(credenciales);
        var continuar = await TRACKING_POLICY_procesarResultado(sincronizacion, "reconciliacion");
        if (continuar) {
            var drenaje = await SEGUIMIENTO_pluginNativo().solicitarDrenaje("reconciliacion");
            await TRACKING_POLICY_procesarResultado(drenaje, "reconciliacion_drenaje");
        }
        var estado = await SEGUIMIENTO_pluginNativo().obtenerEstado();
        return estado.servicioActivo === true || estado.seguimientosActivos > 0;
    });
}

function finalizarSeguimientoNativo(idUnicoSeguimiento) {
    return configurarSeguimientoNativo().then(async function () {
        var resultado = await SEGUIMIENTO_pluginNativo().finalizarSeguimiento(idUnicoSeguimiento);
        await TRACKING_POLICY_procesarResultado(resultado, "finalizacion");
        return resultado;
    });
}

function solicitarDrenajeSeguimientoNativo(motivo) {
    return configurarSeguimientoNativo().then(async function () {
        var razon = motivo || "javascript";
        var resultado = await SEGUIMIENTO_pluginNativo().solicitarDrenaje(razon);
        await TRACKING_POLICY_procesarResultado(resultado, razon);
        return resultado;
    });
}

function SEGUIMIENTO_diagnosticoPromesa(nombre, argumentos, valorPredeterminado) {
    return new Promise(function (resolve) {
        var diagnostic = window.cordova && cordova.plugins && cordova.plugins.diagnostic;
        if (!diagnostic || typeof diagnostic[nombre] !== "function") {
            resolve(valorPredeterminado);
            return;
        }
        var args = [resolve, function () { resolve(valorPredeterminado); }].concat(argumentos || []);
        diagnostic[nombre].apply(diagnostic, args);
    });
}

async function validarRequisitosTrackingCordova() {
    if (typeof ComacoTracking !== "undefined"
            && typeof ComacoTracking.obtenerDiagnosticoPolitica === "function") {
        var nativo = await ComacoTracking.obtenerDiagnosticoPolitica("preflight_interactivo");
        return {
            ok: nativo.decision.normalTrackingAllowed,
            gpsActivo: nativo.location.deviceLocationEnabled,
            permisoUbicacion: nativo.permissions.fineLocation,
            permisoBackground: nativo.permissions.backgroundLocation,
            permisoNotificaciones: nativo.permissions.postNotifications,
            backgroundRestricted: nativo.powerPolicy.backgroundRestricted,
            decision: nativo.decision,
            enforcement: nativo.enforcement,
            policyDiagnostic: nativo
        };
    }
    var diagnostic = window.cordova && cordova.plugins && cordova.plugins.diagnostic;
    if (!diagnostic) {
        return { ok: true, gpsActivo: true, permisoUbicacion: true, permisoBackground: true, permisoNotificaciones: true };
    }
    var gpsActivo = await SEGUIMIENTO_diagnosticoPromesa("isLocationEnabled", [], false);
    var estadoUbicacion = await SEGUIMIENTO_diagnosticoPromesa("getLocationAuthorizationStatus", [], "DENIED");
    var autorizado = estadoUbicacion === diagnostic.permissionStatus.GRANTED || estadoUbicacion === diagnostic.permissionStatus.GRANTED_WHEN_IN_USE;
    var background = estadoUbicacion === diagnostic.permissionStatus.GRANTED;
    var notificaciones = true;
    if (diagnostic.permission && diagnostic.permission.POST_NOTIFICATIONS) {
        var estadoNotificacion = await SEGUIMIENTO_diagnosticoPromesa("getPermissionAuthorizationStatus", [diagnostic.permission.POST_NOTIFICATIONS], "GRANTED");
        notificaciones = estadoNotificacion === diagnostic.permissionStatus.GRANTED;
    }
    return { ok: !!gpsActivo && autorizado && background && notificaciones, gpsActivo: !!gpsActivo, permisoUbicacion: autorizado, permisoBackground: background, permisoNotificaciones: notificaciones };
}

function solicitarActivarGPS() {
    if (window.cordova && cordova.plugins && cordova.plugins.diagnostic) cordova.plugins.diagnostic.switchToLocationSettings();
}

function inicializarGpsDiagnosticHandler() { return true; }
