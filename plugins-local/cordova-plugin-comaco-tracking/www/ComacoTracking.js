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
    obtenerEstado: function () { return invoke("obtenerEstado"); },
    obtenerEstadisticas: function () { return invoke("obtenerEstadisticas"); },
    solicitarDrenaje: function (motivo) { return invoke("solicitarDrenaje", { motivo: motivo || "manual" }); },
    importarPosicionesLegacy: function (items) { return invoke("importarPosicionesLegacy", items || []); },
    verificarMigracion: function (esperado) { return invoke("verificarMigracion", esperado || {}); },
    detenerSiCorresponde: function () { return invoke("detenerSiCorresponde"); }
};
