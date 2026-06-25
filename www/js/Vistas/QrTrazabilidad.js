// ================== QR TRAZABILIDAD ==================

var guiasQrTrazabilidad = [];
var guiaQrTrazabilidadSeleccionada = null;
var generandoQrTrazabilidad = false;

// IMPORTANTE:
// Estas claves son de desarrollo para levantar el flujo.
// Para producción deben definirse formalmente y deben coincidir con la app GDE.
var QR_TRAZABILIDAD_AES_KEY_HEX = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
var QR_TRAZABILIDAD_HMAC_KEY_HEX = "ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100";

$$(document).on('page:init', '.page[data-name="qr-trazabilidad"]', function () {
    inicializarQrTrazabilidad();

    var $page = $$('.page[data-name="qr-trazabilidad"]');

    $page.off('change', '#combo_qr_trazabilidad');
    $page.on('change', '#combo_qr_trazabilidad', function () {
        seleccionarGuiaQrTrazabilidad(this.value);
    });

    $page.off('click', '#btn_generar_qr_trazabilidad');
    $page.on('click', '#btn_generar_qr_trazabilidad', function () {
        generarQrTrazabilidad();
    });
});

function inicializarQrTrazabilidad() {
    guiasQrTrazabilidad = [];
    guiaQrTrazabilidadSeleccionada = null;
    generandoQrTrazabilidad = false;

    $$('#qrcode_trazabilidad').html('');
    $$('#qr_trazabilidad_estado').text('');
    $$('#qr_trazabilidad_expira').text('');
    $$('#qr_trazabilidad_info').text('Seleccione una guía para generar el QR.');
    setTextoSmartSelectQrTrazabilidad("SELECCIONAR");

    setBotonGenerarQrTrazabilidadHabilitado(false);

    cargarGuiasQrTrazabilidad();
}

function setTextoSmartSelectQrTrazabilidad(texto) {
    $$("#texto_qr_trazabilidad").text(texto || "SELECCIONAR");
}

function cargarGuiasQrTrazabilidad() {
    app.dialog.preloader("Cargando guías...");

    DATOS_seleccionar_gde_proveedor_por_estado_lista_PRUEBA(
        -1,
        "",
        "",
        -1,
        function (result) {
            try {
                app.dialog.close();
            } catch (e) { }

            if (result === -1 || result === "-1" || !Array.isArray(result) || result.length === 0) {
                guiasQrTrazabilidad = [];
                $$('#combo_qr_trazabilidad').html('<option value="">SIN GUÍAS</option>');
                $$('#item-select-qr-trazabilidad').addClass("disabled");
                setTextoSmartSelectQrTrazabilidad("SIN GUÍAS");

                $$('#qr_trazabilidad_info').text('No existen guías disponibles para generar QR.');
                return;
            }

            guiasQrTrazabilidad = result.filter(function (gde) {
                return gde &&
                    gde.ID_UNICO_MOVIL &&
                    gde.GDE_ESTADO_MOVIL !== "N";
            });

            if (guiasQrTrazabilidad.length === 0) {
                $$('#combo_qr_trazabilidad').html('<option value="">SIN GUÍAS VÁLIDAS</option>');
                $$('#item-select-qr-trazabilidad').addClass("disabled");
                setTextoSmartSelectQrTrazabilidad("SIN GUÍAS VÁLIDAS");

                $$('#qr_trazabilidad_info').text('No existen guías válidas para generar QR.');
                setBotonGenerarQrTrazabilidadHabilitado(false);
                return;
            }

            poblarComboQrTrazabilidad(guiasQrTrazabilidad);
        }
    );
}

function poblarComboQrTrazabilidad(guias) {
    var html = '<option value="">SELECCIONAR</option>';

    guias.forEach(function (gde) {
        var texto = construirTextoGuiaQrTrazabilidad(gde);

        html +=
            '<option value="' + escapeHtmlQrTrazabilidad(gde.ROWID) + '">' +
            escapeHtmlQrTrazabilidad(texto) +
            '</option>';
    });

    $$('#combo_qr_trazabilidad').html(html);
    $$('#item-select-qr-trazabilidad').removeClass("disabled");

    setTextoSmartSelectQrTrazabilidad("SELECCIONAR");
}

function seleccionarGuiaQrTrazabilidad(rowid) {
    $$('#qrcode_trazabilidad').html('');
    $$('#qr_trazabilidad_estado').text('');
    $$('#qr_trazabilidad_expira').text('');

    if (!rowid) {
        guiaQrTrazabilidadSeleccionada = null;

        setTextoSmartSelectQrTrazabilidad("SELECCIONAR");

        $$('#qr_trazabilidad_info').text('Seleccione una guía para generar el QR.');
        setBotonGenerarQrTrazabilidadHabilitado(false);

        return;
    }

    guiaQrTrazabilidadSeleccionada =
        guiasQrTrazabilidad.find(function (gde) {
            return String(gde.ROWID) === String(rowid);
        }) || null;

    if (!guiaQrTrazabilidadSeleccionada) {
        guiaQrTrazabilidadSeleccionada = null;

        setTextoSmartSelectQrTrazabilidad("SELECCIONAR");

        $$('#qr_trazabilidad_info').text('No fue posible obtener la guía seleccionada.');
        setBotonGenerarQrTrazabilidadHabilitado(false);

        return;
    }

    var textoGuia = construirTextoGuiaQrTrazabilidad(guiaQrTrazabilidadSeleccionada);

    setTextoSmartSelectQrTrazabilidad(textoGuia);

    $$('#qr_trazabilidad_info').text(textoGuia);

    setBotonGenerarQrTrazabilidadHabilitado(true);
}

function generarQrTrazabilidad() {
    if (generandoQrTrazabilidad) {
        return;
    }

    if (!guiaQrTrazabilidadSeleccionada) {
        app.dialog.alert("Debe seleccionar una guía.", "GFE");
        return;
    }

    app.dialog.confirm(
        "¿Desea generar el QR de trazabilidad para la guía seleccionada?",
        "GFE",
        async function () {
            generandoQrTrazabilidad = true;
            setBotonGenerarQrTrazabilidadHabilitado(false);

            app.dialog.preloader("Generando QR...");

            try {
                var gde = await obtenerGdeQrTrazabilidadAsync(
                    guiaQrTrazabilidadSeleccionada.ROWID
                );

                if (!gde || gde === -1 || gde === "-1") {
                    app.dialog.alert("No fue posible recargar la guía seleccionada.", "GFE");
                    return;
                }

                if (!gde.ID_UNICO_MOVIL) {
                    app.dialog.alert("La guía no tiene ID_UNICO_MOVIL.", "GFE");
                    return;
                }

                var resultado = generarPayloadEncriptadoQrTrazabilidad(gde);

                pintarQrTrazabilidad(resultado.textoQr);

                $$('#qr_trazabilidad_estado').text("QR generado correctamente.");
                $$('#qr_trazabilidad_expira').text(
                    "Vigente hasta: " + resultado.fechaExpiracionTexto
                );

                app.dialog.alert("QR de trazabilidad generado correctamente.", "GFE");

            } catch (ex) {
                console.error("[QR TRAZABILIDAD] Error:", ex);

                app.dialog.alert(
                    ex && ex.message
                        ? ex.message
                        : "Ocurrió un error al generar el QR.",
                    "GFE"
                );

            } finally {
                try {
                    app.dialog.close();
                } catch (e) { }

                generandoQrTrazabilidad = false;
                refrescarBotonQrTrazabilidad();
            }
        }
    );
}

function obtenerGdeQrTrazabilidadAsync(rowid) {
    return new Promise(function (resolve) {
        DATOS_seleccionar_gde_proveedor(rowid, function (result) {
            resolve(result);
        });
    });
}

function generarPayloadEncriptadoQrTrazabilidad(gde) {
    var ahora = new Date();
    var expiracion = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));

    var payload = {
        v: 1,
        tipo: "QR_TRAZABILIDAD_ORIGEN",
        idUnicoMovil: gde.ID_UNICO_MOVIL,
        fechaGeneracion: ahora.toISOString(),
        fechaExpiracion: expiracion.toISOString()
    };

    var textoQr = encriptarPayloadQrTrazabilidad(payload);

    return {
        payload: payload,
        textoQr: textoQr,
        fechaExpiracionTexto: formatearFechaQrTrazabilidad(expiracion)
    };
}

function encriptarPayloadQrTrazabilidad(payload) {
    if (typeof CryptoJS === "undefined") {
        throw new Error("CryptoJS no está disponible. Verifique jsrsasign-all-min.js en index.html.");
    }

    var key = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_AES_KEY_HEX);
    var hmacKey = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_HMAC_KEY_HEX);
    var iv = CryptoJS.lib.WordArray.random(16);

    var json = JSON.stringify(payload);

    var encrypted = CryptoJS.AES.encrypt(json, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    var ivBase64 = iv.toString(CryptoJS.enc.Base64);
    var ctBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);

    var dataToSign = ivBase64 + "." + ctBase64;
    var mac = CryptoJS.HmacSHA256(dataToSign, hmacKey).toString(CryptoJS.enc.Hex);

    var envelope = {
        v: 1,
        alg: "AES-256-CBC-HS256",
        iv: ivBase64,
        ct: ctBase64,
        mac: mac
    };

    return "GFEQR1:" + base64Utf8QrTrazabilidad(JSON.stringify(envelope));
}

// Función útil para que luego la app GDE pueda implementar lo inverso.
// No se usa todavía en esta pantalla, pero sirve para pruebas locales.
function desencriptarPayloadQrTrazabilidad(textoQr) {
    if (!textoQr || textoQr.indexOf("GFEQR1:") !== 0) {
        throw new Error("Formato QR no válido.");
    }

    var envelopeJson = utf8Base64QrTrazabilidad(textoQr.replace("GFEQR1:", ""));
    var envelope = JSON.parse(envelopeJson);

    var key = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_AES_KEY_HEX);
    var hmacKey = CryptoJS.enc.Hex.parse(QR_TRAZABILIDAD_HMAC_KEY_HEX);

    var dataToSign = envelope.iv + "." + envelope.ct;
    var macCalculado = CryptoJS.HmacSHA256(dataToSign, hmacKey).toString(CryptoJS.enc.Hex);

    if (macCalculado !== envelope.mac) {
        throw new Error("QR alterado o clave incorrecta.");
    }

    var decrypted = CryptoJS.AES.decrypt(
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

    var json = decrypted.toString(CryptoJS.enc.Utf8);

    if (!json) {
        throw new Error("No fue posible desencriptar el QR.");
    }

    return JSON.parse(json);
}

function pintarQrTrazabilidad(textoQr) {
    $$('#qrcode_trazabilidad').html('');

    new QRCode("qrcode_trazabilidad", {
        text: textoQr,
        width: 220,
        height: 220,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

function refrescarBotonQrTrazabilidad() {
    setBotonGenerarQrTrazabilidadHabilitado(
        !!guiaQrTrazabilidadSeleccionada && generandoQrTrazabilidad === false
    );
}

function setBotonGenerarQrTrazabilidadHabilitado(habilitar) {
    var $btn = $$('#btn_generar_qr_trazabilidad');

    if (habilitar) {
        $btn.removeClass('disabled color-gray');
        $btn.removeAttr('disabled');
    } else {
        $btn.addClass('disabled color-gray');
        $btn.attr('disabled', 'disabled');
    }
}

function construirTextoGuiaQrTrazabilidad(gde) {
    var estado = obtenerTextoEstadoQrTrazabilidad(gde);
    var destino = gde.GDE_DESTINO || gde.GDE_NOMBRE_CLIENTE || '';
    var origen = gde.GDE_NOMBRE_PREDIO || '';
    var guiaProveedor = gde.GDE_GUIA_PROVEEDOR || 'S/F';
    var patente = gde.GDE_PATENTE_CAMION || '';

    return "Guía: " + guiaProveedor +
        " | Estado: " + estado +
        " | Origen: " + origen +
        " | Destino: " + destino +
        " | Camión: " + patente;
}

function obtenerTextoEstadoQrTrazabilidad(gde) {
    if (!gde) {
        return "";
    }

    if (gde.GDE_ESTADO_MOVIL === "B") return "BORRADOR";
    if (gde.GDE_ESTADO_MOVIL === "M") return "EMITIDA";
    if (gde.GDE_ESTADO_MOVIL === "P") return "PROVISORIA";
    if (gde.GDE_ESTADO_MOVIL === "I") return "IMPRESA";
    if (gde.GDE_ESTADO_MOVIL === "E" || gde.ENVIADO === 1) return "ENVIADA";
    if (gde.GDE_ESTADO_MOVIL === "N") return "ANULADA";

    return gde.GDE_ESTADO_MOVIL || "";
}

function formatearFechaQrTrazabilidad(fecha) {
    var dia = String(fecha.getDate()).padStart(2, "0");
    var mes = String(fecha.getMonth() + 1).padStart(2, "0");
    var anio = fecha.getFullYear();

    var hora = String(fecha.getHours()).padStart(2, "0");
    var minuto = String(fecha.getMinutes()).padStart(2, "0");

    return dia + "-" + mes + "-" + anio + " " + hora + ":" + minuto;
}

function base64Utf8QrTrazabilidad(texto) {
    return btoa(unescape(encodeURIComponent(texto)));
}

function utf8Base64QrTrazabilidad(textoBase64) {
    return decodeURIComponent(escape(atob(textoBase64)));
}

function escapeHtmlQrTrazabilidad(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}