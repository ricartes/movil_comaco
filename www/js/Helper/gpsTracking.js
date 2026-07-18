// Fachada deliberadamente delgada: la captura, persistencia y transmisión viven en Android.
var SEGUIMIENTO_configuracionNativaPromesa = null;
var SEGUIMIENTO_configuracionNativaUrl = null;

function SEGUIMIENTO_obtenerDireccionServidor() {
    return new Promise(function (resolve, reject) {
        DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result) {
            // Principal.js reemplaza este parámetro al arrancar. El bootstrap técnico
            // puede ejecutarse antes de que termine ese callback, por lo que la URL
            // compilada vigente debe prevalecer sobre un valor SQLite obsoleto.
            if (typeof url_server_nuevo === "string" && url_server_nuevo) resolve(url_server_nuevo);
            else if (result && result.PAG_VALOR) resolve(String(result.PAG_VALOR));
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
    return SEGUIMIENTO_obtenerDireccionServidor().then(function (baseUrl) {
        var urlNormalizada = String(baseUrl).replace(/\/+$/, "");
        if (SEGUIMIENTO_configuracionNativaPromesa &&
            SEGUIMIENTO_configuracionNativaUrl === urlNormalizada) {
            return SEGUIMIENTO_configuracionNativaPromesa;
        }

        var configuracionAnterior = SEGUIMIENTO_configuracionNativaPromesa || Promise.resolve();
        var nuevaConfiguracion = configuracionAnterior.catch(function () {
            // Permite recuperar una configuración fallida sin mantener la promesa
            // anterior rechazada como bloqueo permanente.
        }).then(function () {
            return SEGUIMIENTO_pluginNativo().configurar({
                URL_SERVICIO: urlNormalizada,
                UUID_DISPOSITIVO: (window.device && device.uuid) || Obtener_dato_local("uid") || "browser",
                VERSION_APP: Obtener_dato_local("version_app") || "",
                INTERVALO_MS: 1000,
                DISTANCIA_METROS: 0,
                TAMANO_LOTE: 50,
                TIMEOUT_HTTP_MS: 15000,
                REINTENTOS_CORTOS: 3,
                VERSION_ESQUEMA: 1
            });
        });

        SEGUIMIENTO_configuracionNativaUrl = urlNormalizada;
        SEGUIMIENTO_configuracionNativaPromesa = nuevaConfiguracion;
        return nuevaConfiguracion.catch(function (error) {
            if (SEGUIMIENTO_configuracionNativaPromesa === nuevaConfiguracion) {
                SEGUIMIENTO_configuracionNativaPromesa = null;
                SEGUIMIENTO_configuracionNativaUrl = null;
            }
            throw error;
        });
    });
}

function SEGUIMIENTO_registrarCredencialesNativas(credenciales) {
    return configurarSeguimientoNativo().then(async function () {
        await AUDITORIA_auditarConfiguracion("antes_tracking").catch(function () {});
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

function AUDITORIA_prepararLogin(tipoLogin, userKey) {
    return configurarSeguimientoNativo().then(function () {
        return SEGUIMIENTO_pluginNativo().prepararAuditoriaLogin({
            TIPO_LOGIN: tipoLogin || "ONLINE",
            USER_KEY: userKey || ""
        });
    });
}

function AUDITORIA_confirmarLoginOnline(preparada, respuesta, userKey) {
    if (!preparada || !preparada.EVENTO || !respuesta) return Promise.resolve();
    return SEGUIMIENTO_pluginNativo().confirmarAuditoriaLoginOnline({
        ID_EVENTO: preparada.EVENTO.ID_EVENTO,
        ID_USUARIO: respuesta.ID_USUARIO,
        USER_KEY: userKey || "",
        TOKEN_INSTALACION: respuesta.TOKEN_INSTALACION || "",
        AUDITORIA_CONFIRMADA: respuesta.AUDITORIA_CONFIRMADA === true,
        ESTADO_DISPOSITIVO: respuesta.ESTADO_DISPOSITIVO || ""
    });
}

function AUDITORIA_descartarLoginPreparado(preparada) {
    if (!preparada || !preparada.EVENTO) return Promise.resolve();
    return SEGUIMIENTO_pluginNativo().descartarAuditoria(preparada.EVENTO.ID_EVENTO);
}

function AUDITORIA_registrarLoginLocal(usuario, tipoLogin) {
    return configurarSeguimientoNativo().then(function () {
        var idServidor = usuario && (usuario.id_usuario || usuario.ID_USUARIO);
        return SEGUIMIENTO_pluginNativo().registrarAuditoriaLogin({
            ID_USUARIO: idServidor ? Number(idServidor) : null,
            USER_KEY: usuario && usuario.user ? usuario.user : "",
            TIPO_LOGIN: tipoLogin || "OFFLINE"
        });
    });
}

function AUDITORIA_auditarConfiguracion(motivo) {
    var idUsuario = Number(Obtener_dato_local("id_usuario_activo") || 0);
    return configurarSeguimientoNativo().then(function () {
        return SEGUIMIENTO_pluginNativo().auditarConfiguracion({
            ID_USUARIO: idUsuario > 0 ? idUsuario : null,
            USER_KEY: Obtener_dato_local("user_activo") || "",
            MOTIVO: motivo || "configuracion"
        });
    });
}

function AUDITORIA_solicitarDrenaje(motivo) {
    if (typeof ComacoTracking === "undefined") return Promise.resolve();
    return configurarSeguimientoNativo().then(function () {
        return ComacoTracking.solicitarDrenajeAuditoria(motivo || "javascript");
    });
}
