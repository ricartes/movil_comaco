// Preflight de politica energetica. El diagnostico nunca se maquilla para permitir el inicio.
var TRACKING_POLICY_dialogoPendiente = null;
var TRACKING_POLICY_ultimaAlerta = null;
var TRACKING_POLICY_estadoActual = null;
var TRACKING_POLICY_suscripcionActiva = false;
var TRACKING_POLICY_esperandoRetornoSettings = false;

function TRACKING_POLICY_extraer(resultado) {
    return resultado && resultado.policyDiagnostic ? resultado.policyDiagnostic : resultado;
}

function TRACKING_POLICY_describir(blockers) {
    var textos = {
        BACKGROUND_RESTRICTED: "Android tiene restringida la actividad en segundo plano; al minimizar puede detener la trazabilidad.",
        BATTERY_OPTIMIZATION_ACTIVE: "La optimizacion de bateria sigue activa para la aplicacion; selecciona Sin restricciones si Android ofrece esa opcion.",
        APP_STANDBY_RESTRICTED: "Android mantiene la aplicacion en un nivel de espera restringido; revisa el uso de bateria en segundo plano.",
        LOCATION_DISABLED: "La ubicacion del dispositivo esta desactivada.",
        FINE_LOCATION_DENIED: "Falta el permiso de ubicacion precisa.",
        BACKGROUND_LOCATION_DENIED: "Falta permitir la ubicacion en segundo plano; selecciona Permitir siempre en los permisos de la aplicacion.",
        POST_NOTIFICATIONS_DENIED: "Falta el permiso de notificaciones; Android puede ocultar el aviso del seguimiento.",
        LOCATION_STALE: "Sin posiciones recientes de la sesion GPS actual.",
        FOREGROUND_LOST: "El servicio perdio el estado foreground.",
        LOCATION_UPDATES_NOT_REGISTERED: "El servicio no tiene un registro de ubicacion activo.",
        SERVICE_NOT_CREATED: "El servicio de seguimiento no esta creado.",
        FOREGROUND_OBSERVATION_UNKNOWN: "Android aun no permite confirmar el estado foreground.",
        FOREGROUND_OBSERVATION_PENDING: "Comprobando el estado foreground del servicio.",
        LOCATION_REGISTRATION_UNKNOWN: "Comprobando el registro de ubicacion actual."
    };
    return (blockers || []).map(function (code) {
        if (String(code).indexOf("STANDBY_BUCKET_") === 0) {
            return "Android mantiene la aplicacion en un nivel de espera restringido; revisa el uso de bateria en segundo plano.";
        }
        return textos[code] || code;
    }).join("<br><br>");
}

function TRACKING_POLICY_actualizarEstado(diagnostico) {
    if (!diagnostico || !diagnostico.decision) return;
    TRACKING_POLICY_estadoActual = diagnostico;
    if (diagnostico.decision.mode === "READY") TRACKING_POLICY_ultimaAlerta = null;
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        var event;
        try {
            event = new CustomEvent("trackingpolicychange", { detail: diagnostico });
        } catch (ignored) {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("trackingpolicychange", false, false, diagnostico);
        }
        window.dispatchEvent(event);
    }
}

function TRACKING_POLICY_marcarChecking(motivo) {
    TRACKING_POLICY_actualizarEstado({
        reason: motivo || "checking",
        decision: {
            mode: "CHECKING",
            normalTrackingAllowed: true,
            wouldBlockInEnforceMode: false,
            blockers: [],
            warnings: [],
            reasons: ["SNAPSHOT_REFRESH_PENDING"]
        },
        enforcement: TRACKING_POLICY_estadoActual && TRACKING_POLICY_estadoActual.enforcement
            ? TRACKING_POLICY_estadoActual.enforcement
            : { mode: "WARN", userOverrideUsed: false }
    });
}

function TRACKING_POLICY_describirRemediacion(diagnostico) {
    var decision = diagnostico.decision || {};
    var causas = (decision.blockers || []).concat(decision.warnings || []);
    var descripcion = TRACKING_POLICY_describir(causas);
    if (diagnostico.manufacturerGuidance) {
        descripcion += (descripcion ? "<br><br>" : "") + diagnostico.manufacturerGuidance;
    }
    return descripcion;
}

function TRACKING_POLICY_mostrarRemediacion(diagnostico, motivo) {
    if (TRACKING_POLICY_dialogoPendiente) return TRACKING_POLICY_dialogoPendiente;
    TRACKING_POLICY_dialogoPendiente = new Promise(function (resolve) {
        if (typeof app === "undefined" || !app.dialog || typeof app.dialog.create !== "function") {
            resolve(false);
            return;
        }
        var enforcementMode = diagnostico.enforcementMode
            || diagnostico.enforcement && diagnostico.enforcement.mode
            || "WARN";
        var actions = diagnostico.remediationActions || [];
        var buttons = [
            {
                text: "Configurar ahora",
                onClick: function () {
                    var request = diagnostico.backgroundRestricted !== true
                            && actions.indexOf("REQUEST_BATTERY_OPTIMIZATION_EXEMPTION") !== -1
                        ? ComacoTracking.requestBatteryOptimizationExemption()
                        : ComacoTracking.openPowerRestrictionSettings();
                    request.then(function (resultado) {
                        TRACKING_POLICY_actualizarEstado(resultado);
                        TRACKING_POLICY_esperandoRetornoSettings = resultado.settingsOpened === true;
                        resolve(false);
                    }).catch(function () { resolve(false); });
                }
            },
            {
                text: "Volver a comprobar",
                onClick: function () {
                    TRACKING_POLICY_marcarChecking("recheck_manual");
                    ComacoTracking.recheckPowerPolicy().then(function (actualizado) {
                        TRACKING_POLICY_actualizarEstado(actualizado);
                        var corregido = actualizado.remediationRequired !== true;
                        resolve(corregido);
                        if (!corregido) {
                            setTimeout(function () {
                                TRACKING_POLICY_mostrarRemediacion(actualizado, motivo);
                            }, 0);
                        }
                    }).catch(function () { resolve(false); });
                }
            }
        ];
        if (enforcementMode === "WARN") {
            buttons.push({
                text: "Continuar bajo advertencia",
                color: "red",
                bold: true,
                onClick: function () {
                    ComacoTracking.continuarInicioConAdvertencia(motivo || "warn_frontend")
                        .then(function (resultado) {
                            var actualizado = TRACKING_POLICY_extraer(resultado);
                            TRACKING_POLICY_actualizarEstado(actualizado);
                            resolve(!!(actualizado
                                && actualizado.enforcement
                                && actualizado.enforcement.userOverrideUsed));
                        })
                        .catch(function () { resolve(false); });
                }
            });
        }
        var dialogo = app.dialog.create({
            title: "Configura el seguimiento en segundo plano",
            text: TRACKING_POLICY_describirRemediacion(diagnostico),
            verticalButtons: true,
            buttons: buttons
        });
        if (typeof ComacoTracking.presentPowerRemediation === "function") {
            ComacoTracking.presentPowerRemediation(diagnostico).catch(function () {});
        }
        dialogo.open();
    }).finally(function () {
        TRACKING_POLICY_dialogoPendiente = null;
    });
    return TRACKING_POLICY_dialogoPendiente;
}

async function TRACKING_POLICY_procesarResultado(resultado, motivo) {
    var diagnostico = TRACKING_POLICY_extraer(resultado);
    if (!diagnostico || !diagnostico.decision || !diagnostico.enforcement) return true;
    TRACKING_POLICY_actualizarEstado(diagnostico);
    var decision = diagnostico.decision;
    var enforcement = diagnostico.enforcement;
    var remediationRequired = diagnostico.remediationRequired === true;
    if (enforcement.mode === "OBSERVE") {
        if (remediationRequired) TRACKING_POLICY_mostrarRemediacion(diagnostico, motivo);
        return true;
    }
    if (enforcement.mode === "ENFORCE" && decision.wouldBlockInEnforceMode) {
        return TRACKING_POLICY_mostrarRemediacion(diagnostico, motivo);
    }
    if (enforcement.mode === "WARN" && enforcement.requiresExplicitContinue) {
        return TRACKING_POLICY_mostrarRemediacion(diagnostico, motivo);
    }
    if (remediationRequired) TRACKING_POLICY_mostrarRemediacion(diagnostico, motivo);
    return !remediationRequired
        || enforcement.userOverrideUsed
        || !!(diagnostico.tracking && diagnostico.tracking.serviceCreated)
        || resultado && resultado.serviceStartRequested === true;
}

async function TRACKING_POLICY_revisar(motivo) {
    if (typeof ComacoTracking === "undefined"
            || typeof ComacoTracking.getPowerPolicyStatus !== "function") return null;
    TRACKING_POLICY_marcarChecking(motivo || "revision_visible");
    var diagnostico = await ComacoTracking.getPowerPolicyStatus();
    TRACKING_POLICY_actualizarEstado(diagnostico);
    var mode = diagnostico.decision && diagnostico.decision.mode;
    var reasons = diagnostico.decision && diagnostico.decision.reasons || [];
    var key = mode + ":" + JSON.stringify(reasons);
    if ((mode === "BLOCKED" || mode === "DEGRADED")
            && key !== TRACKING_POLICY_ultimaAlerta
            && typeof app !== "undefined" && app.dialog) {
        TRACKING_POLICY_ultimaAlerta = key;
        app.dialog.alert(
            TRACKING_POLICY_describir(reasons),
            "Estado de trazabilidad: " + mode);
    }
    if (diagnostico.remediationRequired === true) {
        TRACKING_POLICY_mostrarRemediacion(diagnostico, motivo || "revision_visible");
    }
    return diagnostico;
}

async function TRACKING_POLICY_revalidarRetornoSettings() {
    if (!TRACKING_POLICY_esperandoRetornoSettings) return null;
    TRACKING_POLICY_esperandoRetornoSettings = false;
    TRACKING_POLICY_marcarChecking("retorno_settings");
    var diagnostico = await ComacoTracking.recheckPowerPolicy();
    TRACKING_POLICY_actualizarEstado(diagnostico);
    if (diagnostico.remediationRequired === true) {
        TRACKING_POLICY_mostrarRemediacion(diagnostico, "retorno_settings");
    }
    return diagnostico;
}

function TRACKING_POLICY_suscribir() {
    if (TRACKING_POLICY_suscripcionActiva
            || typeof ComacoTracking === "undefined"
            || typeof ComacoTracking.suscribirEstadoSalud !== "function") return;
    TRACKING_POLICY_suscripcionActiva = true;
    ComacoTracking.suscribirEstadoSalud(function (diagnostico) {
        TRACKING_POLICY_actualizarEstado(diagnostico);
    }, function () {
        TRACKING_POLICY_suscripcionActiva = false;
    });
}

if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("deviceready", TRACKING_POLICY_suscribir, false);
}
