/* Browser shim: conserva la API sin simular captura en segundo plano. */
var estado = { configurado: false, servicioActivo: false, seguimientosActivos: 0, pendientes: 0, plataforma: "browser" };
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
    detenerSiCorresponde: function () { return ok(estado); }
};
module.exports = api;
