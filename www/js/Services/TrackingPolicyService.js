// Preflight de politica energetica. El diagnostico nunca se maquilla para permitir el inicio.
var TRACKING_POLICY_dialogoPendiente = null;
var TRACKING_POLICY_ultimaAlerta = null;
var TRACKING_POLICY_estadoActual = null;
var TRACKING_POLICY_suscripcionActiva = false;

function TRACKING_POLICY_extraer(resultado) {
    return resultado && resultado.policyDiagnostic ? resultado.policyDiagnostic : resultado;
}

function TRACKING_POLICY_describir(blockers) {
    var textos = {
        BACKGROUND_RESTRICTED: "Android tiene restringida la actividad en segundo plano; al minimizar puede detener la trazabilidad.",
        LOCATION_DISABLED: "La ubicacion del dispositivo esta desactivada.",
        FINE_LOCATION_DENIED: "Falta el permiso de ubicacion precisa.",
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

function TRACKING_POLICY_mostrarWarn(diagnostico, motivo) {
    if (TRACKING_POLICY_dialogoPendiente) return TRACKING_POLICY_dialogoPendiente;
    TRACKING_POLICY_dialogoPendiente = new Promise(function (resolve) {
        if (typeof app === "undefined" || !app.dialog || typeof app.dialog.create !== "function") {
            resolve(false);
            return;
        }
        var blockers = diagnostico.decision.blockers || [];
        var dialogo = app.dialog.create({
            title: "Seguimiento en modo degradado",
            text: TRACKING_POLICY_describir(blockers)
                + "<br><br>Puede abrir la configuracion, cancelar o continuar explicitamente bajo advertencia para pruebas o contingencia.",
            verticalButtons: true,
            buttons: [
                {
                    text: "Abrir configuracion",
                    onClick: function () {
                        ComacoTracking.abrirConfiguracionPolitica("APP_DETAILS").catch(function () {});
                        resolve(false);
                    }
                },
                { text: "Cancelar", onClick: function () { resolve(false); } },
                {
                    text: "Continuar bajo advertencia",
                    color: "red",
                    bold: true,
                    onClick: function () {
                        ComacoTracking.continuarInicioConAdvertencia(motivo || "warn_frontend")
                            .then(function (resultado) {
                                var actualizado = TRACKING_POLICY_extraer(resultado);
                                resolve(!!(actualizado
                                    && actualizado.enforcement
                                    && actualizado.enforcement.userOverrideUsed));
                            })
                            .catch(function () { resolve(false); });
                    }
                }
            ]
        });
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
    if (!decision.wouldBlockInEnforceMode) return true;
    if (enforcement.mode === "OBSERVE") return true;
    if (enforcement.mode === "ENFORCE") {
        if (typeof app !== "undefined" && app.dialog) {
            app.dialog.alert(
                TRACKING_POLICY_describir(decision.blockers),
                "Inicio de seguimiento bloqueado");
        }
        return false;
    }
    if (enforcement.mode === "WARN" && enforcement.requiresExplicitContinue) {
        return TRACKING_POLICY_mostrarWarn(diagnostico, motivo);
    }
    return enforcement.userOverrideUsed || !!diagnostico.tracking.serviceCreated;
}

async function TRACKING_POLICY_revisar(motivo) {
    if (typeof ComacoTracking === "undefined"
            || typeof ComacoTracking.obtenerDiagnosticoPolitica !== "function") return null;
    TRACKING_POLICY_marcarChecking(motivo || "revision_visible");
    var diagnostico = await ComacoTracking.obtenerDiagnosticoPolitica(motivo || "revision_visible");
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
