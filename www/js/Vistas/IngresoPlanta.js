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
let noEncuentraAlgunaGeocerca;

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
    noEncuentraAlgunaGeocerca = false;

    const modoFinalizacionManual = typeof FINALIZACION_MANUAL_modoActivo !== 'undefined' &&
        FINALIZACION_MANUAL_modoActivo === true;
    if (modoFinalizacionManual) {
        $$('.page[data-name="ingreso-planta"] .navbar .title').text('Finalización excepcional');
        $$('#advertencia_finalizacion_manual').show();
        $$('#row_finalizacion_manual').show();
        $$('#btn_confirma_ingreso_planta').hide();
    } else {
        $$('#advertencia_finalizacion_manual').hide();
        $$('#row_finalizacion_manual').hide();
        $$('#btn_confirma_ingreso_planta').show();
    }

    refrescarEstadoBotonConfirmar();
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

    $$('.page[data-name="ingreso-planta"]').on('click', '#btn_finaliza_fuera_geocerca', function () {
        confirmarIngresoPlantaManual();
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


    // imagen por defecto
    $$('#imagen_confirma_planta').attr('src', 'imagenes/icon_foto.png');

    setBotonConfirmarIngresoPlantaHabilitado(false);
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

        refrescarEstadoBotonConfirmar();
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

    // Armas el texto que quieres mostrar
    let seleccionado_texto = `Destino: ${destino} | Cod: ${codDestino} | Rol: ${rol} | Guía Prov: ${folio}`;

    // Limpias posibles saltos de línea por seguridad
    seleccionado_texto = seleccionado_texto.replace(/(\r\n|\n|\r)/gm, "");

    // Mismo patrón que usas en recargar_combo_productos
    const label = '<label>' + seleccionado_texto + ' </label>';
    const texto = label.concat('<div class="item-title" style="width: 100%;"></div>');

    $$("#texto_gde").html(texto);

    // Reset de flags por cada nueva guía seleccionada
    evidenciaIngresoContext.fotoUrl = null;
    encuentraFotoFueraGeocercaFotoIngresoPlanta = false;
    permiteIngresoFotografiasIngresoPlanta = true;
    intentosEvidenciaIngresoPlanta = 0;
    $$('#imagen_confirma_planta').attr('src', 'imagenes/icon_foto.png');

    DATOS_seleccionar_evidencia_guia(
        gdeSeleccionadaIngresoPlanta.ROWID,
        constantes.tipoEvidencia.ingresoPlanta,
        function (datos_evidencia) {
            if (datos_evidencia != "-1") {
                intentosEvidenciaIngresoPlanta = datos_evidencia[0].CANTIDAD_INTENTOS || 0;

                const resss = manejarIntentosCapturaEvidencias(
                    intentosEvidenciaIngresoPlanta,
                    intentosMaximosIngresoPlanta
                );

                intentosEvidenciaIngresoPlanta = resss.intentosActualizados;
                permiteIngresoFotografiasIngresoPlanta = !resss.debeAnular;

                // Mostrar foto previa si existiera
                if (datos_evidencia[0].ARCHIVO) {
                    evidenciaIngresoContext.fotoUrl = datos_evidencia[0].ARCHIVO;
                    $$("#imagen_confirma_planta").attr("src", datos_evidencia[0].ARCHIVO);
                }
            }
            refrescarEstadoBotonConfirmar();
        }
    );
}


// ================== CAPTURA DE EVIDENCIA ==================
async function capturarEvidenciaIngresoPlanta() {
    if (capturandoIngresoPlanta) return; // evita doble ejecución

    if (!gdeSeleccionadaIngresoPlanta) {
        app.dialog.alert("Debe seleccionar una guía para capturar la evidencia de ingreso a planta.", "GFE");
        return;
    }

    if (!permiteIngresoFotografiasIngresoPlanta) {
        app.dialog.alert(
            "No puede capturar más evidencias para esta guía porque se alcanzó el máximo de intentos.",
            "GFE"
        );
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

        // 1) Validar mock location
        await validarUbicacionNoSimuladaGlobal(gde);

        // 2) Guardar evidencia (borrar + insertar)
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

        // 4) Geocerca
        let geoRes = {
            anulada: false,
            advertencia: false,
            mensaje: null
        };

        geoRes = await procesarGeocercaIngresoPlantaPorGuia(gde, evidenciaIdUnico);


        if (geoRes.anulada) {
            encuentraFotoFueraGeocercaFotoIngresoPlanta = true;

            intentosEvidenciaIngresoPlanta++;
            const resss = manejarIntentosCapturaEvidencias(
                intentosEvidenciaIngresoPlanta,
                intentosMaximosIngresoPlanta
            );

            const intentosActualizados = resss.intentosActualizados;
            const debeAnular = resss.debeAnular;

            intentosEvidenciaIngresoPlanta = intentosActualizados;
            // Calcular intentos restantes
            const intentosRestantes = Math.max(
                0,
                intentosMaximosIngresoPlanta - intentosActualizados
            );

            // Guardar intentos en BD
            await DATOS_ActualizarIntentosEvidencia(
                evidenciaIdUnico,
                intentosEvidenciaIngresoPlanta
            );

            if (debeAnular) {
                permiteIngresoFotografiasIngresoPlanta = false;

                // Anular la GDE igual que en padrón
                const resultadoGeo = await validarGeocerca(gde.GDE_COD_DESTINO);
                const resultadoValidacion = resultadoGeo.validacion;

                const resultado = await validarCierreControl(
                    resultadoValidacion,
                    gde.ROWID,
                    constantes.tipoPunto.final,
                    true
                );

                if (resultado.cierra) {
                    const motivoAnulacion = `${constantes.mensajeGeocercaNoValida} (CAPTURA EVIDENCIA INGRESO PLANTA)`;
                    const anula = await ControlServiceAnular(
                        gde.ROWID,
                        resultado.latitud,
                        resultado.longitud,
                        "",
                        motivoAnulacion
                    );


                    if (anula) {
                        let wsNotificado = false;
                        try {
                            await enviarMotivoAnulacion(gde.ID_UNICO_MOVIL, motivoAnulacion);
                            wsNotificado = true;
                        } catch (errWs) {
                            console.error("Error al enviar motivo de anulación al WS:", errWs);
                            // No bloqueamos al usuario por falla del WS
                        }

                        let datos = await generarDataTrazabilidad(
                            TipoAccionTypes.GEOCERCA_INVALIDA,
                            Obtener_dato_local('user_activo'),
                            {
                                rol: gde?.GDE_COD_ORIGEN ?? null,
                                destino: gde?.GDE_COD_DESTINO ?? null,
                                despacho: gde,
                                id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
                            }
                        );

                        await obtenerUbicacionEInsertarLog(
                            Obtener_dato_local('user_activo'),
                            datos
                        );

                        evidenciaIngresoContext.fotoUrl = null;
                        gdePendientesIngresoPlanta = [];
                        gdeSeleccionadaIngresoPlanta = null;
                        intentosEvidenciaIngresoPlanta = 0;
                        encuentraFotoFueraGeocercaFotoIngresoPlanta = false;
                        permiteIngresoFotografiasIngresoPlanta = false;

                        refrescarEstadoBotonConfirmar();


                        let mensajeAlerta =
                            geoRes.mensaje || constantes.mensajeGeocercaNoValida;

                        // Añadimos info explícita de anulación
                        if (wsNotificado) {
                            mensajeAlerta +=
                                "\n\nLa guía ha sido anulada y " +
                                "se ha informado esta anulación al sistema central.";
                        } else {
                            mensajeAlerta +=
                                "\n\nLa guía ha sido anulada localmente, pero no se pudo " +
                                "informar al sistema central. Contacte al administrador.";
                        }

                        app.dialog.alert(
                            mensajeAlerta,
                            "GFE",
                            function () {
                                mainView.router.navigate("/");
                            }
                        );
                    }
                }
            } else {
                // Advertencia y dejar seguir capturando (hasta quemar intentos)
                let mensajeMostrado =
                    geoRes.mensaje ||
                    "Ingreso planta: sacar foto nuevamente porque se encuentra fuera de geocerca.";

                mensajeMostrado += `\n\nLe quedan ${intentosRestantes} intento(s) antes de anular la guía.`;

                let datos = await generarDataTrazabilidad(
                    TipoAccionTypes.ADVERTENCIA_GEOCERCA_CAPTURA_EVIDENCIA,
                    Obtener_dato_local('user_activo'),
                    {
                        rol: gde?.GDE_COD_ORIGEN ?? null,
                        destino: gde?.GDE_COD_DESTINO ?? null,
                        despacho: gde,
                        id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
                        mensajeMostrado: mensajeMostrado,
                        intentos: {
                            ingresoPlanta: intentosEvidenciaIngresoPlanta
                        }
                    }
                );

                await obtenerUbicacionEInsertarLog(
                    Obtener_dato_local('user_activo'),
                    datos
                );

                app.dialog.alert(mensajeMostrado, "GFE");
            }

            refrescarEstadoBotonConfirmar();

        } else if (geoRes.advertencia) {
            // solo advertencia geocerca (no suma intentos)
            app.dialog.alert(
                geoRes.mensaje || "Advertencia de geocerca en ingreso planta.",
                "GFE"
            );
            refrescarEstadoBotonConfirmar();
        } else {
            app.dialog.alert(
                "Evidencia de ingreso a planta registrada correctamente.",
                "GFE"
            );
            refrescarEstadoBotonConfirmar();
        }

        // 5) Actualizar imagen
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

            if (noEncuentraAlgunaGeocerca) {
                app.dialog.alert("Existen Destinos que no tienen geocerca asociadas. Cargue parámetros, en caso de volver a mostrar este mensaje, contacte al Administrador.", "GFE");
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
                    "Actualización requerida",
                    function () {
                        mainView.router.navigate("/");

                    }
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
                const validacion = await validarEvidenciasIngresoPlantaLocales(gdeSeleccionadaIngresoPlanta);

                if (!validacion.valido) {
                    app.dialog.alert(validacion.mensaje, "GFE");
                    return;
                }

                // 4) La confirmación normal mantiene el control de geocerca.
                // La ruta excepcional vive en un botón separado y nunca anula.
                const resumenGeocerca = await evaluarGeocercaConfirmacionIngreso(gdeSeleccionadaIngresoPlanta);
                if (resumenGeocerca.cierra) {
                    app.dialog.alert(
                        resumenGeocerca.mensaje || "La ubicación actual se encuentra fuera de la geocerca.",
                        "Fuera de geocerca"
                    );
                    return;
                }

                // 5) Enviar al servidor (tu servicio actual; él verá qué GDE se envía)
                const response = await enviarConfirmacionIngresoPlantaService(
                    gdeSeleccionadaIngresoPlanta,
                    { ORIGEN_FINALIZACION: "GEOCERCA", MOTIVO_FINALIZACION: "" }
                );
                console.log("[INGRESO] Resultado final:", response);

                let mensajeFinal =
                    `Proceso finalizado.\n\n` +
                    `Total: ${response.total}, exitosos: ${response.exitosos}, errores: ${response.erroneos}.`;

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


async function evaluarGeocercaConfirmacionIngreso(gde) {
    if (!gde || !gde.GDE_COD_DESTINO) {
        return { cierra: true, mensaje: "La guía no tiene destino para validar su geocerca." };
    }
    const resGeo = await validarGeocerca(gde.GDE_COD_DESTINO);
    const resultado = await validarCierreControl(
        resGeo.validacion,
        gde.ROWID,
        constantes.tipoPunto.final,
        true
    );
    resultado.latitud = resGeo.latitud;
    resultado.longitud = resGeo.longitud;
    return resultado;
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
        !configuracionGeocercas.habilitadoPorAccion.evidenciaIngresoPlanta) {
        return resumen;
    }

    if (!gde.GDE_COD_DESTINO) {
        return resumen;
    }

    // 1) Validar geocerca
    const resGeo = await validarGeocerca(gde.GDE_COD_DESTINO);
    const resultadoValidacion = resGeo.validacion;

    // 2) Validar cierre control
    const resultado = await validarCierreControl(
        resultadoValidacion,
        gde.ROWID,
        constantes.tipoPunto.final,
        true
    );

    // Aquí ya asumimos que la ubicación es real (mock location validado antes)

    noEncuentraAlgunaGeocerca = resultado.geocercaNoEncontrada;
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
            constantes.tipoPunto.final,
            true
        );

        if (resultado.cierra) {
            const motivoAnulacion = `${constantes.mensajeGeocercaNoValida} (CONFIRMA INGRESO PLANTA)`;
            const anula = await ControlServiceAnular(
                gde.ROWID,
                resultado.latitud,
                resultado.longitud,
                "",
                motivoAnulacion
            );

            if (anula) {

                try {
                    await enviarMotivoAnulacion(gde.ID_UNICO_MOVIL, motivoAnulacion);
                } catch (errWs) {
                    console.error("Error al enviar motivo de anulación al WS (confirmación):", errWs);
                }

                resumen.anuladas++;
            }
        }

    } catch (e) {
        console.error("Error aplicando anulación por geocerca en confirmación:", e);
    }

    return resumen;
}


function setBotonConfirmarIngresoPlantaHabilitado(habilitar) {
    const $btn = $$('#btn_confirma_ingreso_planta');

    if (habilitar) {
        $btn.removeClass('disabled color-gray');
        $btn.attr('disabled', false);
    } else {
        $btn.addClass('disabled color-gray');
        $btn.attr('disabled', true);
    }
}

function refrescarEstadoBotonConfirmar() {
    const puedeConfirmar =
        !!gdeSeleccionadaIngresoPlanta &&          // hay guía
        !noEncuentraAlgunaGeocerca &&             // no falló por geocerca no encontrada
        !encuentraFotoFueraGeocercaFotoIngresoPlanta && // no hay foto fuera de geocerca
        permiteIngresoFotografiasIngresoPlanta === true; // no agotó intentos / no marcada para anular

    setBotonConfirmarIngresoPlantaHabilitado(puedeConfirmar);
    if (typeof FINALIZACION_MANUAL_setBotonHabilitado === 'function') {
        FINALIZACION_MANUAL_setBotonHabilitado(!!gdeSeleccionadaIngresoPlanta);
    }
}

