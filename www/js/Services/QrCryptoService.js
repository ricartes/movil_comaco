// ================== CRYPTO QR GUIAS / TRAZABILIDAD ==================

var QR_GUIAS_PREFIJO_ASOCIACION = "GFEQRRET1:";
var QR_GUIAS_PREFIJO_LIBERACION = "GFEQRLIB1:";
var QR_GUIAS_TIPO_ASOCIACION = "QR_ASOCIACION_BORRADOR_GDE";
var QR_GUIAS_TIPO_LIBERACION = "QR_LIBERACION_BORRADOR_GDE";

function desencriptarQrGuias(textoQr) {
    if (!textoQr || typeof textoQr !== "string") {
        throw new Error("QR no corresponde a una confirmación de Guías.");
    }

    textoQr = textoQr.trim();
    var prefijo;
    if (textoQr.indexOf(QR_GUIAS_PREFIJO_ASOCIACION) === 0) {
        prefijo = QR_GUIAS_PREFIJO_ASOCIACION;
    } else if (textoQr.indexOf(QR_GUIAS_PREFIJO_LIBERACION) === 0) {
        prefijo = QR_GUIAS_PREFIJO_LIBERACION;
    } else {
        throw new Error("QR no corresponde a una confirmación de Guías.");
    }

    validarCryptoJsQrTrazabilidad();

    var envelope;
    try {
        envelope = JSON.parse(utf8Base64QrTrazabilidad(textoQr.substring(prefijo.length)));
    } catch (error) {
        throw new Error("QR de Guías dañado o alterado.");
    }

    if (!envelope || Number(envelope.v) !== 1 || envelope.alg !== "AES-256-CBC-HS256" ||
        !envelope.iv || !envelope.ct || !envelope.mac) {
        throw new Error("QR de Guías dañado o con versión no soportada.");
    }

    var key = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_AES_KEY_HEX);
    var hmacKey = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_HMAC_KEY_HEX);
    var macCalculado = CryptoJS.HmacSHA256(envelope.iv + "." + envelope.ct, hmacKey).toString(CryptoJS.enc.Hex);

    if (!compararHmacQrGuias(macCalculado, envelope.mac)) {
        throw new Error("QR de Guías dañado o alterado.");
    }

    var decrypted = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(envelope.ct) },
        key,
        {
            iv: CryptoJS.enc.Base64.parse(envelope.iv),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }
    );
    var json = decrypted.toString(CryptoJS.enc.Utf8);
    if (!json) {
        throw new Error("QR de Guías dañado o alterado.");
    }

    var compacto;
    try {
        compacto = JSON.parse(json);
    } catch (errorJson) {
        throw new Error("QR de Guías dañado o alterado.");
    }

    return expandirPayloadQrGuias(compacto, prefijo);
}

function expandirPayloadQrGuias(payload, prefijo) {
    if (!payload || Number(payload.v) !== 1) {
        throw new Error("Versión de QR de Guías no soportada.");
    }

    if (prefijo === QR_GUIAS_PREFIJO_ASOCIACION) {
        if (payload.t !== QR_GUIAS_TIPO_ASOCIACION) {
            throw new Error("El QR no corresponde a una asociación de borrador GDE.");
        }
        return validarPayloadAsociacionQrGuias({
            v: payload.v,
            tipo: payload.t,
            asociacionId: payload.a,
            qrIdOrigen: payload.q,
            idUnicoMovilTrazabilidad: payload.it,
            idUnicoMovilGde: payload.ig,
            fechaValidacion: payload.f,
            rolPredio: payload.r,
            rodal: payload.d,
            seccion: payload.s === undefined ? null : payload.s,
            aef: payload.e === undefined ? null : payload.e,
            pm: payload.p === undefined ? null : payload.p,
            latitudCarga: Number(payload.la),
            longitudCarga: Number(payload.lo),
            validadoGeocerca: Number(payload.vg),
            flagControl: payload.fc === null || payload.fc === undefined ? null : Number(payload.fc),
            resultado: payload.x
        });
    }

    if (payload.t !== QR_GUIAS_TIPO_LIBERACION) {
        throw new Error("El QR no corresponde a una liberación de borrador GDE.");
    }

    return validarPayloadLiberacionQrGuias({
        v: payload.v,
        tipo: payload.t,
        liberacionId: payload.l,
        asociacionId: payload.a,
        qrIdOrigen: payload.q,
        idUnicoMovilTrazabilidad: payload.it,
        idUnicoMovilGde: payload.ig,
        fechaLiberacion: payload.f,
        resultado: payload.x
    });
}

function validarPayloadAsociacionQrGuias(payload) {
    if (!payload.asociacionId || !payload.qrIdOrigen || !payload.idUnicoMovilTrazabilidad ||
        !payload.idUnicoMovilGde || !payload.fechaValidacion || !payload.rolPredio || !payload.rodal ||
        !isFinite(payload.latitudCarga) || !isFinite(payload.longitudCarga)) {
        throw new Error("El QR de asociación no contiene todos los datos obligatorios.");
    }

    if (!esFechaIsoQrGuias(payload.fechaValidacion)) {
        throw new Error("La fecha de validación del QR no es ISO válida.");
    }

    var validoDentro = payload.resultado === "VALIDADO_GEOCERCA" && payload.validadoGeocerca === 1;
    var validoAdvertencia = payload.resultado === "PERMITIDO_CON_ADVERTENCIA" &&
        payload.validadoGeocerca === 0 && payload.flagControl === 1;
    if (!validoDentro && !validoAdvertencia) {
        throw new Error("Resultado de validación incoherente.");
    }
    return payload;
}

function validarPayloadLiberacionQrGuias(payload) {
    if (!payload.liberacionId || !payload.asociacionId || !payload.qrIdOrigen ||
        !payload.idUnicoMovilTrazabilidad || !payload.idUnicoMovilGde ||
        !payload.fechaLiberacion || payload.resultado !== "BORRADOR_DESCARTADO") {
        throw new Error("El QR de liberación no contiene todos los datos obligatorios.");
    }
    if (!esFechaIsoQrGuias(payload.fechaLiberacion)) {
        throw new Error("La fecha de liberación del QR no es ISO válida.");
    }
    return payload;
}

function esFechaIsoQrGuias(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(valor)) return false;
    var fecha = new Date(valor);
    return !isNaN(fecha.getTime());
}

function compararHmacQrGuias(a, b) {
    a = String(a || "").toLowerCase();
    b = String(b || "").toLowerCase();
    if (a.length !== b.length) return false;

    var diferencia = 0;
    for (var i = 0; i < a.length; i++) {
        diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diferencia === 0;
}
