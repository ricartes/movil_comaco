// ================== CONTEXTO / ESTADO LOCAL ==================
var evidenciaIngresoContext = {
    fotoUrl: null
};

var capturandoIngresoPlanta = false;

let intentosMaximosIngresoPlanta = constantes.cantidadMaximaIntentosCaptura;
let intentosEvidenciaIngresoPlanta = 0;
let intentosConfirmar;
let encuentraFotoFueraGeocercaFotoIngresoPlanta;
let permiteIngresoFotografiasIngresoPlanta;

// NUEVO: lista de GDE y la seleccionada
let gdePendientesIngresoPlanta = [];
let gdeSeleccionadaIngresoPlanta = null;


// ================== INIT PAGE ==================
$$(document).on('page:init', '.page[data-name="ingreso-planta"]', async function (e, page) {

    app.dialog.progress("Cargando...");

    const parametro = await Datos_seleccionarParametroGeneralAsync(
        constantes.empresaPredeterminada,
        constantes.parametroIntentosMaximoCamionPadron
    );

    intentosMaximosIngresoPlanta =
        parametro && !isNaN(parseInt(parametro.PAG_VALOR))
            ? parseInt(parametro.PAG_VALOR)
            : constantes.cantidadMaximaIntentosCaptura;

    encuentraFotoFueraGeocercaFotoIngresoPlanta = false;
    permiteIngresoFotografiasIngresoPlanta = true;
    intentosEvidenciaIngresoPlanta = 0;
    intentosConfirmar = 0;
    evidenciaIngresoContext.fotoUrl = null;
    gdePendientesIngresoPlanta = [];
    gdeSeleccionadaIngresoPlanta = null;

    const gdeNoConfirmadas = await DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas();

    app.dialog.close();

    if (gdeNoConfirmadas === -1 || gdeNoConfirmadas === "-1" || !Array.isArray(gdeNoConfirmadas) || gdeNoConfirmadas.length === 0) {

        // No hay guías pendientes → deshabilitar UI, pero sin redirigir (para tests)
        deshabilitarUIIngresoPlanta();
    } else {
        gdePendientesIngresoPlanta = gdeNoConfirmadas;

        try {
            await borrarEvidenciasIngresoPlantaPendientes(gdeNoConfirmadas);
        } catch (ex) {
            app.dialog.alert(
                'Ha ocurrido un error al eliminar evidencias provisorias.',
                "GFE"
            );
        }

        // Poblar combo de GDE
        poblarComboGdeIngresoPlanta(gdePendientesIngresoPlanta);
    }

    // Delegación de evento para la imagen de captura
    $$('.page[data-name="ingreso-planta"]').on('click', '#imagen_confirma_planta', function () {
        capturarEvidenciaIngresoPlanta();
    });

    $$('.page[data-name="ingreso-planta"]').on('click', '#btn_confirma_ingreso_planta', function () {
        confirmarIngresoPlanta();
    });

    // Evento change del combo
    $$(document).on('change', '#combo_gde', function () {
        onChangeComboGdeIngresoPlanta(this.value);
    });
});


// ================== UI helper cuando no hay GDE ==================
function deshabilitarUIIngresoPlanta() {
    // texto en el smart-select
    $$('#texto_gde').text('Sin guías pendientes de confirmar');

    // dejar sólo opción por defecto
    $$("#item-select-guia-confirmar").addClass("disabled");
    $$('#combo_gde').html('<option value="">SIN GUÍAS</option>');
    $$('#combo_gde').attr('disabled', true);

    // deshabilitar botón y "simular" deshabilitado en la imagen
    $$('#btn_confirma_ingreso_planta')
        .addClass('disabled')
        .addClass('color-gray');

    // imagen por defecto
    $$('#imagen_confirma_planta').attr('src', 'imagenes/icon_foto.png');
}


// ================== POBLAR COMBO ==================
function poblarComboGdeIngresoPlanta(guias) {
    const $combo = $$('#combo_gde');

    let opciones = '<option value="">SELECCIONAR</option>';

    guias.forEach(gde => {
        // Texto combo: Destino, código destino, rol
        const destino = gde.GDE_DESTINO || gde.GDE_NOMBRE_CLIENTE || '';
        const codDestino = gde.GDE_COD_DESTINO || '';
        const rol = gde.GDE_ROL || gde.GDE_ROL_COMUNA || '';
        const folio = gde.GDE_GUIA_PROVEEDOR || '';

        const texto =
            `Destino: ${destino} | Cod: ${codDestino} | Rol: ${rol} | Guía Prov: ${folio}`;

        opciones += `<option value="${gde.ROWID}">${texto}</option>`;
    });

    $combo.html(opciones);

    // Texto inicial del smart-select
    $$('#texto_gde .item-title').text('SELECCIONAR');
}


// ================== ON CHANGE COMBO ==================
function onChangeComboGdeIngresoPlanta(rowidSeleccionado) {
    if (!rowidSeleccionado) {
        gdeSeleccionadaIngresoPlanta = null;
        evidenciaIngresoContext.fotoUrl = null;
        encuentraFotoFueraGeocercaFotoIngresoPlanta = false;
        permiteIngresoFotografiasIngresoPlanta = true;
        intentosEvidenciaIngresoPlanta = 0;
        $$('#imagen_confirma_planta').attr('src', 'imagenes/icon_foto.png');
        $$('#texto_gde .item-title').text('SELECCIONAR');
        return;
    }

    gdeSeleccionadaIngresoPlanta =
        gdePendientesIngresoPlanta.find(g => String(g.ROWID) === String(rowidSeleccionado)) || null;

    if (!gdeSeleccionadaIngresoPlanta) {
        onChangeComboGdeIngresoPlanta('');
        return;
    }

    // Texto mostrado en smart-select
    const destino = gdeSeleccionadaIngresoPlanta.GDE_DESTINO || gdeSeleccionadaIngresoPlanta.GDE_NOMBRE_CLIENTE || '';
    const codDestino = gdeSeleccionadaIngresoPlanta.GDE_COD_DESTINO || '';
    const rol = gdeSeleccionadaIngresoPlanta.GDE_ROL || gdeSeleccionadaIngresoPlanta.GDE_ROL_COMUNA || '';
    const folio = gdeSeleccionadaIngresoPlanta.GDE_GUIA_PROVEEDOR || '';

    const textoSmart =
        `Destino: ${destino} | Cod: ${codDestino} | Rol: ${rol} | Guía Prov: ${folio}`;

    $$('#texto_gde .item-title').text(textoSmart);

    // Reset de flags por cada nueva guía seleccionada
    evidenciaIngresoContext.fotoUrl = null;
    encuentraFotoFueraGeocercaFotoIngresoPlanta = false;
    permiteIngresoFotografiasIngresoPlanta = true;
    intentosEvidenciaIngresoPlanta = 0;
    $$('#imagen_confirma_planta').attr('src', 'imagenes/icon_foto.png');

    // (Opcional) si quieres, aquí podrías buscar evidencia previa de esta GDE y mostrarla
    // DATOS_seleccionar_evidencia_guia(gdeSeleccionadaIngresoPlanta.ROWID, constantes.tipoEvidencia.ingresoPlanta, callback...)
}


// ================== CAPTURA DE EVIDENCIA ==================
async function capturarEvidenciaIngresoPlanta() {
    if (capturandoIngresoPlanta) return; // evita doble ejecución

    if (!gdeSeleccionadaIngresoPlanta) {
        app.dialog.alert("Debe seleccionar una guía para capturar la evidencia de ingreso a planta.", "GFE");
        return;
    }

    capturandoIngresoPlanta = true;

    try {
        const estadoGPS = await verificarEstadoGPS();
        if (!estadoGPS) {
            app.dialog.alert(
                "Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.",
                "GFE"
            );
            capturandoIngresoPlanta = false;
            return;
        }

        navigator.camera.getPicture(
            onPhotoFileSuccessIngresoPlanta,
            function (err) {
                onFail(err);              // tu handler genérico
                capturandoIngresoPlanta = false;
            },
            {
                quality: 90,
                destinationType: Camera.DestinationType.FILE_URI,
                targetWidth: 1920,
                targetHeight: 1080
            }
        );
    } catch (e) {
        console.error(e);
        capturandoIngresoPlanta = false;
        app.dialog.alert(
            "Ocurrió un error al intentar capturar la evidencia.",
            "GFE"
        );
    }
}

function onPhotoFileSuccessIngresoPlanta(imageData) {
    window.resolveLocalFileSystemURL(imageData, resolveOnSuccessIngresoPlanta, resOnError);
}

function resolveOnSuccessIngresoPlanta(entry) {
    var d = new Date();
    var n = d.getTime();
    var newFileName = Obtener_dato_local("rut_activo") + "_" + n + ".jpg";
    var myFolderApp = "fotos";

    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSys) {
        fileSys.root.getDirectory(
            myFolderApp,
            { create: true, exclusive: false },
            function (directory) {
                entry.moveTo(directory, newFileName, successMoveIngresoPlanta, resOnError);
            },
            resOnError
        );
    }, resOnError);
}

function successMoveIngresoPlanta(entry) {
    var fotoUrl = entry.toURL();
    procesarEvidenciaIngresoPlanta(fotoUrl);
}


// ================== GUARDAR EVIDENCIA (UNA GDE) ==================
async function procesarEvidenciaIngresoPlanta(fotoUrl) {
    try {
        if (!gdeSeleccionadaIngresoPlanta) {
            app.dialog.alert(
                "Debe seleccionar una guía válida antes de registrar la evidencia.",
                "GFE"
            );
            capturandoIngresoPlanta = false;
            return;
        }

        evidenciaIngresoContext.fotoUrl = fotoUrl;

        app.dialog.preloader("Obteniendo ubicación");

        if (!navigator.geolocation) {
            app.dialog.close();
            app.dialog.alert(
                "Coordenadas no obtenidas. Favor revisar la configuración de GPS",
                "GFE"
            );
            await guardarEvidenciaIngresoPlanta(0, 0);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async function (position) {
                app.dialog.close();
                await guardarEvidenciaIngresoPlanta(
                    position.coords.latitude,
                    position.coords.longitude
                );
            },
            async function (err) {
                console.warn(err);
                app.dialog.close();
                app.dialog.alert(
                    "Coordenadas no obtenidas. Favor revisar la configuración de GPS",
                    "GFE"
                );
                await guardarEvidenciaIngresoPlanta(0, 0);
            },
            options_gps
        );

    } catch (err) {
        console.error(err);
        capturandoIngresoPlanta = false;
        app.dialog.alert(
            "Ocurrió un error al preparar la evidencia de ingreso a planta.",
            "GFE"
        );
    }
}


// ================== GUARDAR EN TABLA EVIDENCIA + GEO ==================
async function guardarEvidenciaIngresoPlanta(latitud, longitud) {
    const fotoUrl = evidenciaIngresoContext.fotoUrl;

    if (!gdeSeleccionadaIngresoPlanta) {
        capturandoIngresoPlanta = false;
        return;
    }

    app.dialog.progress("Cargando...");

    try {
        const gde = gdeSeleccionadaIngresoPlanta;

        // 1) Validar mock location una sola vez para la guía
        await validarUbicacionNoSimuladaGlobal(gde);

        // 2) Guardar evidencia (borrar + insertar) para esta guía
        const evidenciaIdUnico = await new Promise((resolve, reject) => {
            const evidencia = new CL_GDE_Evidencia();
            evidencia.ID_UNICO_MOVIL = "evid_gde" + obtener_IDUNICO();

            evidencia.ID_GDE = gde.ROWID;
            evidencia.ID_UNICO_MOVIL_GDE = gde.ID_UNICO_MOVIL;
            evidencia.GDE_ESTADO_MOVIL = "B";
            evidencia.FECHA_EVIDENCIA = "";
            evidencia.OBSERVACION = "EVIDENCIA CONFIRMA INGRESO PLANTA";
            evidencia.ARCHIVO = fotoUrl;
            evidencia.ENVIADO = 0;
            evidencia.TIPO_EVIDENCIA = constantes.tipoEvidencia.ingresoPlanta;
            evidencia.EVIDENCIA_COORDENADA_X = latitud;
            evidencia.EVIDENCIA_COORDENADA_Y = longitud;

            DATOS_borra_evidencia_guia(evidencia, function () {
                DATOS_guardar_evidencia_guia(evidencia, function () {
                    resolve(evidencia.ID_UNICO_MOVIL);
                }, reject);
            }, reject);
        });

        // 3) Trazabilidad CAPTURA_EVIDENCIA_INGRESO_PLANTA
        const datosCap = await generarDataTrazabilidad(
            TipoAccionTypes.CAPTURA_EVIDENCIA_INGRESO_PLANTA,
            Obtener_dato_local("user_activo"),
            {
                foto: fotoUrl,
                rol: gde?.GDE_COD_ORIGEN ?? null,
                destino: gde?.GDE_COD_DESTINO ?? null,
                despacho: gde,
                id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local("user_activo"),
            datosCap
        );

        // 4) Geocerca (solo esta guía)
        let geoRes = {
            anulada: false,
            advertencia: false,
            mensaje: null
        };

        if (configuracionGeocercas.habilitado &&
            configuracionGeocercas.habilitadoPorAccion.ingresoPlanta) {

            geoRes = await procesarGeocercaIngresoPlantaPorGuia(gde, evidenciaIdUnico);
        }

        // Setear flags según resultado geo
        if (geoRes.anulada) {
            encuentraFotoFueraGeocercaFotoIngresoPlanta = true;
            app.dialog.alert(
                geoRes.mensaje || "Evidencia fuera de geocerca. La guía se anulará al confirmar ingreso planta.",
                "GFE"
            );
        } else if (geoRes.advertencia) {
            app.dialog.alert(
                geoRes.mensaje || "Advertencia de geocerca en ingreso planta.",
                "GFE"
            );
        } else {
            app.dialog.alert(
                "Evidencia de ingreso a planta registrada correctamente.",
                "GFE"
            );
        }

        // 5) Actualizar imagen UI
        $$("#imagen_confirma_planta").attr("src", fotoUrl);

    } catch (error) {
        console.error("Error en flujo de ingreso a planta:", error);
        app.dialog.alert(
            "Ocurrió un error al registrar la evidencia de ingreso a planta. Intente nuevamente.",
            "GFE"
        );
    } finally {
        try { app.dialog.close(); } catch { }
        capturandoIngresoPlanta = false;
    }
}


// ================== CONFIRMAR INGRESO PLANTA (UNA GDE) ==================
function confirmarIngresoPlanta() {
    app.dialog.confirm(
        "¿Está seguro que desea confirmar el ingreso planta?. Se requiere una conexión a Internet activa",
        "GFE",
        async function () {

            if (!gdeSeleccionadaIngresoPlanta) {
                app.dialog.alert("Debe seleccionar una guía para confirmar ingreso planta.", "GFE");
                return false;
            }

            if (encuentraFotoFueraGeocercaFotoIngresoPlanta || !permiteIngresoFotografiasIngresoPlanta) {
                app.dialog.alert("Existen fotografías fuera de geocerca o guía marcada para anulación. Revise antes de confirmar.", "GFE");
                return false;
            }

            // 1) Bloquear si versión app inválida
            const versionInvalida = parseInt(Obtener_dato_local("version_app_invalida") || "0");
            if (versionInvalida === 1) {
                app.dialog.alert(
                    "La versión de la aplicación instalada no es la última vigente. " +
                    "Actualice la app antes de confirmar el ingreso a planta.",
                    "Actualización requerida"
                );
                return false;
            }

            // 2) Validar conexión básica
            if (checkConnection() == "No network connection") {
                app.dialog.alert("No hay conexión a Internet", "GFE");
                return false;
            }

            app.dialog.preloader("Informando despacho planta...");

            try {
                const result_conexion = await new Promise((resolve) => {
                    comprueba_conexion("0", function (res) {
                        resolve(res);
                    });
                });

                if (result_conexion != 1) {
                    app.dialog.alert("No se pudo establecer la conexión con el servidor.", "GFE");
                    return;
                }

                // 3) Validar evidencias locales (puedes usar tu función actual)
                const validacion = await validarEvidenciasIngresoPlantaLocales();
                if (!validacion.valido) {
                    app.dialog.alert(validacion.mensaje, "GFE");
                    return;
                }

                // 4) Anulación por geocerca solo de la guía seleccionada
                const resumenGeocerca = await aplicarAnulacionPorGeocercaEnConfirmacion();

                // 5) Enviar al servidor (tu servicio actual; él verá qué GDE se envía)
                const response = await enviarConfirmacionIngresoPlantaService();
                console.log("[INGRESO] Resultado final:", response);

                let mensajeFinal =
                    `Proceso finalizado.\n\n` +
                    `Total: ${response.total}, exitosos: ${response.exitosos}, errores: ${response.erroneos}.`;

                if (resumenGeocerca && resumenGeocerca.anuladas > 0) {
                    mensajeFinal +=
                        `\n\nAdicionalmente, ${resumenGeocerca.anuladas} guía(s) ` +
                        `fueron anuladas por encontrarse fuera de la geocerca.`;
                }

                app.dialog.alert(
                    mensajeFinal,
                    "GFE",
                    function () {
                        ir_atras_boton();
                    }
                );
            } catch (ex) {
                const errorMessage = ex && ex.message ? ex.message : ex;
                console.error("[INGRESO] Error en confirmarIngresoPlanta:", ex);
                app.dialog.alert(
                    `Ocurrió un error durante el proceso: ${errorMessage}`,
                    "GFE"
                );
            } finally {
                try {
                    app.dialog.close();
                } catch (e) {
                    console.warn("No había diálogo que cerrar:", e);
                }
            }
        }
    );
}


// ================== MOCK LOCATION (sin cambios grandes) ==================
async function validarUbicacionNoSimuladaGlobal(gdeReferencia) {
    let intentos = 0;
    let resultadoUbicacionSimulada = await detectarUbicacionSimulada();

    while (resultadoUbicacionSimulada.esUbicacionSimulada) {
        if (intentos === 0) {
            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.UTILIZA_UBICACION_SIMULADA,
                Obtener_dato_local("user_activo"),
                {
                    rol: gdeReferencia?.GDE_COD_ORIGEN ?? null,
                    destino: gdeReferencia?.GDE_COD_DESTINO ?? null,
                    despacho: gdeReferencia,
                    id_unico_movil_gde: gdeReferencia?.ID_UNICO_MOVIL ?? null,
                    resultadoUbicacionSimulada
                }
            );

            await obtenerUbicacionEInsertarLog(
                Obtener_dato_local("user_activo"),
                datos
            );
        }

        try { app.dialog.close(); } catch { }

        await new Promise((resolve) => {
            app.dialog.alert(
                "Se detectó ubicación adulterada... Debe utilizar la ubicación real para poder continuar.",
                "GFE Proveedores",
                async function () {
                    app.dialog.progress("Verificando ubicación...");
                    setTimeout(async () => {
                        resultadoUbicacionSimulada = await detectarUbicacionSimulada();
                        try { app.dialog.close(); } catch { }
                        resolve();
                    }, 1500);
                }
            );
        });

        intentos++;
    }

    return true;
}


// ================== GEO POR GUÍA (tu función actual) ==================
async function procesarGeocercaIngresoPlantaPorGuia(gde, evidenciaIdUnico) {
    const resumen = {
        anulada: false,
        advertencia: false,
        mensaje: null,
    };

    if (!configuracionGeocercas.habilitado ||
        !configuracionGeocercas.habilitadoPorAccion.ingresoPlanta) {
        return resumen;
    }

    // 1) Validar geocerca
    const resGeo = await validarGeocerca(gde.GDE_COD_DESTINO);
    const resultadoValidacion = resGeo.validacion;

    // 2) Validar cierre control
    const resultado = await validarCierreControl(
        resultadoValidacion,
        gde.ROWID,
        constantes.tipoPunto.final
    );

    // Aquí ya asumimos que la ubicación es real (mock location validado antes)

    if (resultado.cierra) {
        resumen.anulada = true;
        resumen.mensaje = resultado.mensaje || "Guía fuera de geocerca (ingreso planta).";

        const datos = await generarDataTrazabilidad(
            TipoAccionTypes.GEOCERCA_INVALIDA,
            Obtener_dato_local("user_activo"),
            {
                rol: gde?.GDE_COD_ORIGEN ?? null,
                destino: gde?.GDE_COD_DESTINO ?? null,
                despacho: gde,
                id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
                contexto: "CAPTURA_EVIDENCIA_INGRESO_PLANTA"
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local("user_activo"),
            datos
        );

    } else if (resultado.advertencia) {
        resumen.advertencia = true;
        resumen.mensaje = resultado.mensaje || "Advertencia de geocerca en ingreso planta.";

        const datos = await generarDataTrazabilidad(
            TipoAccionTypes.GEOCERCA_ADVERTENCIA,
            Obtener_dato_local("user_activo"),
            {
                rol: gde?.GDE_COD_ORIGEN ?? null,
                destino: gde?.GDE_COD_DESTINO ?? null,
                despacho: gde,
                id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
                contexto: "CAPTURA_EVIDENCIA_INGRESO_PLANTA"
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local("user_activo"),
            datos
        );
    }

    return resumen;
}


// ================== ANULACIÓN EN CONFIRMACIÓN (UNA GDE) ==================
async function aplicarAnulacionPorGeocercaEnConfirmacion() {
    const resumen = {
        total: 0,
        anuladas: 0
    };

    if (!gdeSeleccionadaIngresoPlanta) {
        return resumen;
    }

    const gde = gdeSeleccionadaIngresoPlanta;
    resumen.total = 1;

    try {
        const resGeo = await validarGeocerca(gde.GDE_COD_DESTINO);
        const resultadoValidacion = resGeo.validacion;

        const resultado = await validarCierreControl(
            resultadoValidacion,
            gde.ROWID,
            constantes.tipoPunto.final
        );

        if (resultado.cierra) {
            const anula = await ControlServiceAnular(
                gde.ROWID,
                resultado.latitud,
                resultado.longitud,
                "",
                `${constantes.mensajeGeocercaNoValida} (CONFIRMA INGRESO PLANTA)`
            );

            if (anula) {
                resumen.anuladas++;
            }
        }

    } catch (e) {
        console.error("Error aplicando anulación por geocerca en confirmación:", e);
    }

    return resumen;
}
