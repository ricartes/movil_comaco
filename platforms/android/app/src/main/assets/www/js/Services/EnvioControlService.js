

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



async function reenviarFotosService(id_gde_actual) {
    try {
        const tipo_evidencia_camion_vacio = 1;
        const tipo_evidencia_camion_vacio_2 = 3;
        const tipo_evidencia_camion_cargado = 2;
        const tipo_evidencia_camion_cargado_2 = 4;
        const tipo_evidencia_padron = 5;
        const tipo_evidencia_general = 6;

        const evidenciaCamionVacio1 = await seleccionarEvidencia(id_gde_actual, tipo_evidencia_camion_vacio);
        const evidenciaCamionVacio2 = await seleccionarEvidencia(id_gde_actual, tipo_evidencia_camion_vacio_2);
        const evidenciaCamionCargado1 = await seleccionarEvidencia(id_gde_actual, tipo_evidencia_camion_cargado);
        const evidenciaCamionCargado2 = await seleccionarEvidencia(id_gde_actual, tipo_evidencia_camion_cargado_2);
        const evidenciaPadron = await seleccionarEvidencia(id_gde_actual, tipo_evidencia_padron);
        const evidenciasVarias = await seleccionarEvidencia(id_gde_actual, tipo_evidencia_general);

        // Función auxiliar para subir la foto si la evidencia es válida
        async function subirEvidencia(evidencia) {
            if (evidencia != "-1" && evidencia.length > 0) {
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

