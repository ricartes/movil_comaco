// ================== QR TRAZABILIDAD ==================

var guiasQrTrazabilidad = [];
var guiaQrTrazabilidadSeleccionada = null;

$$(document).on('page:init', '.page[data-name="qr-trazabilidad"]', function () {
    inicializarQrTrazabilidad();

    var $page = $$('.page[data-name="qr-trazabilidad"]');

    $page.off('change', '#combo_qr_trazabilidad');
    $page.on('change', '#combo_qr_trazabilidad', function () {
        seleccionarGuiaQrTrazabilidad(this.value);
    });
});

function inicializarQrTrazabilidad() {
    guiasQrTrazabilidad = [];
    guiaQrTrazabilidadSeleccionada = null;

    limpiarDetalleQrTrazabilidad();
    $$('#qr_trazabilidad_info').text('Seleccione una guía para visualizar su QR.');
    setTextoSmartSelectQrTrazabilidad("SELECCIONAR");

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
                $$('#combo_qr_trazabilidad').html('<option value="">SIN GUÍAS EMITIDAS</option>');
                $$('#item-select-qr-trazabilidad').addClass("disabled");
                setTextoSmartSelectQrTrazabilidad("SIN GUÍAS EMITIDAS");
                $$('#qr_trazabilidad_info').text('No existen guías emitidas disponibles para visualizar QR.');
                return;
            }

            guiasQrTrazabilidad = result.filter(esGuiaEmitidaParaQrTrazabilidad);

            if (guiasQrTrazabilidad.length === 0) {
                $$('#combo_qr_trazabilidad').html('<option value="">SIN GUÍAS EMITIDAS</option>');
                $$('#item-select-qr-trazabilidad').addClass("disabled");
                setTextoSmartSelectQrTrazabilidad("SIN GUÍAS EMITIDAS");
                $$('#qr_trazabilidad_info').text('No existen guías emitidas disponibles para visualizar QR.');
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

function esGuiaEmitidaParaQrTrazabilidad(gde) {
    if (!gde || !gde.ID_UNICO_MOVIL) {
        return false;
    }

    if (gde.GDE_ESTADO_MOVIL === "N") {
        return false;
    }

    return gde.GDE_ESTADO_MOVIL === "M" ||
        gde.GDE_ESTADO_MOVIL === "I" ||
        gde.GDE_ESTADO_MOVIL === "E" ||
        gde.ENVIADO === 1 ||
        gde.ENVIADO === "1";
}

async function seleccionarGuiaQrTrazabilidad(rowid) {
    limpiarDetalleQrTrazabilidad();

    if (!rowid) {
        guiaQrTrazabilidadSeleccionada = null;
        setTextoSmartSelectQrTrazabilidad("SELECCIONAR");
        $$('#qr_trazabilidad_info').text('Seleccione una guía para visualizar su QR.');
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
        return;
    }

    var textoGuia = construirTextoGuiaQrTrazabilidad(guiaQrTrazabilidadSeleccionada);
    setTextoSmartSelectQrTrazabilidad(textoGuia);
    $$('#qr_trazabilidad_info').text('Buscando QR de trazabilidad...');

    try {
        var qr = await DATOS_obtenerQrTrazabilidadPorGde(guiaQrTrazabilidadSeleccionada.ID_UNICO_MOVIL);

        if (!qr) {
            $$('#qr_trazabilidad_info').text('Esta guía aún no tiene QR. Debe capturar el punto carga madera en el flujo de trazabilidad.');
            return;
        }

        pintarQrTrazabilidad(qr.PAYLOAD_ENCRIPTADO);
        $$('#qr_trazabilidad_info').text(textoGuia);
        $$('#qr_trazabilidad_estado').text("Estado: " + (qr.ESTADO || ""));
        $$('#qr_trazabilidad_fecha').text("Fecha generación: " + formatearFechaQrTrazabilidad(qr.FECHA_GENERACION));
    } catch (ex) {
        console.error("[QR TRAZABILIDAD] Error obteniendo QR:", ex);
        $$('#qr_trazabilidad_info').text('No fue posible consultar el QR de trazabilidad.');
    }
}

function pintarQrTrazabilidad(textoQr) {
    $$('#qrcode_trazabilidad').html('');

    if (!textoQr) {
        return;
    }

    new QRCode("qrcode_trazabilidad", {
        text: textoQr,
        width: 220,
        height: 220,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
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
    if (gde.GDE_ESTADO_MOVIL === "I") return "INFORMADA LOCALMENTE";
    if (gde.GDE_ESTADO_MOVIL === "E" || gde.ENVIADO === 1 || gde.ENVIADO === "1") return "ENVIADA";
    if (gde.GDE_ESTADO_MOVIL === "N") return "ANULADA";

    return gde.GDE_ESTADO_MOVIL || "";
}

function formatearFechaQrTrazabilidad(fechaTexto) {
    if (!fechaTexto) {
        return "";
    }

    var fecha = new Date(fechaTexto);

    if (isNaN(fecha.getTime())) {
        return fechaTexto;
    }

    var dia = String(fecha.getDate()).padStart(2, "0");
    var mes = String(fecha.getMonth() + 1).padStart(2, "0");
    var anio = fecha.getFullYear();

    var hora = String(fecha.getHours()).padStart(2, "0");
    var minuto = String(fecha.getMinutes()).padStart(2, "0");

    return dia + "-" + mes + "-" + anio + " " + hora + ":" + minuto;
}

function limpiarDetalleQrTrazabilidad() {
    $$('#qrcode_trazabilidad').html('');
    $$('#qr_trazabilidad_estado').text('');
    $$('#qr_trazabilidad_fecha').text('');
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
