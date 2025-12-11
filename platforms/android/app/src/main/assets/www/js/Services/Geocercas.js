function validarGeocerca(rol) {
    return new Promise((resolve, reject) => {
        var resultadoGeocerca = {
            punto: "",
            validacion: null,
            latitud: null,
            longitud: null,
            accuracy: null,
        }

        if (rol != null) {
            getLocation2().then((coordenadas) => {
                if (!coordenadas || (coordenadas && (coordenadas.GPS_LON == 0 || coordenadas.GPS_LAT == 0))) {
                    reject("Ubicación no activada o aplicación sin permisos para obtenerla...")
                } else {
                    resultadoGeocerca.latitud = coordenadas.GPS_LAT;
                    resultadoGeocerca.longitud = coordenadas.GPS_LON;
                    resultadoGeocerca.accuracy = coordenadas.ACCURACY;
                    let punto = coordenadas.GPS_LON + " " + coordenadas.GPS_LAT;
                    resultadoGeocerca.punto = punto;
                    Datos_validaGeocerca(rol, punto).then((validacion) => {
                        resultadoGeocerca.validacion = validacion;
                        resolve(resultadoGeocerca);
                    }).catch((e) => {
                        reject(e);
                    });

                }

            });
        } else {
            reject("No ha seleccionado el predio. Para continuar, debe seleccionarlo desde la parte superior de la pantalla.")
        }
    });
}


async function detectarUbicacionSimulada() {

    //let ubicacionSimulada = false;
    //const ubicacion = await getLocation2();
    const pluginResult = await mockLocation.checkMockLocation(false);


    return {
        esUbicacionSimulada: pluginResult.isMockLocation,
        detalle: pluginResult
    }
}


function validarCierreControl(validacionGeocerca, id_gde, tipoPunto, confirmaIngresoPlanta = false) {
    let resultado = {
        cierra: true,
        advertencia: false,
        mensaje: "No se puede continuar debido a que la ubicación se encuentra fuera del KMZ."
    }
    return new Promise((resolve, reject) => {

        //si encuentra
        if (validacionGeocerca.encontrado) {

            //si pertenece a la geocerca
            if (validacionGeocerca.pertenece == 1) {
                resultado.cierra = false;
                resolve(resultado);
            }

            //si no pertenece a la geocerca y flag = 0, no debe cerrar, solo advertir
            if (validacionGeocerca.pertenece == 0 && validacionGeocerca.flagControl == 0) {
                resultado.cierra = false;
                resultado.advertencia = true;
                resultado.mensaje = "Ubicación se encuentra fuera del KMZ. Sin embargo podrá continuar generando el Despacho";
                if (id_gde != "-1") {
                    DATOS_GuardaAlertaGeocerca(id_gde, tipoPunto, 1, function (result) {
                        resolve(resultado);
                    });
                } else {
                    resolve(resultado);
                }
            } else {
                resolve(resultado);
            }

        } else {
            resultado.mensaje = "El predio seleccionado no tiene una Geocerca asociada."
            if (confirmaIngresoPlanta) {
                resultado.mensaje = "El destino seleccionado no tiene una Geocerca asociada."
                resultado.advertencia = true;
                resultado.cierra = false;
            }

            resolve(resultado);
        }
    });


}



function getLocation2() {
    return new Promise((resolve, reject) => {
        var ubicacion = { GPS_LAT: 0, GPS_LON: 0, ERROR: "", ACCURACY: 0, status: false }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {

                ubicacion.GPS_LAT = position.coords.latitude;
                ubicacion.GPS_LON = position.coords.longitude;
                ubicacion.ACCURACY = position.coords.accuracy;
                ubicacion.status = true;
                resolve(ubicacion);
            }, function (err) {
                ubicacion.ERROR = JSON.stringify(err);
                resolve(ubicacion);
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        } else {
            ubicacion.ERROR = "Ubicación no activada";
            resolve(ubicacion);
        }
    });
}

function permisosGps() {
    cordova.plugins.permissions.requestPermission(cordova.plugins.permissions.ACCESS_COARSE_LOCATION);
    cordova.plugins.permissions.requestPermission(cordova.plugins.permissions.ACCESS_FINE_LOCATION);
    cordova.plugins.permissions.requestPermission(cordova.plugins.permissions.ACCESS_BACKGROUND_LOCATION);
}
