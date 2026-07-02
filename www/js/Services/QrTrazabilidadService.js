// ================== SERVICE QR TRAZABILIDAD ==================

var EstadoQrTrazabilidad = {
    PENDIENTE_VALIDACION: "PENDIENTE_VALIDACION",
    VALIDADO_GDE: "VALIDADO_GDE",
    ANULADO: "ANULADO"
};

var VigenciaQrTrazabilidad = {
    POR_VIAJE: "POR_VIAJE"
};

// Claves de desarrollo.
// Deben ser las mismas en APP Trazabilidad y APP Guías.
var QR_TRAZABILIDAD_AES_KEY_HEX = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
var QR_TRAZABILIDAD_HMAC_KEY_HEX = "ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100";

var QR_TRAZABILIDAD_FECHA_EXPIRACION_TECNICA = "9999-12-31T23:59:59.999Z";

async function generarQrTrazabilidadPorPuntoCarga(gde, coordenadaCarga) {
    if (!gde || !gde.ID_UNICO_MOVIL) {
        return {
            ok: false,
            mensaje: "La guía no tiene ID_UNICO_MOVIL válido."
        };
    }

    const qrExistente = await DATOS_obtenerQrTrazabilidadPorGde(gde.ID_UNICO_MOVIL);

    if (qrExistente) {
        return {
            ok: true,
            yaExistia: true,
            mensaje: "La guía ya tiene QR de trazabilidad generado.",
            qr: qrExistente
        };
    }

    const resultado = generarPayloadEncriptadoQrTrazabilidad(gde, coordenadaCarga);

    await DATOS_guardarQrTrazabilidadOrigen({
        QR_ID: resultado.qrId,
        ID_UNICO_MOVIL_GDE: gde.ID_UNICO_MOVIL,
        FECHA_GENERACION: resultado.fechaGeneracion,
        FECHA_EXPIRACION: resultado.fechaExpiracion,
        ESTADO: EstadoQrTrazabilidad.PENDIENTE_VALIDACION,

        LATITUD_CARGA: resultado.latitudCarga,
        LONGITUD_CARGA: resultado.longitudCarga,
        ACCURACY_CARGA: resultado.accuracyCarga,

        COD_ORIGEN: resultado.codOrigen,
        ROL_ORIGEN: resultado.rolOrigen,
        ROL_COMUNA_ORIGEN: resultado.rolComunaOrigen,

        VIGENCIA_TIPO: resultado.vigenciaTipo,

        PAYLOAD_ENCRIPTADO: resultado.textoQr,
        PAYLOAD_HASH: resultado.payloadHash
    });

    const qrGuardado = await DATOS_obtenerQrTrazabilidadPorGde(gde.ID_UNICO_MOVIL);

    if (qrGuardado) {
        console.log("[QR TRAZABILIDAD] Verificacion BD", {
            qrId: resultado.qrId,
            textoFinalIgualPayloadEncriptado: qrGuardado.PAYLOAD_ENCRIPTADO === resultado.textoQr,
            caracteresGenerados: resultado.textoQr.length,
            caracteresBd: qrGuardado.PAYLOAD_ENCRIPTADO ? String(qrGuardado.PAYLOAD_ENCRIPTADO).length : 0,
            prefijoBd: qrGuardado.PAYLOAD_ENCRIPTADO ? String(qrGuardado.PAYLOAD_ENCRIPTADO).substring(0, 7) : "",
            bdEmpiezaConGFEQR1: qrGuardado.PAYLOAD_ENCRIPTADO ? String(qrGuardado.PAYLOAD_ENCRIPTADO).indexOf("GFEQR1:") === 0 : false
        });
    }

    return {
        ok: true,
        yaExistia: false,
        mensaje: "QR de trazabilidad generado correctamente.",
        qr: qrGuardado
    };
}

function generarPayloadEncriptadoQrTrazabilidad(gde, coordenadaCarga) {
    validarCryptoJsQrTrazabilidad();

    const ahora = new Date();
    const qrId = "qr_ori_" + obtener_IDUNICO();

    const latitudCarga = coordenadaCarga ? coordenadaCarga.latitud : null;
    const longitudCarga = coordenadaCarga ? coordenadaCarga.longitud : null;
    const accuracyCarga = coordenadaCarga ? coordenadaCarga.accuracy : null;

    const payload = {
        v: 1,
        tipo: "QR_TRAZABILIDAD_ORIGEN",

        qrId: qrId,
        idUnicoMovil: gde.ID_UNICO_MOVIL,

        fechaGeneracion: ahora.toISOString(),

        latitudCarga: latitudCarga,
        longitudCarga: longitudCarga,
        accuracyCarga: accuracyCarga,

        codOrigen: gde.GDE_COD_ORIGEN || null,
        rolOrigen: gde.GDE_ROL || null,
        rolComunaOrigen: gde.GDE_ROL_COMUNA || null
    };

    const textoQr = encriptarPayloadQrTrazabilidad(payload);
    const payloadHash = CryptoJS.SHA256(textoQr).toString(CryptoJS.enc.Hex);

    registrarDiagnosticoPayloadQrTrazabilidad(payload, textoQr);

    return {
        qrId: qrId,
        payload: payload,
        textoQr: textoQr,
        payloadHash: payloadHash,

        fechaGeneracion: payload.fechaGeneracion,
        fechaExpiracion: QR_TRAZABILIDAD_FECHA_EXPIRACION_TECNICA,
        vigenciaTipo: VigenciaQrTrazabilidad.POR_VIAJE,

        latitudCarga: latitudCarga,
        longitudCarga: longitudCarga,
        accuracyCarga: accuracyCarga,

        codOrigen: payload.codOrigen,
        rolOrigen: payload.rolOrigen,
        rolComunaOrigen: payload.rolComunaOrigen
    };
}

function encriptarPayloadQrTrazabilidad(payload) {
    validarCryptoJsQrTrazabilidad();

    const key = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_AES_KEY_HEX);
    const hmacKey = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_HMAC_KEY_HEX);
    const iv = CryptoJS.lib.WordArray.random(16);

    const json = JSON.stringify(payload);

    const encrypted = CryptoJS.AES.encrypt(json, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    const ivBase64 = iv.toString(CryptoJS.enc.Base64);
    const ctBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);

    const dataToSign = ivBase64 + "." + ctBase64;
    const mac = CryptoJS.HmacSHA256(dataToSign, hmacKey).toString(CryptoJS.enc.Hex);

    const envelope = {
        v: 1,
        alg: "AES-256-CBC-HS256",
        iv: ivBase64,
        ct: ctBase64,
        mac: mac
    };

    return "GFEQR1:" + base64Utf8QrTrazabilidad(JSON.stringify(envelope));
}

function registrarDiagnosticoPayloadQrTrazabilidad(payload, textoQr) {
    const payloadJson = JSON.stringify(payload);

    console.log("[QR TRAZABILIDAD] Texto QR generado", {
        caracteresPayloadJsonAntesEncriptar: payloadJson.length,
        caracteresTextoQrFinal: textoQr.length,
        prefijo: textoQr.substring(0, 7),
        empiezaConGFEQR1: textoQr.indexOf("GFEQR1:") === 0,
        camposPayload: Object.keys(payload).length,
        camposIncluidos: Object.keys(payload)
    });
}

function desencriptarPayloadQrTrazabilidad(textoQr) {
    validarCryptoJsQrTrazabilidad();

    if (!textoQr || textoQr.indexOf("GFEQR1:") !== 0) {
        throw new Error("Formato QR no válido.");
    }

    const envelopeJson = utf8Base64QrTrazabilidad(textoQr.replace("GFEQR1:", ""));
    const envelope = JSON.parse(envelopeJson);

    const key = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_AES_KEY_HEX);
    const hmacKey = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_HMAC_KEY_HEX);

    const dataToSign = envelope.iv + "." + envelope.ct;
    const macCalculado = CryptoJS.HmacSHA256(dataToSign, hmacKey).toString(CryptoJS.enc.Hex);

    if (macCalculado !== envelope.mac) {
        throw new Error("QR alterado o clave incorrecta.");
    }

    const decrypted = CryptoJS.AES.decrypt(
        {
            ciphertext: CryptoJS.enc.Base64.parse(envelope.ct)
        },
        key,
        {
            iv: CryptoJS.enc.Base64.parse(envelope.iv),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }
    );

    const json = decrypted.toString(CryptoJS.enc.Utf8);

    if (!json) {
        throw new Error("No fue posible desencriptar el QR.");
    }

    return JSON.parse(json);
}

function base64Utf8QrTrazabilidad(texto) {
    return btoa(unescape(encodeURIComponent(texto)));
}

function utf8Base64QrTrazabilidad(textoBase64) {
    return decodeURIComponent(escape(atob(textoBase64)));
}

function validarCryptoJsQrTrazabilidad() {
    if (typeof CryptoJS === "undefined") {
        throw new Error("CryptoJS no está disponible. Verifique jsrsasign-all-min.js en index.html.");
    }
}
