var exec = require("cordova/exec");

var instalado = false;

document.addEventListener("deviceready", instalarFinalizacionAsincrona, false);

function ejecutarNativo(accion, idSeguimiento) {
    return new Promise(function (resolve, reject) {
        exec(
            resolve,
            reject,
            "ComacoTrackingFinalization",
            accion,
            [{ ID_UNICO_SEGUIMIENTO: idSeguimiento }]
        );
    });
}

function desempaquetarAsmx(data) {
    var respuesta = data && Object.prototype.hasOwnProperty.call(data, "d")
        ? data.d
        : data;
    if (typeof respuesta === "string") respuesta = JSON.parse(respuesta);
    return respuesta;
}

function errorNormalizado(error, mensajePredeterminado) {
    var mensaje = error && error.message
        ? error.message
        : (typeof error === "string" ? error : mensajePredeterminado);
    var resultado = new Error(mensaje || "Error al finalizar la guía.");
    resultado.code = error && error.code ? error.code : null;
    return resultado;
}

function registrarFalloPosteriorAlExito(error, idSeguimiento) {
    console.error("[FINALIZACION_ASINCRONA][POST_CONFIRMACION_ERROR]", error);
    if (typeof registrarErrorSeguimientoNativo === "function") {
        registrarErrorSeguimientoNativo({
            code: "FINALIZACION_POST_CONFIRMACION_ERROR",
            ID_UNICO_SEGUIMIENTO_LOCAL: idSeguimiento,
            message: error && error.message ? error.message : String(error || "")
        }).catch(function () {});
    }
}

function instalarFinalizacionAsincrona() {
    if (instalado || !window.cordova || cordova.platformId !== "android") return;
    if (typeof window.enviarConfirmacionIngresoPlantaSeguraWebService !== "function") return;

    instalado = true;
    var flujoAnterior = window.enviarConfirmacionIngresoPlantaSeguraWebService;

    window.enviarConfirmacionIngresoPlantaSeguraWebService = async function (
        idUnico,
        opcionesFinalizacion
    ) {
        var opciones = opcionesFinalizacion || {};
        var requiereSeguimiento = opciones.REQUIERE_SEGUIMIENTO_ACTIVO === true;
        var origen = String(opciones.ORIGEN_FINALIZACION || "GEOCERCA")
            .trim()
            .toUpperCase();
        var motivo = String(opciones.MOTIVO_FINALIZACION || "").trim();
        var idSeguimiento = await obtenerIdSeguimientoGuia(idUnico);

        // Compatibilidad total con guías históricas que nunca tuvieron tracking.
        if (!idSeguimiento) {
            if (requiereSeguimiento) {
                throw new Error("La guía no tiene un seguimiento activo asociado.");
            }
            return flujoAnterior(idUnico, opcionesFinalizacion);
        }

        var servidorConfirmado = false;
        var solicitudEnviada = false;
        var respuestaServidor = null;
        var credencialInstalacion = null;

        try {
            if (typeof configurarSeguimientoNativo === "function") {
                await configurarSeguimientoNativo();
            }

            // Pausa la captura, normaliza el outbox y devuelve el corte sin esperar ACK.
            var corte = await ejecutarNativo("preparar", idSeguimiento);
            var secuenciaFinal = Number(corte && corte.SECUENCIA_FINAL_LOCAL);
            var descartadas = Number(corte && corte.CANTIDAD_DESCARTADA_LOCAL || 0);
            var fechaTermino = corte && corte.FECHA_TERMINO_DISPOSITIVO_UTC;

            if (!Number.isSafeInteger(secuenciaFinal) || secuenciaFinal < 0 ||
                    !Number.isSafeInteger(descartadas) || descartadas < 0 ||
                    descartadas > secuenciaFinal || !fechaTermino) {
                throw new Error("El corte local del seguimiento es inválido.");
            }

            credencialInstalacion = await ComacoTracking.obtenerCredencialInstalacion();
            if (!credencialInstalacion || !credencialInstalacion.ID_INSTALACION ||
                    !credencialInstalacion.TOKEN_INSTALACION) {
                throw new Error("No existe una credencial válida para esta instalación.");
            }

            var idUsuario = parseInt(Obtener_dato_local("id_usuario_activo") || "0", 10);
            if (!idUsuario) {
                throw new Error("No existe un usuario servidor válido para finalizar.");
            }

            var baseUrl = await SEGUIMIENTO_obtenerDireccionServidor();
            var ruta = String(baseUrl).replace(/\/+$/, "") +
                "/SeguimientoFinalizacionAsincrona.asmx/Solicitar";
            solicitudEnviada = true;
            var response = await axios.post(ruta, {
                idUnico: idUnico,
                idUnicoSeguimiento: idSeguimiento,
                uuid: Obtener_dato_local("uid") ||
                    (window.device && device.uuid) || "",
                versionApp: Obtener_dato_local("version_app") || "",
                secuenciaFinalLocal: secuenciaFinal,
                cantidadDescartadaLocal: descartadas,
                fechaTerminoDispositivoUtc: fechaTermino,
                origenFinalizacion: origen,
                motivoFinalizacion: motivo,
                idInstalacion: credencialInstalacion.ID_INSTALACION,
                tokenInstalacion: credencialInstalacion.TOKEN_INSTALACION,
                idUsuario: idUsuario
            }, {
                headers: { "Content-Type": "application/json; charset=utf-8" },
                timeout: 20000
            });

            respuestaServidor = desempaquetarAsmx(response && response.data);
            if (!respuestaServidor || respuestaServidor.STATUS !== true) {
                // Existe respuesta explícita: el servidor rechazó y es seguro reanudar.
                await ejecutarNativo("cancelar", idSeguimiento);
                return respuestaServidor;
            }
            servidorConfirmado = true;

            // Desde aquí la descarga ya terminó operacionalmente. Los errores de
            // mantenimiento local se registran, pero nunca revierten ese éxito.
            try {
                await ejecutarNativo("confirmar", idSeguimiento);
            } catch (errorConfirmacion) {
                try {
                    if (typeof finalizarSeguimientoNativo !== "function") {
                        throw errorConfirmacion;
                    }
                    await finalizarSeguimientoNativo(idSeguimiento);
                } catch (errorFallback) {
                    registrarFalloPosteriorAlExito(errorFallback, idSeguimiento);
                }
            }

            if (typeof marcarCredencialSeguimiento === "function") {
                try {
                    await marcarCredencialSeguimiento(idSeguimiento, "TERMINAL");
                } catch (errorCredencialLocal) {
                    registrarFalloPosteriorAlExito(errorCredencialLocal, idSeguimiento);
                }
            }

            return respuestaServidor;
        } catch (error) {
            if (!servidorConfirmado) {
                if (!solicitudEnviada) {
                    // La solicitud nunca pudo salir: el servidor no pudo guardar el corte.
                    try {
                        await ejecutarNativo("cancelar", idSeguimiento);
                    } catch (errorCancelacion) {
                        console.error("[FINALIZACION_ASINCRONA][CANCELACION_ERROR]", errorCancelacion);
                    }
                    throw errorNormalizado(error, "Error al finalizar la guía.");
                }

                // La solicitud pudo ser procesada aunque se haya perdido la respuesta.
                // Se conserva PAUSADA_FINALIZACION para que el reintento use el mismo
                // corte y nunca genere posiciones posteriores a la secuencia informada.
                var errorIndeterminado = errorNormalizado(
                    error,
                    "No fue posible confirmar la respuesta del servidor. Reintente la finalización."
                );
                errorIndeterminado.code = "RESPUESTA_FINALIZACION_INDETERMINADA";
                throw errorIndeterminado;
            }

            registrarFalloPosteriorAlExito(error, idSeguimiento);
            return respuestaServidor;
        } finally {
            if (credencialInstalacion) {
                credencialInstalacion.TOKEN_INSTALACION = null;
                credencialInstalacion = null;
            }
        }
    };
}
