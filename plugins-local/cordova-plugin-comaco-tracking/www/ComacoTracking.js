var exec = require("cordova/exec");

function invoke(action, payload) {
    return new Promise(function (resolve, reject) {
        exec(resolve, reject, "ComacoTracking", action, payload === undefined ? [] : [payload]);
    });
}

module.exports = {
    configurar: function (config) { return invoke("configurar", config); },
    sincronizarSeguimientos: function (items) { return invoke("sincronizarSeguimientos", items || []); },
    registrarSeguimiento: function (item) { return invoke("registrarSeguimiento", item); },
    finalizarSeguimiento: function (id) { return invoke("finalizarSeguimiento", { ID_UNICO_SEGUIMIENTO: id }); },
    prepararFinalizacionSeguimiento: function (id, timeoutMs) { return invoke("prepararFinalizacionSeguimiento", { ID_UNICO_SEGUIMIENTO: id, TIMEOUT_MS: timeoutMs || 15000 }); },
    cancelarPreparacionFinalizacionSeguimiento: function (id) { return invoke("cancelarPreparacionFinalizacionSeguimiento", { ID_UNICO_SEGUIMIENTO: id }); },
    obtenerBuildInfo: function () { return invoke("obtenerBuildInfo"); },
    obtenerEstado: function () { return invoke("obtenerEstado"); },
    obtenerEstadisticas: function () { return invoke("obtenerEstadisticas"); },
    solicitarDrenaje: function (motivo) { return invoke("solicitarDrenaje", { motivo: motivo || "manual" }); },
    importarPosicionesLegacy: function (items) { return invoke("importarPosicionesLegacy", items || []); },
    verificarMigracion: function (esperado) { return invoke("verificarMigracion", esperado || {}); },
    detenerSiCorresponde: function () { return invoke("detenerSiCorresponde"); },
    obtenerDiagnosticoPolitica: function (motivo) { return invoke("obtenerDiagnosticoPolitica", { motivo: motivo || "preflight" }); },
    configurarModoPolitica: function (mode) { return invoke("configurarModoPolitica", { mode: mode }); },
    continuarInicioConAdvertencia: function (motivo) { return invoke("continuarInicioConAdvertencia", { motivo: motivo || "continuacion_explicita" }); },
    abrirConfiguracionPolitica: function (destino) { return invoke("abrirConfiguracionPolitica", { destino: destino || "APP_DETAILS" }); },
    getPowerPolicyStatus: function () { return invoke("getPowerPolicyStatus"); },
    openPowerRestrictionSettings: function () { return invoke("openPowerRestrictionSettings"); },
    requestBatteryOptimizationExemption: function () { return invoke("requestBatteryOptimizationExemption"); },
    recheckPowerPolicy: function () { return invoke("recheckPowerPolicy"); },
    presentPowerRemediation: function (diagnostic) { return invoke("presentPowerRemediation", diagnostic || {}); },
    prepararAuditoriaLogin: function (input) { return invoke("prepararAuditoriaLogin", input || {}); },
    confirmarAuditoriaLoginOnline: function (input) { return invoke("confirmarAuditoriaLoginOnline", input || {}); },
    registrarAuditoriaLogin: function (input) { return invoke("registrarAuditoriaLogin", input || {}); },
    auditarConfiguracion: function (input) { return invoke("auditarConfiguracion", input || {}); },
    solicitarDrenajeAuditoria: function (motivo) { return invoke("solicitarDrenajeAuditoria", { motivo: motivo || "manual" }); },
    descartarAuditoria: function (idEvento) { return invoke("descartarAuditoria", { ID_EVENTO: idEvento }); },
    obtenerEstadoAuditoria: function () { return invoke("obtenerEstadoAuditoria"); },
    obtenerCredencialInstalacion: function () { return invoke("obtenerCredencialInstalacion"); },
    suscribirEstadoSalud: function (onUpdate, onError) {
        exec(onUpdate, onError, "ComacoTracking", "suscribirEstadoSalud", []);
    }
};
