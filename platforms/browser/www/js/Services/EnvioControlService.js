

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



async function enviarConfirmacionIngresoPlantaService() {
    let respuesta = {
        detalle: [],
        total: 0,
        exitosos: 0,
        erroneos: 0
    };

    console.log(respuesta);

    const gdeNoConfirmadas = await DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas();

    if (gdeNoConfirmadas !== "-1" && Array.isArray(gdeNoConfirmadas) && gdeNoConfirmadas.length > 0) {
        respuesta.total = gdeNoConfirmadas.length;
        respuesta.detalle = gdeNoConfirmadas;

        for (let i = 0; i < gdeNoConfirmadas.length; i++) {
            try {
                const gde = gdeNoConfirmadas[i];
                console.log("[INGRESO] Enviando GDE:", i, gde.ID_UNICO_MOVIL);

                const response = await enviarConfirmacionIngresoPlantaWebService(gde.ID_UNICO_MOVIL);
                console.log("[INGRESO] Respuesta WS:", response);

                if (response.STATUS === true) {

                    console.log("[INGRESO] Actualizando GDE local:", gde.ROWID);
                    await DATOS_confirmaIngresoPlanta(gde.ROWID);
                    console.log("[INGRESO] GDE_CONFIRMA_INGRESO_PLANTA OK");

                    const cambioEstadoOk = await cambiarEstadoEvidenciasIngreso(gde.ROWID, 'I');
                    console.log("[INGRESO] cambiarEstadoEvidenciasIngreso OK:", cambioEstadoOk);

                    // ⚠️ PROBAR PRIMERO SIN Trazabilidad
                    console.log("[INGRESO] ANTES trazabilidad");

                    const datos = await generarDataTrazabilidad(
                        TipoAccionTypes.CONFIRMA_INGRESO_PLANTA,
                        Obtener_dato_local('user_activo'),
                        {
                            rol: gde?.GDE_COD_ORIGEN ?? null,
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
                    console.log("[INGRESO] WS STATUS = false");
                    respuesta.erroneos++;
                }
            } catch (ex) {
                console.error("[INGRESO] Error en la confirmación de ingreso:", ex);
                respuesta.erroneos++;
            }
        }

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

