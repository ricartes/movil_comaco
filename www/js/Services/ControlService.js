function ControlServiceAnular(id = null, latitud, longitud, tipoCoordenada, mensaje) {
    return new Promise((resolve, reject) => {

        if (id != "-1") {
            let estado = "N";
            DATOS_cambiar_estado_gde_proveedores(id, estado, function (result1) {
                DATOS_cambiar_estado_gde_evidencia(id, estado, function (result2) {
                    DATOS_motivo_anulacion_gde(id, mensaje, function (result3) {
                        if (tipoCoordenada == "F") {
                            DATOS_Actualiza_PuntoFinal(id, latitud, longitud, function (result) {
                                resolve(true);
                            });
                        }
                        if (tipoCoordenada == "I") {
                            DATOS_Actualiza_PuntoInicial(id, latitud, longitud, function (result) {
                                resolve(true);
                            });
                        }

                    });

                });

            });

        } else {
            resolve(true);
        }
    });
}


async function validacionHoraInicioTerminoCarguio(idGde) {
    try {
        const gde = await seleccionarGdeProveedor(idGde);
        const parametroMinimo = await seleccionarParametroMovil(1, Constantes.parametroTiempoMinimoCarguio);
        const parametroMaximo = await seleccionarParametroMovil(1, Constantes.parametroTiempoMaximoCarguio);

        const esValido = validarRangoFecha(gde.GDE_HORA_CARGUIO_INICIO, parametroMinimo.valor, parametroMaximo.valor);
        return esValido;
    } catch (error) {
        console.error('Ocurrió un error durante la validación:', error);
        throw error; // O manejar el error de la manera que prefieras
    }
}



function seleccionarGdeProveedor(idGde) {
    return new Promise((resolve, reject) => {
        try {
            DATOS_seleccionar_gde_proveedor(idGde, function (resultado) {
                // Verificar la existencia y validez del resultado antes de resolver
                if (resultado && typeof resultado !== 'undefined') {
                    resolve(resultado);
                } else {
                    // Rechazar la promesa si el resultado no es válido
                    reject(new Error('No se obtuvo respuesta o la respuesta no es válida.'));
                }
            });
        } catch (error) {
            // Rechazar la promesa si se captura un error sincrónico
            reject(error);
        }
    });
}


function seleccionarParametroMovil(id, parametro) {
    return new Promise((resolve, reject) => {
        try {
            DATOS_seleccionar_Parametro_movil(id, parametro, function (resultado) {
                // Asumiendo que 'resultado' siempre se obtiene pero podría no tener los datos esperados
                if (resultado && typeof resultado !== 'undefined') {
                    resolve(resultado);
                } else {
                    reject(new Error('No se obtuvo respuesta o la respuesta no es válida.'));
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}
