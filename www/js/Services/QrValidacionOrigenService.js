// ================== SERVICE ASOCIACION QR DE GUIAS ==================

var QR_GUIAS_TOLERANCIA_COORDENADAS = 0.000001;

async function procesarQrGuiasParaOrigen(qrOrigenSeleccionado, textoQr) {
    if (!qrOrigenSeleccionado || !qrOrigenSeleccionado.QR_ID) {
        throw new Error("Debe seleccionar un QR de Trazabilidad antes de leer Guías.");
    }

    var payload = desencriptarQrGuias(textoQr);
    if (String(payload.qrIdOrigen) !== String(qrOrigenSeleccionado.QR_ID)) {
        throw new Error("QR corresponde a otro viaje.");
    }
    if (String(payload.idUnicoMovilTrazabilidad) !== String(qrOrigenSeleccionado.ID_UNICO_MOVIL_GDE)) {
        throw new Error("El identificador móvil del viaje no coincide.");
    }
    if (qrOrigenSeleccionado.ESTADO === "ANULADO") {
        throw new Error("El QR original está anulado.");
    }

    if (payload.tipo === QR_GUIAS_TIPO_ASOCIACION) {
        validarCoordenadasAsociacionQrGuias(qrOrigenSeleccionado, payload);
        return DATOS_procesarAsociacionQrGde(payload, textoQr);
    }

    if (payload.tipo === QR_GUIAS_TIPO_LIBERACION) {
        return DATOS_procesarLiberacionQrGde(payload, textoQr);
    }

    throw new Error("El tipo de QR de Guías no es soportado.");
}

function validarCoordenadasAsociacionQrGuias(qrOrigen, payload) {
    var latitudOrigen = Number(qrOrigen.LATITUD_CARGA);
    var longitudOrigen = Number(qrOrigen.LONGITUD_CARGA);
    if (!isFinite(latitudOrigen) || !isFinite(longitudOrigen) ||
        !isFinite(payload.latitudCarga) || !isFinite(payload.longitudCarga)) {
        throw new Error("Las coordenadas de la asociación no son válidas.");
    }

    if (Math.abs(latitudOrigen - payload.latitudCarga) > QR_GUIAS_TOLERANCIA_COORDENADAS ||
        Math.abs(longitudOrigen - payload.longitudCarga) > QR_GUIAS_TOLERANCIA_COORDENADAS) {
        throw new Error("Las coordenadas corresponden a otra carga.");
    }
}

function mensajeResultadoQrGuias(resultado) {
    if (!resultado) return "Operación QR completada.";
    if (resultado.estado === "YA_ASOCIADO") return "Este QR ya está asociado a este borrador GDE.";
    if (resultado.estado === "ASOCIADO") {
        return resultado.qr && resultado.qr.resultado === "PERMITIDO_CON_ADVERTENCIA"
            ? "Validación asociada con advertencia. El punto estaba fuera de la geocerca y fue autorizado mediante FLAG_CONTROL."
            : "Punto de carga asociado correctamente con el borrador GDE.";
    }
    if (resultado.estado === "YA_LIBERADO") return "Este QR ya fue liberado.";
    if (resultado.estado === "LIBERADO") return "Asociación liberada. El QR puede asociarse nuevamente a una GDE.";
    return "Operación QR completada.";
}
