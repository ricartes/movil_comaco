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
    var textoSeguro = texto || "SELECCIONAR";

    $$("#texto_qr_trazabilidad")
        .text(textoSeguro)
        .attr("title", textoSeguro);
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
                $$('#combo_qr_trazabilidad').html('<option value="">SIN GUÍAS DISPONIBLES</option>');
                $$('#item-select-qr-trazabilidad').addClass("disabled");
                setTextoSmartSelectQrTrazabilidad("SIN GUÍAS DISPONIBLES");
                $$('#qr_trazabilidad_info').text('No existen guías disponibles para visualizar QR.');
                return;
            }

            guiasQrTrazabilidad = result.filter(esGuiaDisponibleParaQrTrazabilidad);

            if (guiasQrTrazabilidad.length === 0) {
                $$('#combo_qr_trazabilidad').html('<option value="">SIN GUÍAS DISPONIBLES</option>');
                $$('#item-select-qr-trazabilidad').addClass("disabled");
                setTextoSmartSelectQrTrazabilidad("SIN GUÍAS DISPONIBLES");
                $$('#qr_trazabilidad_info').text('No existen guías disponibles para visualizar QR.');
                return;
            }

            poblarComboQrTrazabilidad(guiasQrTrazabilidad);
        }
    );
}

function poblarComboQrTrazabilidad(guias) {
    var html = '<option value="">SELECCIONAR</option>';

    guias.forEach(function (gde) {
        var textoOpcion = construirTextoOpcionGuiaQrTrazabilidad(gde);

        html +=
            '<option value="' + escapeHtmlQrTrazabilidad(gde.ROWID) + '"' +
            ' data-display-as="' + escapeHtmlQrTrazabilidad(textoOpcion) + '">' +
            escapeHtmlQrTrazabilidad(textoOpcion) +
            '</option>';
    });

    $$('#combo_qr_trazabilidad').html(html);
    $$('#item-select-qr-trazabilidad').removeClass("disabled");

    setTextoSmartSelectQrTrazabilidad("SELECCIONAR");
}

function esGuiaDisponibleParaQrTrazabilidad(gde) {
    if (!gde || !gde.ID_UNICO_MOVIL) {
        return false;
    }

    if (gde.GDE_ESTADO_MOVIL === "N") {
        return false;
    }

    return true;
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

    var textoOpcionGuia = construirTextoOpcionGuiaQrTrazabilidad(guiaQrTrazabilidadSeleccionada);
    var textoGuia = construirTextoGuiaQrTrazabilidad(guiaQrTrazabilidadSeleccionada);

    setTextoSmartSelectQrTrazabilidad(textoOpcionGuia);
    $$('#qr_trazabilidad_info').text('Buscando QR de trazabilidad...');

    try {
        var qr = await DATOS_obtenerQrTrazabilidadPorGde(guiaQrTrazabilidadSeleccionada.ID_UNICO_MOVIL);

        if (!qr) {
            $$('#qr_trazabilidad_info').text('Esta guía aún no tiene QR. Debe capturar el punto carga madera.');
            return;
        }

        if (qr.ESTADO === "ANULADO") {
            $$('#qr_trazabilidad_info').text('El QR de esta guía está anulado.');
            $$('#qr_trazabilidad_estado').text("Estado: " + qr.ESTADO);
            return;
        }

        pintarQrTrazabilidad(qr.PAYLOAD_ENCRIPTADO, "real-bd");
        $$('#qr_trazabilidad_info').text(textoGuia);
        $$('#qr_trazabilidad_estado').text("Estado: " + (qr.ESTADO || ""));
        $$('#qr_trazabilidad_fecha').text("Fecha generación: " + formatearFechaQrTrazabilidad(qr.FECHA_GENERACION));
    } catch (ex) {
        console.error("[QR TRAZABILIDAD] Error obteniendo QR:", ex);
        $$('#qr_trazabilidad_info').text('No fue posible consultar el QR de trazabilidad.');
    }
}

function pintarQrTrazabilidad(textoQr, etiquetaDiagnostico) {
    var $contenedorQr = $$('#qrcode_trazabilidad');
    var configuracion = obtenerConfiguracionRenderQrTrazabilidad();

    $contenedorQr.html('');
    $contenedorQr.css({
        "display": "inline-block",
        "background-color": "#ffffff",
        "padding": configuracion.quietZone + "px",
        "line-height": "0",
        "box-sizing": "content-box"
    });

    if (!textoQr) {
        return;
    }

    textoQr = String(textoQr);
    registrarDiagnosticoTextoQrTrazabilidad(textoQr, etiquetaDiagnostico || "real");

    var qrGenerado = new QRCode("qrcode_trazabilidad", {
        text: textoQr,
        width: configuracion.tamano,
        height: configuracion.tamano,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });

    ajustarElementosRenderQrTrazabilidad(configuracion.tamano);

    var modulos = qrGenerado && qrGenerado._oQRCode ? qrGenerado._oQRCode.getModuleCount() : null;

    console.log("[QR TRAZABILIDAD] Render", {
        etiqueta: etiquetaDiagnostico || "real",
        tamanoPx: configuracion.tamano,
        quietZonePx: configuracion.quietZone,
        correccion: "M",
        modulos: modulos,
        pxPorModulo: modulos ? configuracion.tamano / modulos : null
    });
}

function obtenerConfiguracionRenderQrTrazabilidad() {
    var anchoVentana = window.innerWidth || document.documentElement.clientWidth || 360;

    if (anchoVentana >= 500) {
        return {
            tamano: 420,
            quietZone: 24
        };
    }

    if (anchoVentana >= 432) {
        return {
            tamano: 384,
            quietZone: 20
        };
    }

    return {
        tamano: 320,
        quietZone: 16
    };
}

function ajustarElementosRenderQrTrazabilidad(tamano) {
    var contenedor = document.getElementById("qrcode_trazabilidad");

    if (!contenedor) {
        return;
    }

    var elementos = contenedor.querySelectorAll("canvas, img, table");

    for (var i = 0; i < elementos.length; i++) {
        elementos[i].style.width = tamano + "px";
        elementos[i].style.height = tamano + "px";
        elementos[i].style.maxWidth = "none";
        elementos[i].style.maxHeight = "none";
        elementos[i].style.backgroundColor = "#ffffff";
    }
}

function registrarDiagnosticoTextoQrTrazabilidad(textoQr, origen) {
    console.log("[QR TRAZABILIDAD] Texto QR", {
        origen: origen,
        caracteres: textoQr.length,
        prefijo: textoQr.substring(0, 7),
        empiezaConGFEQR1: textoQr.indexOf("GFEQR1:") === 0
    });
}

function construirTextoOpcionGuiaQrTrazabilidad(gde) {
    if (!gde) {
        return "";
    }

    var guiaProveedor = normalizarTextoQrTrazabilidad(gde.GDE_GUIA_PROVEEDOR) || "S/F";
    var estado = obtenerTextoEstadoQrTrazabilidad(gde);
    var origen = normalizarTextoQrTrazabilidad(gde.GDE_NOMBRE_PREDIO);

    return [
        "Guia " + guiaProveedor,
        estado,
        abreviarTextoQrTrazabilidad(origen, 28)
    ].filter(function (valor) {
        return !!valor;
    }).join(" - ");
}

function construirTextoGuiaQrTrazabilidad(gde) {
    var estado = obtenerTextoEstadoQrTrazabilidad(gde);
    var destino = normalizarTextoQrTrazabilidad(gde.GDE_DESTINO || gde.GDE_NOMBRE_CLIENTE);
    var origen = normalizarTextoQrTrazabilidad(gde.GDE_NOMBRE_PREDIO);
    var guiaProveedor = normalizarTextoQrTrazabilidad(gde.GDE_GUIA_PROVEEDOR) || 'S/F';
    var patente = normalizarTextoQrTrazabilidad(gde.GDE_PATENTE_CAMION);

    return "Guia: " + guiaProveedor +
        " | Estado: " + estado +
        " | Origen: " + origen +
        " | Destino: " + destino +
        " | Camion: " + patente;
}

function normalizarTextoQrTrazabilidad(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor).replace(/\s+/g, " ").trim();
}

function abreviarTextoQrTrazabilidad(texto, largoMaximo) {
    texto = normalizarTextoQrTrazabilidad(texto);

    if (!texto || texto.length <= largoMaximo) {
        return texto;
    }

    return texto.substring(0, largoMaximo - 3).trim() + "...";
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
