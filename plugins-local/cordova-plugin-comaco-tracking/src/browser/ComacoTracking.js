/* Browser shim: conserva la API sin simular captura en segundo plano. */
var diagnostico = {
    schemaVersion: 1,
    decision: { mode: "IDLE", normalTrackingAllowed: true, wouldBlockInEnforceMode: false, blockers: [], warnings: [], reasons: [] },
    enforcement: { mode: "WARN", userOverrideUsed: false, requiresExplicitContinue: false, startAllowed: true },
    enforcementMode: "WARN", health: "IDLE", warnings: [], reasons: [], blockers: [],
    backgroundRestricted: false, ignoringBatteryOptimizations: true,
    remediationRequired: false, remediationStep: "NONE", remediationActions: [], settingsOpened: false
};
var estado = { configurado: false, servicioActivo: false, seguimientosActivos: 0, pendientes: 0, plataforma: "browser", decision: diagnostico.decision, enforcement: diagnostico.enforcement, policyDiagnostic: diagnostico };
function ok(value) { return Promise.resolve(value); }
var api = {
    configurar: function () { estado.configurado = true; return ok(estado); },
    sincronizarSeguimientos: function (items) { estado.seguimientosActivos = (items || []).length; return ok(estado); },
    registrarSeguimiento: function () { estado.seguimientosActivos += 1; return ok(estado); },
    finalizarSeguimiento: function () { estado.seguimientosActivos = Math.max(0, estado.seguimientosActivos - 1); return ok(estado); },
    obtenerEstado: function () { return ok(estado); },
    obtenerEstadisticas: function () { return ok(estado); },
    solicitarDrenaje: function () { return ok(estado); },
    importarPosicionesLegacy: function (items) { estado.pendientes += (items || []).length; return ok(estado); },
    verificarMigracion: function () { return ok({ verificada: true, plataforma: "browser" }); },
    detenerSiCorresponde: function () { return ok(estado); },
    obtenerDiagnosticoPolitica: function () { return ok(diagnostico); },
    configurarModoPolitica: function (mode) { diagnostico.enforcement.mode = mode || "WARN"; return ok(diagnostico); },
    continuarInicioConAdvertencia: function () { diagnostico.enforcement.userOverrideUsed = true; return ok(estado); },
    abrirConfiguracionPolitica: function () { return ok({ launched: false, resolvedDestination: "UNAVAILABLE", fallbackUsed: false }); },
    getPowerPolicyStatus: function () { return ok(diagnostico); },
    openPowerRestrictionSettings: function () { return ok(diagnostico); },
    requestBatteryOptimizationExemption: function () { return ok(diagnostico); },
    recheckPowerPolicy: function () { return ok(diagnostico); },
    presentPowerRemediation: function (diagnostic) { return ok(diagnostic || diagnostico); },
    suscribirEstadoSalud: function () { return undefined; }
};
module.exports = api;
