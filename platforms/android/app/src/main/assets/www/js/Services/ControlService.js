function ControlServiceAnular(id = null, latitud, longitud, tipoCoordenada, mensaje) {
    return new Promise((resolve, reject) => {
        if (id != "-1") {
            let estado = "N";
            DATOS_cambiar_estado_gde_proveedores(id, estado, function (result1) {
                DATOS_cambiar_estado_gde_evidencia(id, estado, function (result2) {
                    DATOS_motivo_anulacion_gde(id, mensaje, function (result3) {
                        if (tipoCoordenada == "F") {
                            DATOS_Actualiza_PuntoFinal(id, latitud, longitud, function (result) {
                                inicializarDatosGde();
                                resolve(true);
                            });
                        } else if (tipoCoordenada == "I") {
                            DATOS_Actualiza_PuntoInicial(id, latitud, longitud, function (result) {
                                inicializarDatosGde();
                                resolve(true);
                            });
                        } else {
                            // ➜ No hay coordenada, igual resolvemos
                            inicializarDatosGde();
                            resolve(true);
                        }

                    });

                });

            });

        } else {
            resolve(true);
        }
    });
}


function validarRangoFecha(fechaInicio, minMinutes, maxMinutes) {

    const fechaFotoCamionVacio = moment(fechaInicio);
    const fechaMinimaRango = fechaFotoCamionVacio.clone().add(minMinutes, 'minutes');
    const fechaMaximaRango = fechaFotoCamionVacio.clone().add(maxMinutes, 'minutes');


    return moment().isSameOrAfter(fechaMinimaRango) && moment().isSameOrBefore(fechaMaximaRango);
}


async function validacionHoraInicioTerminoCarguio(idGde) {
    try {
        const gde = await seleccionarGdeProveedor(idGde);
        const ordenCompra = await seleccionarOrdenCompra(gde.DocEntry, gde.GDE_COD_PRODUCTO);
        const parametroMinimo = await seleccionarParametroGeneral(1, constantes.parametroTiempoMinimoCarguio);
        const parametroMaximo = await seleccionarParametroGeneral(1, constantes.parametroTiempoMaximoCarguio);

        const tiempoMinimoEspera = !isNaN(parametroMinimo.PAG_VALOR) ? parametroMinimo.PAG_VALOR : 0;
        const tiempoMaximoEspera = !isNaN(parametroMaximo.PAG_VALOR) ? parametroMaximo.PAG_VALOR : 0;
        const tiempoEsperaAdicional = !isNaN(ordenCompra.tiempo_espera_carguio) ? ordenCompra.tiempo_espera_carguio : 0;
        const tiempoMaximoAcumulado = tiempoMaximoEspera + tiempoEsperaAdicional;


        const esValido = validarRangoFecha(gde.GDE_HORA_CARGUIO_INICIO, tiempoMinimoEspera, tiempoMaximoAcumulado);

        return {
            esValido: esValido,
            tiempoMinimoEspera: tiempoMinimoEspera,
            tiempoMaximoAcumulado: tiempoMaximoAcumulado,
        }

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

async function listarGdeProveedorNoConfirmadas() {
    return await DATOS_seleccionarGdeProveedorConfirmadas();
}



function seleccionarParametroGeneral(id, parametro) {
    return new Promise((resolve, reject) => {
        try {
            DATOS_seleccionar_Parametro_general(id, parametro, function (resultado) {
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


function seleccionarOrdenCompra(DocEntry, ItemCode) {
    return new Promise((resolve, reject) => {
        try {
            DATOS_seleccionar_datos_proveedores_por_DocEntry(DocEntry, ItemCode, function (resultado) {
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


// Devuelve true/false según exista evidencia de ingreso planta para la guía
function existeEvidenciaIngresoPlantaParaGuia(idGde) {
    return new Promise((resolve, reject) => {
        DATOS_seleccionar_evidencia_guia(
            idGde,
            constantes.tipoEvidencia.ingresoPlanta,
            function (datos_evidencia) {
                try {

                    // Ajusta según tu implementación real de DATOS_seleccionar_evidencia_guia
                    if (
                        datos_evidencia === -1 ||
                        datos_evidencia === "-1" ||
                        !datos_evidencia ||
                        (Array.isArray(datos_evidencia) && datos_evidencia.length === 0)
                    ) {
                        resolve(false); // NO tiene foto
                    } else {
                        resolve(true);  // Sí tiene al menos una foto
                    }
                } catch (e) {
                    console.error("Error evaluando evidencia ingreso planta:", e);
                    // En caso de error, mejor ser conservador y decir que NO tiene
                    resolve(false);
                }
            }
        );
    });
}



async function validarEvidenciasIngresoPlantaLocales() {
    const gdeNoConfirmadas = await DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas();


    if (
        gdeNoConfirmadas === "-1" ||
        !Array.isArray(gdeNoConfirmadas) ||
        gdeNoConfirmadas.length === 0
    ) {
        return {
            valido: false,
            mensaje: "No se encontraron guías pendientes de confirmar ingreso planta.",
        };
    }

    const faltantes = [];

    // Recorremos todas las guías pendientes
    for (const gde of gdeNoConfirmadas) {
        // Ajusta el ID según tu select (ROWID o ID_GDE)
        const tieneFoto = await existeEvidenciaIngresoPlantaParaGuia(gde.ROWID);
        if (!tieneFoto) {
            faltantes.push(gde.ROWID);
        }
    }

    if (faltantes.length > 0) {
        return {
            valido: false,
            mensaje:
                "No es posible confirmar el ingreso a planta.\n\n" +
                "Hay guías NO tienen evidencia de ingreso planta."
        };
    }

    // Todo OK
    return { valido: true };
}
