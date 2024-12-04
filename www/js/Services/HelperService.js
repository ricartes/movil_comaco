function compruebaHoraSistema() {
    let respuesta = new ResponseDTO();
    return new Promise((resolve, reject) => {
        if (checkConnection() != "No network connection") {
            comprueba_conexion("0", function (result_conexion) {
                if (result_conexion == 1) {
                    var fecha_hora = FechaHoraActual();
                    comparar_fecha_hora_ws(fecha_hora, function (result_fecha) {
                        if (result_fecha == 0) {
                            reject("Hay una diferencia de fecha/hora entre el dispositivo móvil y el servidor web. Se recomienda corroborar con el administrador");
                        }
                        respuesta.status = true;
                        resolve(respuesta);

                    });
                } else {
                    reject("No se puede establecer conexión con el servidor");
                }
            });

        } else {
            reject("No hay conexión a internet");
        }
    });
}