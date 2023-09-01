function ControlServiceAnular(id = null, latitud, longitud, tipoCoordenada) {
    return new Promise((resolve, reject) => {

        if (id != "-1") {
            let estado = "N";
            let mensaje = "GEOCERCA NO VÁLIDA O NO ENCONTRADA";
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