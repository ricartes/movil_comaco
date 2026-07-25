var FINALIZACION_MANUAL_modoActivo = false;
var FINALIZACION_MANUAL_debugHabilitado = false;
var FINALIZACION_MANUAL_finalizando = false;

function FINALIZACION_MANUAL_obtenerBuildInfo() {
    if (typeof ComacoTracking === "undefined" ||
        typeof ComacoTracking.obtenerBuildInfo !== "function") {
        return Promise.resolve({ DEBUG: false });
    }
    return ComacoTracking.obtenerBuildInfo();
}

function FINALIZACION_MANUAL_actualizarMenu() {
    return FINALIZACION_MANUAL_obtenerBuildInfo().then(function (info) {
        FINALIZACION_MANUAL_debugHabilitado = !!(info && info.DEBUG === true);
        var fila = $$("#rowFinalizarFueraGeocercaDebug");
        if (FINALIZACION_MANUAL_debugHabilitado) fila.show();
        else fila.hide();
        return FINALIZACION_MANUAL_debugHabilitado;
    }).catch(function (error) {
        FINALIZACION_MANUAL_debugHabilitado = false;
        $$("#rowFinalizarFueraGeocercaDebug").hide();
        console.error("[FINALIZACION_MANUAL][BUILD_INFO_ERROR]", error && error.message ? error.message : error);
        return false;
    });
}

async function clickFinalizarFueraGeocerca() {
    var habilitado = await FINALIZACION_MANUAL_actualizarMenu();
    if (!habilitado) {
        app.dialog.alert(
            "La finalización fuera de geocerca solo está habilitada en compilaciones debug autorizadas.",
            "Opción no disponible"
        );
        return false;
    }

    FINALIZACION_MANUAL_modoActivo = true;
    mainView.router.navigate("/IngresoPlanta/");
    return true;
}

document.addEventListener("deviceready", function () {
    FINALIZACION_MANUAL_actualizarMenu();
}, false);

$$(document).on('page:beforeout', '.page[data-name="ingreso-planta"]', function () {
    if (!FINALIZACION_MANUAL_finalizando) FINALIZACION_MANUAL_modoActivo = false;
});

function FINALIZACION_MANUAL_confirmar(mensaje, titulo) {
    return new Promise(function (resolve) {
        app.dialog.confirm(mensaje, titulo, function () { resolve(true); }, function () { resolve(false); });
    });
}

function FINALIZACION_MANUAL_solicitarMotivo() {
    return new Promise(function (resolve) {
        app.dialog.prompt(
            "Ingrese el motivo obligatorio de esta finalización excepcional:",
            "Motivo de finalización",
            function (valor) { resolve(valor == null ? "" : String(valor).trim()); },
            function () { resolve(null); }
        );
    });
}

function FINALIZACION_MANUAL_setBotonHabilitado(habilitar) {
    var boton = $$("#btn_finaliza_fuera_geocerca");
    if (habilitar && !FINALIZACION_MANUAL_finalizando) {
        boton.removeClass("disabled color-gray");
        boton.attr("disabled", false);
    } else {
        boton.addClass("disabled color-gray");
        boton.attr("disabled", true);
    }
}

function FINALIZACION_MANUAL_obtenerMensajeError(response) {
    if (!response || !Array.isArray(response.detalle)) return null;

    for (var i = response.detalle.length - 1; i >= 0; i--) {
        var detalle = response.detalle[i];
        if (!detalle) continue;
        if (detalle.MENSAJE) return detalle.MENSAJE;
        if (detalle.RESPUESTA_WS && detalle.RESPUESTA_WS.MENSAJE) {
            return detalle.RESPUESTA_WS.MENSAJE;
        }
    }

    return null;
}

async function confirmarIngresoPlantaManual() {
    if (FINALIZACION_MANUAL_finalizando) return false;

    if (!FINALIZACION_MANUAL_debugHabilitado || !FINALIZACION_MANUAL_modoActivo) {
        app.dialog.alert("Esta opción excepcional no está autorizada en esta compilación.", "GFE");
        return false;
    }
    if (!gdeSeleccionadaIngresoPlanta) {
        app.dialog.alert("Debe seleccionar una guía activa.", "GFE");
        return false;
    }
    if (checkConnection() == "No network connection") {
        app.dialog.alert(
            "Se necesita conexión a Internet. La guía y el tracking permanecerán activos.",
            "Sin conexión"
        );
        return false;
    }

    var primeraConfirmacion = await FINALIZACION_MANUAL_confirmar(
        "ADVERTENCIA: la ubicación actual está fuera de la geocerca. Esta operación excepcional finalizará la guía sin anularla.",
        "Finalizar fuera de geocerca"
    );
    if (!primeraConfirmacion) return false;

    var segundaConfirmacion = await FINALIZACION_MANUAL_confirmar(
        "¿Confirma por segunda vez que desea finalizar esta guía fuera de la geocerca?",
        "Confirmación obligatoria"
    );
    if (!segundaConfirmacion) return false;

    var motivo = await FINALIZACION_MANUAL_solicitarMotivo();
    if (motivo === null) return false;
    if (!motivo || motivo.length > 500) {
        app.dialog.alert(
            motivo.length > 500
                ? "El motivo no puede superar 500 caracteres."
                : "Debe ingresar un motivo para continuar.",
            "Motivo obligatorio"
        );
        return false;
    }

    FINALIZACION_MANUAL_finalizando = true;
    FINALIZACION_MANUAL_setBotonHabilitado(false);
    app.dialog.preloader("Drenando posiciones y finalizando guía...");

    try {
        var versionInvalida = parseInt(Obtener_dato_local("version_app_invalida") || "0");
        if (versionInvalida === 1) throw new Error("Debe actualizar la aplicación antes de finalizar.");

        var resultConexion = await new Promise(function (resolve) {
            comprueba_conexion("0", resolve);
        });
        if (resultConexion != 1) throw new Error("No fue posible conectar con el servidor.");

        var evidencias = await validarEvidenciasIngresoPlantaLocales(gdeSeleccionadaIngresoPlanta);
        if (!evidencias.valido) throw new Error(evidencias.mensaje);

        var geocerca = await evaluarGeocercaConfirmacionIngreso(gdeSeleccionadaIngresoPlanta);
        if (!geocerca.cierra) {
            throw new Error("La ubicación permite la finalización normal. Utilice la opción Confirmar ingreso planta.");
        }

        var response = await enviarConfirmacionIngresoPlantaService(
            gdeSeleccionadaIngresoPlanta,
            {
                ORIGEN_FINALIZACION: "MANUAL_FUERA_GEOCERCA",
                MOTIVO_FINALIZACION: motivo,
                REQUIERE_SEGUIMIENTO_ACTIVO: true
            }
        );

        if (!response || response.exitosos !== 1 || response.erroneos !== 0) {
            throw new Error(
                FINALIZACION_MANUAL_obtenerMensajeError(response) ||
                "El servidor no confirmó la finalización."
            );
        }

        try { app.dialog.close(); } catch (ignore) { }
        app.dialog.alert(
            "La guía fue finalizada fuera de geocerca y el motivo quedó registrado.",
            "Finalización exitosa",
            function () {
                FINALIZACION_MANUAL_modoActivo = false;
                ir_atras_boton();
            }
        );
        return true;
    } catch (error) {
        try { app.dialog.close(); } catch (ignore) { }
        console.error("[FINALIZACION_MANUAL][ERROR]", error && error.message ? error.message : error);
        app.dialog.alert(
            "No se finalizó la guía. El tracking y las posiciones se conservaron.\n\n" +
            (error && error.message ? error.message : "Error de comunicación."),
            "Finalización fallida"
        );
        return false;
    } finally {
        FINALIZACION_MANUAL_finalizando = false;
        FINALIZACION_MANUAL_setBotonHabilitado(!!gdeSeleccionadaIngresoPlanta);
    }
}
