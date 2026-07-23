// ================== QR TRAZABILIDAD ==================

var guiasQrTrazabilidad = [];
var guiaQrTrazabilidadSeleccionada = null;
var qrTrazabilidadOrigenSeleccionado = null;

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
    qrTrazabilidadOrigenSeleccionado = null;

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

        pintarQrTrazabilidad(qr.PAYLOAD_ENCRIPTADO, "#qrcode_trazabilidad", null, "real-bd");
        qrTrazabilidadOrigenSeleccionado = qr;
        $$('#qr_trazabilidad_info').text(textoGuia);
        $$('#qr_trazabilidad_estado').text("Estado: " + (qr.ESTADO || ""));
        pintarEstadoAsociacionQrTrazabilidad(qr);
        $$('#qr_trazabilidad_fecha').text("Fecha generación: " + formatearFechaQrTrazabilidad(qr.FECHA_GENERACION));
    } catch (ex) {
        console.error("[QR TRAZABILIDAD] Error obteniendo QR:", ex);
        $$('#qr_trazabilidad_info').text('No fue posible consultar el QR de trazabilidad.');
    }
}

function pintarQrTrazabilidad(textoQr, contenedor, tamanoOpcional, etiquetaDiagnostico) {
    var elementoContenedor = resolverContenedorQrTrazabilidad(contenedor);
    var $contenedorQr;
    var configuracion = obtenerConfiguracionRenderQrTrazabilidad(tamanoOpcional);

    if (!elementoContenedor) {
        console.error("[QR TRAZABILIDAD] Contenedor de render no disponible.", contenedor);
        return null;
    }

    $contenedorQr = $$(elementoContenedor);

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

    var qrGenerado = new QRCode(elementoContenedor, {
        text: textoQr,
        width: configuracion.tamano,
        height: configuracion.tamano,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });

    ajustarElementosRenderQrTrazabilidad(elementoContenedor, configuracion.tamano);

    var modulos = qrGenerado && qrGenerado._oQRCode ? qrGenerado._oQRCode.getModuleCount() : null;

    console.log("[QR TRAZABILIDAD] Render", {
        etiqueta: etiquetaDiagnostico || "real",
        tamanoPx: configuracion.tamano,
        quietZonePx: configuracion.quietZone,
        correccion: "M",
        modulos: modulos,
        pxPorModulo: modulos ? configuracion.tamano / modulos : null
    });

    return qrGenerado;
}

function resolverContenedorQrTrazabilidad(contenedor) {
    if (!contenedor) {
        return null;
    }

    if (typeof contenedor === "string") {
        return document.querySelector(contenedor) || document.getElementById(contenedor);
    }

    if (contenedor.nodeType === 1) {
        return contenedor;
    }

    if (contenedor[0] && contenedor[0].nodeType === 1) {
        return contenedor[0];
    }

    return null;
}

function obtenerConfiguracionRenderQrTrazabilidad(tamanoOpcional) {
    var anchoVentana = window.innerWidth || document.documentElement.clientWidth || 360;

    if (Number(tamanoOpcional) > 0) {
        var tamanoSolicitado = Math.floor(Number(tamanoOpcional));

        return {
            tamano: tamanoSolicitado,
            quietZone: Math.max(12, Math.round(tamanoSolicitado * 0.05))
        };
    }

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

function ajustarElementosRenderQrTrazabilidad(contenedor, tamano) {
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

function mostrarQrTrazabilidadPuntoCarga(resultadoQr, latitudCapturada, longitudCapturada) {
    var qr = resultadoQr && resultadoQr.qr ? resultadoQr.qr : null;

    if (!qr || !qr.PAYLOAD_ENCRIPTADO) {
        throw new Error("El QR generado no contiene PAYLOAD_ENCRIPTADO.");
    }

    var latitudCarga = qr.LATITUD_CARGA !== null && qr.LATITUD_CARGA !== undefined
        ? qr.LATITUD_CARGA
        : latitudCapturada;
    var longitudCarga = qr.LONGITUD_CARGA !== null && qr.LONGITUD_CARGA !== undefined
        ? qr.LONGITUD_CARGA
        : longitudCapturada;
    var fechaGeneracion = formatearFechaQrTrazabilidad(qr.FECHA_GENERACION);
    var tamanoQr = Math.max(220, Math.min(420, (window.innerWidth || 360) - 64));
    var popup = app.popup.create({
        closeByBackdropClick: true,
        content:
            '<div class="popup qr-trazabilidad-punto-carga-popup">' +
                '<div class="view">' +
                    '<div class="page">' +
                        '<div class="navbar"><div class="navbar-inner">' +
                            '<div class="title">QR Trazabilidad</div>' +
                            '<div class="right"><a href="#" class="link popup-close">Cerrar</a></div>' +
                        '</div></div>' +
                        '<div class="page-content">' +
                            '<div class="block text-align-center">' +
                                '<h3>Punto carga madera registrado correctamente</h3>' +
                                '<div id="qrcode_trazabilidad_punto_carga" class="qr-trazabilidad-popup-qr"></div>' +
                            '</div>' +
                            '<div class="block qr-trazabilidad-popup-datos">' +
                                '<p><strong>Latitud carga:</strong> ' + escapeHtmlQrTrazabilidad(latitudCarga) + '</p>' +
                                '<p><strong>Longitud carga:</strong> ' + escapeHtmlQrTrazabilidad(longitudCarga) + '</p>' +
                                '<p><strong>Fecha generación:</strong> ' + escapeHtmlQrTrazabilidad(fechaGeneracion) + '</p>' +
                            '</div>' +
                            '<div class="block"><a href="#" class="button button-big button-fill popup-close">CONTINUAR</a></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>',
        on: {
            opened: function () {
                pintarQrTrazabilidad(
                    qr.PAYLOAD_ENCRIPTADO,
                    "#qrcode_trazabilidad_punto_carga",
                    tamanoQr,
                    resultadoQr.yaExistia === true ? "punto-carga-existente" : "punto-carga-nuevo"
                );
            },
            closed: function () {
                popup.destroy();
            }
        }
    });

    popup.open();
    return popup;
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
    qrTrazabilidadOrigenSeleccionado = null;
    $$('#qrcode_trazabilidad').html('');
    $$('#qr_trazabilidad_estado').text('');
    $$('#qr_trazabilidad_fecha').text('');
    $$('#qr_trazabilidad_asociacion_datos').html('').css('display', 'none');
    $$('#qr_trazabilidad_fila_leer_guias').css('display', 'none');
}

function pintarEstadoAsociacionQrTrazabilidad(qr) {
    var html = '';
    $$('#qr_trazabilidad_fila_leer_guias').css('display', 'none');

    if (qr.ESTADO === 'PENDIENTE_VALIDACION') {
        if (qr.LIBERACION_ID) {
            html = '<p><strong>Asociación anterior:</strong> LIBERADA</p>' +
                '<p>Este QR puede asociarse nuevamente para la misma carga física.</p>';
            $$('#qr_trazabilidad_asociacion_datos').html(html).css('display', 'block');
        }
        $$('#qr_trazabilidad_btn_leer_guias').text('LEER QR DE GUÍAS');
        $$('#qr_trazabilidad_fila_leer_guias').css('display', 'block');
        return;
    }

    if (qr.ESTADO === 'ASOCIADO_BORRADOR_GDE') {
        html = '<p><strong>GDE asociada:</strong> ' + escapeHtmlQrTrazabilidad(qr.ID_UNICO_MOVIL_GDE_ASOCIADO) + '</p>' +
            '<p><strong>Predio:</strong> ' + escapeHtmlQrTrazabilidad(qr.ROL_PREDIO_VALIDADO) + '</p>' +
            '<p><strong>Rodal:</strong> ' + escapeHtmlQrTrazabilidad(qr.RODAL_VALIDADO) + '</p>' +
            (qr.SECCION_VALIDADA ? '<p><strong>Sección:</strong> ' + escapeHtmlQrTrazabilidad(qr.SECCION_VALIDADA) + '</p>' : '') +
            '<p><strong>AEF:</strong> ' + escapeHtmlQrTrazabilidad(qr.AEF_VALIDADO) + '</p>' +
            '<p><strong>PM:</strong> ' + escapeHtmlQrTrazabilidad(qr.PM_VALIDADO) + '</p>' +
            '<p><strong>Resultado:</strong> ' + escapeHtmlQrTrazabilidad(qr.RESULTADO_VALIDACION_GDE) + '</p>' +
            '<p><strong>Fecha validación:</strong> ' + escapeHtmlQrTrazabilidad(formatearFechaQrTrazabilidad(qr.FECHA_VALIDACION_GDE)) + '</p>' +
            '<p>Este QR no puede asociarse con otro borrador mientras la asociación siga activa.</p>';
        $$('#qr_trazabilidad_asociacion_datos').html(html).css('display', 'block');
        $$('#qr_trazabilidad_btn_leer_guias').text('LEER QR DE LIBERACIÓN');
        $$('#qr_trazabilidad_fila_leer_guias').css('display', 'block');
    }
}

function obtenerLectorQrGuiasTrazabilidad() {
    if (window.cordova && cordova.plugins && cordova.plugins.mlkit &&
        cordova.plugins.mlkit.barcodeScanner && typeof cordova.plugins.mlkit.barcodeScanner.scan === 'function') {
        return { tipo: 'MLKIT', lector: cordova.plugins.mlkit.barcodeScanner };
    }
    if (window.cordova && cordova.plugins && cordova.plugins.barcodeScanner &&
        typeof cordova.plugins.barcodeScanner.scan === 'function') {
        return { tipo: 'LEGACY', lector: cordova.plugins.barcodeScanner };
    }
    return null;
}

function leerQrGuiasSeleccionado() {
    if (!qrTrazabilidadOrigenSeleccionado) {
        app.dialog.alert('Debe seleccionar un viaje con QR de Trazabilidad.', 'GFE');
        return;
    }

    var lector = obtenerLectorQrGuiasTrazabilidad();
    if (!lector) {
        app.dialog.alert('Lector QR no disponible en este dispositivo.', 'GFE');
        return;
    }

    var exito = function (resultado) {
        if (!resultado || resultado.cancelled === true || !resultado.text) return;
        procesarLecturaQrGuiasTrazabilidad(resultado.text);
    };
    var error = function (detalle) {
        if (!detalle || detalle.cancelled !== true) {
            app.dialog.alert('No fue posible leer el QR de Guías.', 'GFE');
        }
    };

    if (lector.tipo === 'MLKIT') {
        lector.lector.scan({
            barcodeFormats: { QRCode: true },
            beepOnSuccess: true,
            vibrateOnSuccess: true,
            detectorSize: 0.85,
            rotateCamera: false
        }, exito, error);
    } else {
        lector.lector.scan(exito, error, {
            preferFrontCamera: false,
            showFlipCameraButton: true,
            showTorchButton: true,
            formats: 'QR_CODE',
            orientation: 'unspecified',
            prompt: 'Escanee el QR mostrado por app Guías'
        });
    }
}

async function procesarLecturaQrGuiasTrazabilidad(textoQr) {
    app.dialog.preloader('Validando QR de Guías...');
    try {
        var resultado = await procesarQrGuiasParaOrigen(qrTrazabilidadOrigenSeleccionado, textoQr);
        app.dialog.close();
        app.dialog.alert(mensajeResultadoQrGuias(resultado), 'GFE', function () {
            seleccionarGuiaQrTrazabilidad(guiaQrTrazabilidadSeleccionada.ROWID);
        });
    } catch (error) {
        app.dialog.close();
        app.dialog.alert(error && error.message ? error.message : 'Error técnico al procesar el QR.', 'GFE');
    }
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
