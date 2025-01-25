

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
        total: 0,
        exitosos: 0,
        erroneos: 0
    }
    const gdeNoConfirmadas = await DATOS_seleccionarGdeProveedorNoConfirmadas();

    if (gdeNoConfirmadas != "-1" && Array.isArray(gdeNoConfirmadas) && gdeNoConfirmadas.length > 0) {
        respuesta.total = gdeNoConfirmadas.length;
        let datos = await generarDataTrazabilidad(
            TipoAccionTypes.CONFIRMA_INGRESO_PLANTA,
            Obtener_dato_local('user_activo'),
            {
                despachos: gdeNoConfirmadas
            }
        );

        await obtenerUbicacionEInsertarLog(
            Obtener_dato_local('user_activo'),
            datos
        );



        for (let i = 0; i < gdeNoConfirmadas.length; i++) {
            try {
                const response = await enviarConfirmacionIngresoPlantaWebService(gdeNoConfirmadas[i].ID_UNICO_MOVIL);
                respuesta.exitosos++;
            } catch (ex) {
                respuesta.erroneos++;
            }


        }




    }

    return respuesta;

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

