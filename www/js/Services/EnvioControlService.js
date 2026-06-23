

function seleccionarEvidencia(id_gde_actual, tipo_evidencia) {
    return new Promise((resolve, reject) => {
        DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia, (evidencia) => {
            if (evidencia) {
                resolve(evidencia);
            } else {
                reject(new Error(`No se pudo obtener evidencia para tipo ${tipo_evidencia}`));
            }
        });
    });
}

function uploadPhotoPromise(imageURI, id) {
    return new Promise((resolve, reject) => {
        DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
            if (result_param && result_param.PAG_VALOR) {
                const rutaServidor = result_param.PAG_VALOR + '/Webserviceproveedor.asmx/Recibe_Imagen';
                uploadPhoto(imageURI, id, 1, 1, rutaServidor, false, (result) => {
                    if (result === 1) {
                        resolve();
                    } else {
                        reject(new Error(`Error al subir la foto con ID: ${id}`));
                    }
                });
            } else {
                reject(new Error("No se pudo obtener la dirección del servidor"));
            }
        });
    });
}



async function enviarConfirmacionIngresoPlantaService(gdeSeleccionada) {
    let respuesta = {
        detalle: [],
        total: 0,
        exitosos: 0,
        erroneos: 0
    };

    try {
        // Validación 1:
        // La vista debe enviar explícitamente la guía seleccionada.
        // Si no llega nada, no se puede confirmar.
        if (!gdeSeleccionada) {
            respuesta.total = 1;
            respuesta.erroneos = 1;
            respuesta.detalle.push({
                MENSAJE: "Debe seleccionar una guía para confirmar ingreso planta."
            });

            return respuesta;
        }

        // Validación 2:
        // ROWID sirve para actualizar la guía local.
        // ID_UNICO_MOVIL sirve para llamar al webservice.
        if (!gdeSeleccionada.ROWID || !gdeSeleccionada.ID_UNICO_MOVIL) {
            respuesta.total = 1;
            respuesta.erroneos = 1;
            respuesta.detalle.push({
                MENSAJE: "La guía seleccionada no tiene IDENTIFICADORES válido.",
                GDE: gdeSeleccionada
            });

            return respuesta;
        }

        // Validación 3:
        // Reconsultamos la BD local para asegurar que la guía todavía siga pendiente.
        // Aunque venga desde el combo, ese objeto es solo una foto en memoria.
        const gdeNoConfirmadas = await DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas();

        if (
            gdeNoConfirmadas === -1 ||
            gdeNoConfirmadas === "-1" ||
            !Array.isArray(gdeNoConfirmadas) ||
            gdeNoConfirmadas.length === 0
        ) {
            respuesta.total = 1;
            respuesta.erroneos = 1;
            respuesta.detalle.push({
                MENSAJE: "No existen guías pendientes de confirmar ingreso planta."
            });

            return respuesta;
        }

        // Validación 4:
        // Buscamos dentro de las pendientes SOLO la guía seleccionada.
        // Comparamos por ROWID e ID_UNICO_MOVIL para evitar falsos positivos.
        const gde = gdeNoConfirmadas.find(function (item) {
            return String(item.ROWID) === String(gdeSeleccionada.ROWID) &&
                String(item.ID_UNICO_MOVIL) === String(gdeSeleccionada.ID_UNICO_MOVIL);
        });

        if (!gde) {
            respuesta.total = 1;
            respuesta.erroneos = 1;
            respuesta.detalle.push({
                MENSAJE: "La guía seleccionada ya no está pendiente de confirmar ingreso planta.",
                ROWID: gdeSeleccionada.ROWID,
                ID_UNICO_MOVIL: gdeSeleccionada.ID_UNICO_MOVIL
            });

            return respuesta;
        }

        // Desde aquí en adelante trabajamos solo con UNA guía.
        respuesta.total = 1;
        respuesta.detalle = [gde];

        console.log("[INGRESO] Enviando GDE seleccionada:", gde.ID_UNICO_MOVIL);

        const response = await enviarConfirmacionIngresoPlantaWebService(gde.ID_UNICO_MOVIL);
        console.log("[INGRESO] Respuesta WS:", response);

        if (response && response.STATUS === true) {
            console.log("[INGRESO] Actualizando GDE local:", gde.ROWID);

            await DATOS_confirmaIngresoPlanta(gde.ROWID);
            console.log("[INGRESO] GDE_CONFIRMA_INGRESO_PLANTA OK");

            const cambioEstadoOk = await cambiarEstadoEvidenciasIngreso(gde.ROWID, 'I');
            console.log("[INGRESO] cambiarEstadoEvidenciasIngreso OK:", cambioEstadoOk);

            console.log("[INGRESO] ANTES trazabilidad");

            const datos = await generarDataTrazabilidad(
                TipoAccionTypes.CONFIRMA_INGRESO_PLANTA,
                Obtener_dato_local('user_activo'),
                {
                    rol: gde?.GDE_COD_ORIGEN ?? null,
                    destino: gde?.GDE_COD_DESTINO ?? null,
                    despacho: gde,
                    id_unico_movil_gde: gde?.ID_UNICO_MOVIL ?? null,
                }
            );

            console.log("[INGRESO] generarDataTrazabilidad OK");

            await obtenerUbicacionEInsertarLog(
                Obtener_dato_local('user_activo'),
                datos
            );

            console.log("[INGRESO] obtenerUbicacionEInsertarLog OK");

            respuesta.exitosos++;
        } else {
            console.log("[INGRESO] WS STATUS = false", response);

            respuesta.erroneos++;

            // Guardamos la respuesta del WS para poder depurar desde la pantalla/log.
            respuesta.detalle[0].RESPUESTA_WS = response;
        }

    } catch (ex) {
        console.error("[INGRESO] Error en la confirmación de ingreso:", ex);

        respuesta.total = respuesta.total || 1;
        respuesta.erroneos++;

        respuesta.detalle.push({
            MENSAJE: ex && ex.message
                ? ex.message
                : "Error en la confirmación de ingreso planta."
        });
    }

    console.log(respuesta);
    return respuesta;
}


async function enviarMotivoAnulacion(idUnico, motivo) {
    try {
        const respuesta = await enviarAnulacionGuiaWebService(idUnico, motivo);
        return respuesta;   // devuelve la respuesta del webservice
    } catch (error) {
        console.error("Error al enviar motivo de anulación:", error);
        return {
            STATUS: false,
            MENSAJE: "Error al comunicar con el servidor",
            ERROR: error
        };
    }
}


async function reenviarFotosService(id_gde_actual) {
    try {

        const evidenciaCamionVacio1 = await seleccionarEvidencia(id_gde_actual, constantes.tipoEvidencia.camionVacio1);
        const evidenciaCamionVacio2 = await seleccionarEvidencia(id_gde_actual, constantes.tipoEvidencia.camionVacio2);
        const evidenciaCamionCargado1 = await seleccionarEvidencia(id_gde_actual, constantes.tipoEvidencia.camionCargado1);
        const evidenciaCamionCargado2 = await seleccionarEvidencia(id_gde_actual, constantes.tipoEvidencia.camionCargado1);
        const evidenciaPadron = await seleccionarEvidencia(id_gde_actual, constantes.tipoEvidencia.padronVehiculo);
        const evidenciasVarias = await seleccionarEvidencia(id_gde_actual, constantes.tipoEvidencia.otra);

        // Función auxiliar para subir la foto si la evidencia es válida
        async function subirEvidencia(evidencia) {
            if (evidencia != "-1" && Array.isArray(evidencia) && evidencia.length > 0) {
                await uploadPhotoPromise(evidencia[0].ARCHIVO, evidencia[0].ID_UNICO_MOVIL);
            }
        }

        // Subir todas las evidencias
        await subirEvidencia(evidenciaCamionVacio1);
        await subirEvidencia(evidenciaCamionVacio2);
        await subirEvidencia(evidenciaCamionCargado1);
        await subirEvidencia(evidenciaCamionCargado2);
        await subirEvidencia(evidenciaPadron);

        if (evidenciasVarias != "-1" && evidenciasVarias.length > 0) {
            for (let i = 0; i < evidenciasVarias.length; i++) {
                await uploadPhotoPromise(evidenciasVarias[i].ARCHIVO, evidenciasVarias[i].ID_UNICO_MOVIL);
            }
        }

        return 'Reenvío completado';
    } catch (error) {
        console.error(error);
        throw error; // Puedes manejar el error de manera diferente si lo prefieres
    }
}

