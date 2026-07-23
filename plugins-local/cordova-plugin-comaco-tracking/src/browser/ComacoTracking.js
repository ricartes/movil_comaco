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
var auditoria = { ID_INSTALACION: "00000000-0000-4000-8000-000000000001", PENDIENTES: 0 };
var credencialInstalacion = { ID_INSTALACION: auditoria.ID_INSTALACION, TOKEN_INSTALACION: "browser-only-token" };
function ok(value) { return Promise.resolve(value); }
function eventId() { return "00000000-0000-4000-8000-" + String(Date.now()).padStart(12, "0").slice(-12); }
var api = {
    configurar: function () { estado.configurado = true; return ok(estado); },
    sincronizarSeguimientos: function (items) { estado.seguimientosActivos = (items || []).length; return ok(estado); },
    registrarSeguimiento: function () { estado.seguimientosActivos += 1; return ok(estado); },
    registrarSeguimientoLocal: function () { estado.seguimientosActivos += 1; estado.seguimientosLocales = (estado.seguimientosLocales || 0) + 1; return ok(estado); },
    cancelarSeguimientoLocal: function () { estado.seguimientosActivos = Math.max(0, estado.seguimientosActivos - 1); estado.seguimientosLocales = Math.max(0, (estado.seguimientosLocales || 0) - 1); return ok(estado); },
    registrarErrorTecnico: function () { return ok(estado); },
    finalizarSeguimiento: function () { estado.seguimientosActivos = Math.max(0, estado.seguimientosActivos - 1); return ok(estado); },
    prepararFinalizacionSeguimiento: function (id) { return ok({ ID_UNICO_SEGUIMIENTO: id, ESTADO: "PAUSADA_FINALIZACION", POSICIONES_SIN_ACK: 0, ACK_COMPLETO: true, TIMEOUT: false }); },
    cancelarPreparacionFinalizacionSeguimiento: function () { return ok(estado); },
    obtenerBuildInfo: function () { return ok({ DEBUG: false, PACKAGE_NAME: "browser", BUILD_TYPE: "browser" }); },
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
    prepararAuditoriaLogin: function (input) {
        var event = {
            ID_EVENTO: eventId(), ID_USUARIO_LOCAL: null, TIPO_EVENTO: "LOGIN",
            TIPO_LOGIN: (input && input.TIPO_LOGIN) || "ONLINE",
            FECHA_EVENTO_DISPOSITIVO_UTC: new Date().toISOString(),
            TENIA_INTERNET: true, CONFIGURACION_JSON: JSON.stringify(diagnostico)
        };
        auditoria.PENDIENTES += 1;
        return ok({ ID_INSTALACION: auditoria.ID_INSTALACION, VERSION_ESQUEMA: 1, EVENTO: event });
    },
    confirmarAuditoriaLoginOnline: function () { auditoria.PENDIENTES = Math.max(0, auditoria.PENDIENTES - 1); return ok(auditoria); },
    registrarAuditoriaLogin: function () { auditoria.PENDIENTES += 1; return ok(auditoria); },
    auditarConfiguracion: function () { return ok(auditoria); },
    solicitarDrenajeAuditoria: function () { return ok(auditoria); },
    descartarAuditoria: function () { auditoria.PENDIENTES = Math.max(0, auditoria.PENDIENTES - 1); return ok(auditoria); },
    obtenerEstadoAuditoria: function () { return ok(auditoria); },
    obtenerCredencialInstalacion: function () { return ok(credencialInstalacion); },
    suscribirEstadoSalud: function () { return undefined; }
};
module.exports = api;
