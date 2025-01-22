// Función asincrónica para obtener la ubicación y insertar en la base de datos
async function obtenerUbicacionEInsertarLog(userUsuario, datos, location = null) {
    return new Promise(async (resolve, reject) => {
        let ubicacionObtenida = false;

        try {
            //en caso de venir null o que llegue un objeto null
            if (!location) {
                const position = await new Promise((positionResolve, positionReject) => {
                    navigator.geolocation.getCurrentPosition(
                        positionResolve,
                        positionReject,
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        }
                    );
                });

                datos.latitud = position.coords.latitude;
                datos.longitud = position.coords.longitude;
                datos.timestamp = position.timestamp;
            } else {
                datos.latitud = location.latitude;
                datos.longitud = location.longitude;
                datos.timestamp = location.time;
                datos.provider = location.provider;
            }

            ubicacionObtenida = true;
        } catch (error) {
            console.error('Error al obtener la ubicación:', error.message);
        } finally {
            datos.ubicacionObtenida = ubicacionObtenida;
            try {
                // Insertar el log de usuario con la ubicación (incluso si no se obtiene la ubicación)
                await insertLogUsuario(userUsuario, datos);
                if (ubicacionObtenida) {
                    resolve(datos);
                } else {
                    resolve(datos);
                }
            } catch (error) {
                reject('Error al insertar el log de usuario: ' + error);
            }
        }
    });
}



async function generarDataTrazabilidad(accionParametro, userParametro, metadata = {}) {
    let resultado = null;
    try {
        resultado = await getPublicIPAddress();
    } catch (error) {
        console.error("Error al obtener la dirección IP pública:", error);
    } finally {
        let user_agent = {
            device: device,
            versionApp: Obtener_dato_local("version_app")
        }
        const datos = {
            accion: accionParametro,
            usu_usuario_sistema: userParametro.toLowerCase().trim(),
            versionApp: Obtener_dato_local("version_app"),
            user_agent: user_agent,
            ip_address: resultado,
            ubicacionObtenida: false,
            latitud: null,
            longitud: null,
            timestamp: null,
            metadata: metadata,
            fechaHora: moment().format('YYYY-MM-DD HH:mm:ss.SSS')
        };
        return datos;
    }
}



async function getPublicIPAddress() {
    const url = "https://api.ipify.org?format=json";
    try {
        const response = await axios.get(url);
        const data = response.data;
        const publicIP = data.ip;
        return publicIP;
    } catch (error) {
        throw new Error(error.message);
    }
}



async function listarTrazabilidad() {
    let respuesta = new ResponseDTO();
    return new Promise((resolve, reject) => {
        DATOS_ListarTrazabilidad().then((listaTrazabilidad) => {
            respuesta.data = {
                listaTrazabilidad: listaTrazabilidad
            };
            respuesta.status = true;
            resolve(respuesta);
        }).catch((error) => {
            reject(error);
        });
    });
}



function enviarTrazabilidad(trazabilidad) {
    let respuesta = new ResponseDTO();
    return new Promise((resolve, reject) => {
        enviarTrazabilidadWebService(trazabilidad).then(async (response) => {
            if (response.STATUS) {
                await Datos_eliminarLogUsuario(trazabilidad.ID);
                respuesta.data = trazabilidad;
                respuesta.status = true;
                resolve(respuesta);

            } else {
                respuesta.error = error.ERROR_MSJ;
                resolve(respuesta);
            }
        }).catch((error) => {
            respuesta.error = error.message;
            resolve(respuesta);
        });


    });

}


function enviarListadoTrazabilidad(listaTrazabilidad) {
    let respuesta = new ResponseDTO();
    return new Promise((resolve, reject) => {

        if (listaTrazabilidad.length > 0) {
            if (checkConnection() != "No network connection") {

                comprueba_conexion("0", function (result_conexion) {
                    if (result_conexion == 1) {
                        //al validar conexion, se procede a enviar datos
                        let resumen = {
                            enviados: 0,
                            errores: 0,
                        };
                        Promise.all(
                            //itera por cada inventario
                            listaTrazabilidad.map((e) =>
                                enviarTrazabilidad(e)
                            )
                        )
                            .then((responses) => {
                                responses.forEach((r) => {
                                    if (r.status) {
                                        resumen.enviados++;
                                    } else {
                                        resumen.errores++;
                                    }
                                });
                                respuesta.data = resumen;
                                respuesta.status = true;
                                resolve(respuesta);
                            })
                            .catch((err) => {
                                reject(err);
                            });


                    } else {
                        reject("No se puede establecer conexión con el servidor");
                    }
                });
            } else {
                reject("No hay conexión a internet");
            }
        } else {
            respuesta.data = listaTrazabilidad;
            respuesta.status = true;
            resolve(respuesta);
        }


    });

}

