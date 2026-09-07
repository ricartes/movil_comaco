// Dom7
var version_movil = 4;
var $$ = Dom7;
var db = null;
var ip_interna = null;
var ip_externa = null;
var usuario_activo;




//var url_server_nuevo = "https://desarrollo-rcartes.ddns.net/origenes";
var url_server_nuevo = "https://araucaria.mcondor.cl:5901/trazabilidad";
var url_server_desa = "http://gestiona-002-site1.itempurl.com";

// Framework7 App main instance
var app = new Framework7({
    root: "#app", // App root element
    id: "io.gestiona.gfe", // App bundle ID
    name: "Framework7", // App name
    theme: "auto", // Automatic theme detection

    smartSelect: {
        pageTitle: "Seleccionar Opción",
        sheetCloseLinkText: "Aceptar",
        closeOnSelect: true,
    },

    touch: { materialRipple: false },

    routes: routes,
    // Enable panel left visibility breakpoint
    panel: {
        leftBreakpoint: 960,
    },
});


var timmerEnvio = null;          // envíos de guías/evidencias/imágenes
var timmerTrazabilidad = null;   // solo trazabilidad
var timeoutSolicitudEnvioDatos = null;
var cicloEnvioDatosEnCurso = false;
var envioDatosPendiente = false;
var programadorEnvioDatosHabilitado = false;
var listenerOnlineEnvioDatosRegistrado = false;
var motivoEnvioDatosPendiente = "respaldo";
var ENVIO_DATOS_INTERVALO_MS = 10000;
var ENVIO_DATOS_DEBOUNCE_MS = 150;
var ENVIO_DATOS_TIMEOUT_CICLO_MS = 120000;
var versionAppCheckHecho = false;
var versionAppValida = true;   // por defecto asumimos válida hasta comprobar
var versionAppAlertMostrado = false;
var seguimientoSqliteLista = false;


// Init/Create left panel view

// Init/Create main view
var mainView = app.views.create(".view-main", {
    pushState: false,
});

var ls = app.loginScreen.create({ el: ".login-screen" });

let trackingIntervalId = null;


let trackingPermisosAdvertidos = {
    gps: false,
    ubicacion: false,
    background: false,
    notificaciones: false,
};

let trackingInicialValidado = false;

let trackingUltimaAlerta = {
    gps: 0,
    ubicacion: 0,
    background: 0,
    notificaciones: 0
};

const TRACKING_ALERT_INTERVAL = 60000; // 1 minuto


function resetTrackingAlertas() {

    resetTrackingPermisosAdvertidos();

    trackingUltimaAlerta = {
        gps: 0,
        ubicacion: 0,
        background: 0,
        notificaciones: 0
    };

    console.log("[TRACKING] Alertas de permisos reseteadas");
}


function puedeMostrarAlerta(tipo) {
    const ahora = Date.now();

    if (!trackingUltimaAlerta[tipo] || (ahora - trackingUltimaAlerta[tipo]) > TRACKING_ALERT_INTERVAL) {
        trackingUltimaAlerta[tipo] = ahora;
        return true;
    }

    return false;
}

//acelerometro
function onSuccess(acceleration) {
    alert(
        "Aceleration X: " +
        acceleration.x +
        "\n" +
        "Aceleration Y: " +
        acceleration.y +
        "\n" +
        "Aceleration Z: " +
        acceleration.z +
        "\n" +
        "Timestamp: " +
        acceleration.timestamp +
        "\n"
    );
}

function solicitarActivarGPS() {
    const diagnostic = cordova.plugins.diagnostic;

    diagnostic.switchToLocationSettings(
        function () {
            console.log("Configuración de ubicación abierta");
        },
        function (error) {
            console.error("No se pudo abrir configuración de ubicación:", error);
        }
    );
}

function solicitarAbrirConfiguracionApp() {
    const diagnostic = cordova.plugins.diagnostic;

    diagnostic.switchToSettings(
        function () {
            console.log("Configuración de la app abierta");
        },
        function (error) {
            console.error("No se pudo abrir configuración de la app:", error);
        }
    );
}

function solicitarAbrirNotificaciones() {
    const diagnostic = cordova.plugins.diagnostic;

    if (typeof diagnostic.switchToNotifications === "function") {
        diagnostic.switchToNotifications(
            function () {
                console.log("Configuración de notificaciones abierta");
            },
            function (error) {
                console.error("No se pudo abrir configuración de notificaciones:", error);
            }
        );
    } else {
        solicitarAbrirConfiguracionApp();
    }
}

function resetTrackingPermisosAdvertidos() {
    trackingPermisosAdvertidos.gps = false;
    trackingPermisosAdvertidos.ubicacion = false;
    trackingPermisosAdvertidos.background = false;
    trackingPermisosAdvertidos.notificaciones = false;
}

function mostrarAlertasTrackingFaltantes(validacion) {

    if (!validacion.gpsActivo && puedeMostrarAlerta("gps")) {
        app.dialog.confirm(
            "La ubicación del dispositivo está desactivada. ¿Desea activarla ahora?",
            "GPS desactivado",
            function () {
                solicitarActivarGPS();
            }
        );
        return;
    }

    if (!validacion.permisoUbicacion && puedeMostrarAlerta("ubicacion")) {
        app.dialog.confirm(
            "La aplicación no tiene permiso de ubicación (TODO EL TIEMPO). ¿Desea abrir la configuración para concederlo?",
            "Permiso requerido",
            function () {
                solicitarAbrirConfiguracionApp();
            }
        );
        return;
    }

    if (!validacion.permisoBackground && puedeMostrarAlerta("background")) {
        app.dialog.confirm(
            "La aplicación requiere permiso de ubicación en segundo plano para capturar trazabilidad continua. ¿Desea abrir la configuración?",
            "Permiso requerido",
            function () {
                solicitarAbrirConfiguracionApp();
            }
        );
        return;
    }

    if (!validacion.permisoNotificaciones && puedeMostrarAlerta("notificaciones")) {
        app.dialog.confirm(
            "La aplicación requiere permiso de notificaciones para mantener activo el servicio de rastreo. ¿Desea abrir la configuración?",
            "Permiso requerido",
            function () {
                solicitarAbrirNotificaciones();
            }
        );
    }
}

async function validarTrackingAlInicio() {
    try {
        const validacion = await validarRequisitosTrackingCordova();

        console.log("[TRACKING] Validación inicial:", validacion);

        trackingInicialValidado = validacion.ok;

        if (!validacion.ok) {
            mostrarAlertasTrackingFaltantes(validacion);
            return false;
        }

        return true;
    } catch (e) {
        console.error("[TRACKING] Error en validación inicial:", e);
        trackingInicialValidado = false;
        return false;
    }
}

//error acelerometro
function onError() {
    alert("onError!");
}


async function reevaluarTrackingAhora() {
    try {
        const validacion = await validarRequisitosTrackingCordova();
        const activo = await reconciliarEstadoGpsNativo();

        if (!validacion.ok) {
            mostrarAlertasTrackingFaltantes(validacion);
        } else {
            resetTrackingAlertas();
        }

        return activo;
    } catch (e) {
        console.error("[TRACKING] Error en reevaluarTrackingAhora:", e);
        return false;
    }
}


function controlarTrackingDinamico() {
    if (trackingIntervalId !== null) return;

    trackingIntervalId = setInterval(async () => {
        try {
            const validacion = await validarRequisitosTrackingCordova();
            await ComacoTracking.obtenerEstado();

            if (!validacion.ok) {
                mostrarAlertasTrackingFaltantes(validacion);
            } else {
                resetTrackingAlertas();
            }

        } catch (e) {
            console.error("Error en controlarTrackingDinamico:", e);
        }
    }, 10000);
}
async function cicloEnvioAutomaticoDatos() {
    const bloqueado = Obtener_dato_local("bloqueado");

    // Si la app está ocupada en otra cosa, no hacemos nada
    if (bloqueado != 0) {
        return;
    }

    // Validar versión de la app solo la primera vez
    if (!versionAppCheckHecho) {
        versionAppCheckHecho = true;

        try {
            const esValida = await validarVersionApp();
            versionAppValida = !!esValida;

            // 👇 Solo aquí actualizamos el flag global
            Guardar_dato_local("version_app_invalida", versionAppValida ? 0 : 1);

            if (!versionAppValida && !versionAppAlertMostrado) {
                versionAppAlertMostrado = true;
                let datos = await generarDataTrazabilidad(
                    TipoAccionTypes.VERSION_INCORRECTA_APP,
                    Obtener_dato_local("user_activo")
                );

                await obtenerUbicacionEInsertarLog(
                    Obtener_dato_local("user_activo"),
                    datos
                );

                detenerProgramadorEnvioDatos("version_invalida");

                app.dialog.alert(
                    "La versión de la aplicación instalada en este dispositivo no es la última vigente. " +
                    "Actualice la app para reactivar el envío automático de datos.",
                    "Actualización requerida"
                );
            }
        } catch (e) {
            console.error("Error validando versión (ciclo automático):", e);

            // ❗IMPORTANTE:
            // - NO tocamos versionAppValida ni version_app_invalida
            //   (dejamos el valor que ya tenía).
            // - NO apagamos el envío manual.
            // - Solo saltamos este ciclo y que el próximo intervalo vuelva a intentar.
            //
            // Opcional: si quieres reintentar validación en el próximo ciclo:
            versionAppCheckHecho = false;

            return; // salimos sin enviar nada en este tick
        }
    }

    // Si la versión es explícitamente NO válida → no se envían datos
    if (!versionAppValida) {
        return;
    }

    // Si la versión es válida, esperamos el envío normal.
    return EnvioAutomatico_segundo_plano(1, 1);
}



async function cicloEnvioTrazabilidad() {
    const bloqueadoTraza = parseInt(Obtener_dato_local("bloqueado-traza"));

    if (bloqueadoTraza === 0) {
        await compruebaEnviaTrazabilidad().catch(function (e) {
            console.warn("Error enviando trazabilidad:", e);
        });
    }

}



function ENVIO_DATOS_promesaCallback(invocador) {
    return new Promise(function (resolve, reject) {
        try {
            invocador(function (resultado) {
                resolve(resultado);
            });
        } catch (error) {
            reject(error);
        }
    });
}

function ENVIO_DATOS_conTimeout(promesa) {
    var timeoutId;
    var timeout = new Promise(function (resolve, reject) {
        timeoutId = setTimeout(function () {
            reject(new Error("Tiempo de espera agotado en el ciclo de envío de datos."));
        }, ENVIO_DATOS_TIMEOUT_CICLO_MS);
    });

    return Promise.race([promesa, timeout]).finally(function () {
        clearTimeout(timeoutId);
    });
}

async function EnvioAutomatico_segundo_plano(segundo_plano, automatico) {
    Guardar_dato_local("bloqueado", 1);

    try {
        if (checkConnection() == "No network connection") {
            console.log("[ENVIO-DATOS][SIN_RED]");
            return { SIN_RED: true };
        }

        return await ENVIO_DATOS_conTimeout((async function () {
            var resultConexion = await ENVIO_DATOS_promesaCallback(function (callback) {
                comprueba_conexion("0", callback);
            });

            if (resultConexion != 1) {
                console.log("[ENVIO-DATOS][SIN_RED]");
                return { SIN_RED: true };
            }

            var resultGuias = await ENVIO_DATOS_promesaCallback(function (callback) {
                enviar_guias_proveedor("0", callback);
            });
            console.log("[ENVIO-DATOS][GUIAS] resultado=" + String(resultGuias));

            var resultEvidencias = await ENVIO_DATOS_promesaCallback(function (callback) {
                enviar_evidencias_proveedor("0", callback);
            });
            var resultImagenes = await ENVIO_DATOS_promesaCallback(function (callback) {
                enviar_imagenes("0", callback);
            });
            var resultActualizadas = await ENVIO_DATOS_promesaCallback(function (callback) {
                enviar_actualizacion_numero_guias("0", callback);
            });

            return {
                GUIAS: resultGuias,
                EVIDENCIAS: resultEvidencias,
                IMAGENES: resultImagenes,
                GUIAS_ACTUALIZADAS: resultActualizadas
            };
        })());
    } finally {
        Guardar_dato_local("bloqueado", 0);
    }
}

function ENVIO_DATOS_sesionInteractivaValida() {
    var rutActivo = Obtener_dato_local("rut_activo");
    var usuarioActivo = Obtener_dato_local("user_activo");
    return rutActivo !== undefined && rutActivo !== null && String(rutActivo).trim() !== "" &&
        usuarioActivo !== undefined && usuarioActivo !== null && String(usuarioActivo).trim() !== "";
}

function ENVIO_DATOS_sanitizarMotivo(motivo) {
    var permitido = {
        guia_emitida: true,
        login: true,
        resume: true,
        conexion_recuperada: true,
        respaldo: true,
        background_activado: true
    };
    var normalizado = String(motivo || "respaldo").toLowerCase().trim();
    return permitido[normalizado] ? normalizado : "respaldo";
}

function inicializarProgramadorEnvioDatos() {
    if (!ENVIO_DATOS_sesionInteractivaValida()) {
        return false;
    }

    programadorEnvioDatosHabilitado = true;

    if (!timmerEnvio) {
        timmerEnvio = setInterval(function () {
            solicitarEnvioAutomaticoDatos("respaldo", true);
        }, ENVIO_DATOS_INTERVALO_MS);
    }

    if (!listenerOnlineEnvioDatosRegistrado) {
        document.addEventListener("online", function () {
            if (ENVIO_DATOS_sesionInteractivaValida()) {
                solicitarEnvioAutomaticoDatos("conexion_recuperada", true);
                if (typeof AUDITORIA_auditarConfiguracion === "function") {
                    AUDITORIA_auditarConfiguracion("conexion_recuperada").catch(function () {});
                }
            }
            if (typeof AUDITORIA_solicitarDrenaje === "function") {
                AUDITORIA_solicitarDrenaje("conexion_recuperada").catch(function () {});
            }
        }, false);
        listenerOnlineEnvioDatosRegistrado = true;
    }

    return true;
}

function detenerProgramadorEnvioDatos(motivo) {
    programadorEnvioDatosHabilitado = false;
    envioDatosPendiente = false;
    motivoEnvioDatosPendiente = "respaldo";

    if (timmerEnvio) {
        clearInterval(timmerEnvio);
        timmerEnvio = null;
    }
    if (timeoutSolicitudEnvioDatos) {
        clearTimeout(timeoutSolicitudEnvioDatos);
        timeoutSolicitudEnvioDatos = null;
    }

    if (!cicloEnvioDatosEnCurso) {
        Guardar_dato_local("bloqueado", 0);
    }
}

function solicitarEnvioAutomaticoDatos(motivo, inmediato) {
    var motivoSeguro = ENVIO_DATOS_sanitizarMotivo(motivo);

    if (!ENVIO_DATOS_sesionInteractivaValida()) {
        return false;
    }
    inicializarProgramadorEnvioDatos();
    console.log("[ENVIO-DATOS][SOLICITADO] motivo=" + motivoSeguro);

    if (cicloEnvioDatosEnCurso) {
        envioDatosPendiente = true;
        motivoEnvioDatosPendiente = motivoSeguro;
        console.log("[ENVIO-DATOS][OMITIDO] motivo=ciclo_en_curso");
        return true;
    }

    motivoEnvioDatosPendiente = motivoSeguro;
    if (timeoutSolicitudEnvioDatos) {
        clearTimeout(timeoutSolicitudEnvioDatos);
    }
    timeoutSolicitudEnvioDatos = setTimeout(function () {
        timeoutSolicitudEnvioDatos = null;
        ejecutarCicloEnvioAutomaticoDatos(motivoEnvioDatosPendiente);
    }, inmediato === false ? ENVIO_DATOS_DEBOUNCE_MS : 0);
    return true;
}

async function ejecutarCicloEnvioAutomaticoDatos(motivo) {
    if (!programadorEnvioDatosHabilitado || !ENVIO_DATOS_sesionInteractivaValida()) {
        return false;
    }
    if (cicloEnvioDatosEnCurso) {
        envioDatosPendiente = true;
        motivoEnvioDatosPendiente = ENVIO_DATOS_sanitizarMotivo(motivo);
        console.log("[ENVIO-DATOS][OMITIDO] motivo=ciclo_en_curso");
        return false;
    }

    if (Obtener_dato_local("bloqueado") != 0) {
        console.log("[ENVIO-DATOS][OMITIDO] motivo=bloqueo_local");
        return false;
    }

    cicloEnvioDatosEnCurso = true;
    envioDatosPendiente = false;
    var motivoSeguro = ENVIO_DATOS_sanitizarMotivo(motivo);
    console.log("[ENVIO-DATOS][INICIO] motivo=" + motivoSeguro);

    try {
        await cicloEnvioAutomaticoDatos();
        return true;
    } catch (error) {
        console.warn("[ENVIO-DATOS][ERROR] ciclo_no_completado");
        return false;
    } finally {
        Guardar_dato_local("bloqueado", 0);
        cicloEnvioDatosEnCurso = false;
        console.log("[ENVIO-DATOS][FIN]");

        if (envioDatosPendiente && programadorEnvioDatosHabilitado && ENVIO_DATOS_sesionInteractivaValida()) {
            var motivoReprogramado = motivoEnvioDatosPendiente;
            envioDatosPendiente = false;
            console.log("[ENVIO-DATOS][REPROGRAMADO]");
            solicitarEnvioAutomaticoDatos(motivoReprogramado, true);
        }
    }
}

function compruebaEnviaTrazabilidad() {
    let respuesta = new ResponseDTO();
    return new Promise(async (resolve, reject) => {

        Guardar_dato_local("bloqueado-traza", 1);
        try {
            const resultTrazabilidad = await listarTrazabilidad();
            if (resultTrazabilidad.status) {
                const listaTrazabilidad = resultTrazabilidad.data.listaTrazabilidad;
                const resultEnvioTrazabilidad = await enviarListadoTrazabilidad(listaTrazabilidad);
                Guardar_dato_local("bloqueado-traza", 0);
            } else {
                Guardar_dato_local("bloqueado-traza", 0);
                reject(resultTrazabilidad.error);
            }
        } catch (e) {
            Guardar_dato_local("bloqueado-traza", 0);
            reject(e);
        }
    });
}

function reanudarProcesosInteractivos() {
    versionAppCheckHecho = false;
    versionAppValida = true;
    versionAppAlertMostrado = false;
    if (!timmerTrazabilidad) timmerTrazabilidad = setInterval(cicloEnvioTrazabilidad, 10000);
    if (ENVIO_DATOS_sesionInteractivaValida()) {
        inicializarProgramadorEnvioDatos();
        solicitarEnvioAutomaticoDatos("resume", true);
    }
}

document.addEventListener("pause", function () {
    if (timmerTrazabilidad) {
        clearInterval(timmerTrazabilidad);
        timmerTrazabilidad = null;
    }
    cicloEnvioTrazabilidad().catch(function () { return false; });
}, false);

document.addEventListener("resume", reanudarProcesosInteractivos, false);





//cuando el dispositivo ha cargado todos los elementos
document.addEventListener("deviceready", async function () {

    inicializarVariables();
    Guardar_dato_local("uid", device.uuid);
    $$("#uid_movil").text("UUID: " + device.uuid);

    if (Obtener_dato_local("actualiza_direccion") == undefined) {
        Guardar_dato_local("actualiza_direccion", 0);
    }


    permisosCamara();

    reanudarProcesosInteractivos();

    Borrar_dato_local("version_app");


    cordova.getAppVersion.getVersionNumber(function (version) {
        Guardar_dato_local("version_app", version);
        $$("#ver_app").text(version);
    });

    cordova.getAppVersion.getVersionCode(function (versionCode) {
        // Ej: 4000
        Guardar_dato_local("version_app_code", versionCode);
    });


    try {
        await inicializarSeguimientoBootstrap();
        seguimientoSqliteLista = true;

    } catch (error) {
        app.dialog.alert("Error al crear las tablas:", JSON.stringify(error), "GFE");
    }

    DATOS_borra_gde_estado("P", function (result) {
        //alert("borra1")
    });

    DATOS_borra_parametro_movil_por_nombre(
        "DIRECCION_SERVIDOR",
        function (result_param) {
            DATOS_ingresar_Parametro_movil(
                1,
                "DIRECCION_SERVIDOR",
                url_server_nuevo,
                function (result_ingresa) {
                    Guardar_dato_local("actualiza_direccion", 1);
                }
            );
        }
    );


    //var ls = app.loginScreen.create({ el: '.login-screen' });

    //app.dialog.preloader("Espere...");

    if (Obtener_dato_local("tema_oscuro") == "si") {
        $$("#mibody").addClass("theme-dark color-theme-gray");
    }

    ls.open(false);

    var rut_activo = Obtener_dato_local("ultimo_activo");
    var clave_activo = Obtener_dato_local("ultimo_password");


    if (rut_activo != undefined && clave_activo != undefined) {
        $$("#input_username").val(rut_activo);
        $$("#input_password").val(clave_activo);
    }

    document.addEventListener("backbutton", boton_atras, false);

    $$("#btn_login").on("click", async function () {
        const validacion = await validarRequisitosTrackingCordova();

        console.log("[LOGIN] validación previa:", validacion);
        // El login no inicia trazabilidad. El preflight nativo se conserva,
        // pero WARN solo exige una decision al momento real de iniciar el servicio.
        login();

    });

    $$(".login-screen").on("loginscreen:opened", function (e) {
        var rut_activo = Obtener_dato_local("ultimo_activo");
        var clave_activo = Obtener_dato_local("ultimo_password");

        if (rut_activo != undefined && clave_activo != undefined) {
            $$("#input_username").val(rut_activo);
            $$("#input_password").val(clave_activo);
        }
    });

    $$(".login-screen").on("loginscreen:closed", function (e, loginScreen) {
        //alert('Login screen closed')
        var fecha_hora = FechaHoraActual();
        datos_usuario(usuario_activo, async function (result) {
            //alert(result);
            if (result != -1) {
                //startTracking();
                Guardar_dato_local("bloqueado", 0);
                Guardar_dato_local(
                    "nombre_activo",
                    result.nombre + " " + result.apellido
                );
                Guardar_dato_local("user_activo", result.user);
                Guardar_dato_local("rut_activo", result.rut);
                Guardar_dato_local("empresa_activo", result.id_emp);
                if (result.id_usuario) {
                    Guardar_dato_local("id_usuario_activo", result.id_usuario);
                }
                inicializarProgramadorEnvioDatos();
                solicitarEnvioAutomaticoDatos("login", true);
                if (seguimientoSqliteLista && typeof inicializarProgramadorEnvioSeguimiento === "function") {
                    inicializarProgramadorEnvioSeguimiento();
                    solicitarEnvioSeguimiento("inicio_o_resume", true);
                }

                if (Obtener_dato_local("ultimo_activo") != result.user) {
                    borra_orden_compra(function (result) {
                        borra_transporte(function (result) {
                            borra_empresa(function (result) {
                                borra_parametro_general(function (result) {
                                    obtener_informacion_movil();

                                });
                            });
                        });
                    });
                } else {
                    obtener_informacion_movil();
                }

                Guardar_dato_local("ultimo_activo", result.user);
                Guardar_dato_local("ultimo_password", result.clave);
                $$("#nombre_usuario").html(result.nombre);
                resetTrackingAlertas();
                try {
                    await reevaluarTrackingAhora();
                } catch (e) {
                    console.error("[TRACKING] Error al evaluar tracking después del login:", e);
                }

                // 🔹 iniciar control periódico
                controlarTrackingDinamico();

            }
        });
    });




    if (typeof inicializarGpsDiagnosticHandler === "function") {
        inicializarGpsDiagnosticHandler();
    } else {
        console.warn("inicializarGpsDiagnosticHandler no está disponible.");
    }

    await validarTrackingAlInicio();
    await TRACKING_POLICY_revisar("inicio_interactivo");



    let intentos = 0;
    let resultadoUbicacionSimulada = await detectarUbicacionSimulada();

    do {

        if (resultadoUbicacionSimulada.esUbicacionSimulada) {
            // Cerramos cualquier diálogo previo para evitar errores
            try {
                app.dialog.close();
            } catch (e) {
                console.warn("No había diálogos abiertos.");
            }

            // Mostramos el cuadro de diálogo y esperamos hasta que el usuario presione "Confirmar"
            await new Promise((resolve) => {
                app.dialog.alert(
                    'Se detectó ubicación adulterada... Debe utilizar la ubicación real para poder continuar.',
                    "GFE Proveedores",
                    async function () {
                        app.dialog.progress("Cargando..."); // Mostrar progreso mientras se verifica la nueva ubicación
                        setTimeout(async () => {
                            resultadoUbicacionSimulada = await detectarUbicacionSimulada();
                            app.dialog.close(); // Cerramos el progreso después de validar
                            resolve(); // Salimos del Promise y el ciclo continúa si sigue siendo Fake GPS
                        }, 1500); // Pequeña espera para evitar consultas instantáneas
                    }
                );
            });

            intentos++; // Contamos los intentos
        }

    } while (resultadoUbicacionSimulada.esUbicacionSimulada); // Solo salimos cuando la ubicación es real

    // 🔹 Aquí el flujo principal continúa una vez que la ubicación es válida

});


function mostarOcultarMenuPrincipal(visible) {
    if (visible) {
        $$('#page_guias').removeClass("disabled");
        $$('#page_qr_trazabilidad').removeClass("disabled");
        $$('#btn_canchaGuiaIndex').removeClass("disabled");
        $$('#btnControlFaenas').removeClass("disabled");
        $$('#btn_consultaGuiaIndex').removeClass("disabled");
        $$('#btn_login').removeClass("disabled");
        $$('#item_zonas').removeClass("disabled");
        $$('#item_enviar_guias').removeClass("disabled");
        $$('#item_enviar_cfaena').removeClass("disabled");
        $$("#item_configuracion").removeClass("disabled");
    } else {
        $$('#page_guias').addClass("disabled");
        $$('#page_qr_trazabilidad').addClass("disabled");
        $$('#btn_canchaGuiaIndex').addClass("disabled");
        $$('#btnControlFaenas').addClass("disabled");
        $$('#btn_consultaGuiaIndex').addClass("disabled");
        $$('#item_zonas').addClass("disabled");
        $$('#item_enviar_guias').addClass("disabled");
        $$('#item_enviar_cfaena').addClass("disabled");
        $$("#item_configuracion").addClass("disabled");

    }

}
function cargarUrlServidorWeb() {

    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {

        $$("#serv_web").text(result_param.PAG_VALOR);
    });
}

function boton_atras() {
    // Confirm

    var ruta_actual = mainView.router.currentPageEl.getAttribute("data-name");

    //alert(ruta_actual);

    switch (ruta_actual) {
        case "home":
            app.dialog.confirm(
                "¿Está seguro que desea salir de la aplicación?",
                "GFE",
                async function () {
                    detenerProgramadorEnvioDatos("salida_aplicacion");
                    Borrar_dato_local("user_activo");
                    Borrar_dato_local("rut_activo");
                    Borrar_dato_local("nombre_activo");
                    Borrar_dato_local("empresa_activo");

                    try {
                        await reevaluarTrackingAhora();
                        solicitarEnvioSeguimiento("salida_aplicacion", true);
                    } catch (error) {
                        console.error(
                            "[TRACKING][SALIDA_RECONCILIACION_ERROR]",
                            error && error.message ? error.message : "ERROR_RECONCILIACION"
                        );
                    }

                    navigator.app.exitApp();
                }
            );
            break;

        case "carga-parametros":
            mainView.router.navigate("/");
            //seleccion_zonas();
            break;

        case "enviar-datos":
            //seleccion_zonas();
            $$("#enviados_appbar").text("");
            mainView.router.navigate("/");
            //seleccion_zonas();
            break;

        case "Comentarios":
            //seleccion_zonas();
            mainView.router.navigate("/");
            break;

        case "configuracion":
            //alert("configuracion");

            mainView.router.navigate("/");
            //seleccion_zonas();

            break;

        case "qr-trazabilidad":
            mainView.router.navigate("/");
            break;
        case "detalle-aserrable":
            mainView.router.navigate("/");
            break;

        case "detalle-pulpable":
            mainView.router.navigate("/");
            break;

        case "emision-desde-faena":
            volver_menu();
            break;

        case "impresion":
            mainView.router.navigate("/");
            break;

        case "lista-guias":
            mainView.router.navigate("/");
            //seleccion_zonas();
            break;

        case "vista-preliminar":
            mainView.router.navigate("/");
            break;

        case "vista-preliminar-cedible":
            mainView.router.navigate("/");
            break;
    }
}

async function clickEmisionFaena() {
    const versionInvalida = parseInt(Obtener_dato_local("version_app_invalida") || "0");
    if (versionInvalida === 1) {
        app.dialog.alert(
            "La versión de la aplicación instalada no es la última vigente. " +
            "Actualice la app antes de confirmar el ingreso a planta.",
            "Actualización requerida"
        );
        return false;
    } else {
        try {
            const estadoGPS = await verificarEstadoGPS();
            if (!estadoGPS) {
                app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
            } else {

                const fecha_hora = FechaHoraActual();
                app.dialog.progress("Espere por favor...");
                validateAutomaticDateTimeZone((isAutomatic) => {
                    app.dialog.close();
                    if (isAutomatic) {
                        mainView.router.navigate("/EmisionDesdeFaena/0/-1/0");
                    } else {
                        app.dialog.alert(`(${fecha_hora}) Se ha detectado que la configuración de fecha/hora NO está en automático. Favor configurar la fecha/hora en automático y reintentar.`, "GFE");
                    }
                });

            }

        } catch (ex) {
            app.dialog.alert("No se pudo verificar estado del GPS. Vuelva a iniciar la aplicación", "GFE");
        }
    }



}

function login() {
    app.dialog.preloader("Iniciando sesión...");
    var faltan_datos = 0;

    $$("#input_username").val($$("#input_username").val().toLowerCase());
    //$$("#input_username").val($$("#input_username").val().toLowerCase());

    if ($$("#input_username").val() == "" || $$("#input_password").val() == "") {
        //$$('#btn_login').prop('disabled', false);
        $("#lb_estado").css("color", "red");
        faltan_datos = 1;
        if ($$("#input_username").val() == "") {
            $$("#lb_estado").html("Usuario no proporcionado");
        }

        if ($$("#input_password").val() == "") {
            $$("#lb_estado").html("password no proporcionado");
        }

        if (
            $$("#input_password").val() == "" &&
            $$("#input_username").val() == ""
        ) {
            $$("#lb_estado").html("Usuario y password no proporcionados");
        }

        setTimeout(function () {
            app.dialog.close();
        }, 0);
    }

    if (faltan_datos == 0) {
        logeado = 0;
        us = new usuario();
        us.user = $$("#input_username").val().toLowerCase().trim();
        us.password = $$("#input_password").val().toLowerCase().trim();

        //alert("entra");
        existe_usuario(us, function (contador) {
            //alert(contador);
            if (contador == 0) {
                //app.dialog.alert("USUARIO MOVIL NO EXISTE","ERROR");

                if (checkConnection() == "No network connection") {
                    app.dialog.alert("No hay conexión a Internet");
                    return false;
                } else {
                    comprueba_conexion("0", function (result_conexion) {
                        //alert("resulto conexion: "+result_conexion);
                        if (result_conexion == 1) {
                            login_web(us, function (result) {
                                //alert(result);

                                if (result.estado == 1) {
                                    guarda_usuario(result, async function (result1) {
                                        logeado = 1;
                                        await ok_login(result);
                                    });
                                } else {
                                    (async () => {
                                        let datos = await generarDataTrazabilidad(
                                            TipoAccionTypes.INICIO_SESION_INCORRECTO,
                                            $$("#input_username").val().toLowerCase().trim()
                                        );

                                        await obtenerUbicacionEInsertarLog(
                                            $$("#input_username").val().toLowerCase().trim(),
                                            datos
                                        );
                                        $$("#lb_estado").css("color", "red");
                                        $$("#lb_estado").html("Usuario y/o password incorrectos");

                                        setTimeout(function () {
                                            app.dialog.close();
                                        }, 800);

                                    })();
                                }
                            });
                        } else {
                            app.dialog.close();
                            app.dialog.alert(
                                "No se ha podido establecer la conexión al servidor",
                                "Login"
                            );
                        }
                    });
                }
            } else {
                //alert("login movil")
                login_movil(us, function (contador) {
                    if (contador > 0) {
                        datos_usuario(us, function (usuarioLocal) {
                            usuarioLocal.tipo_login_auditoria = "OFFLINE";
                            var finalizarLoginLocal = function () {
                                guarda_ultimo_login(usuarioLocal, async function () {
                                    logeado = 1;
                                    await ok_login(usuarioLocal);
                                });
                            };
                            if (checkConnection() == "No network connection") {
                                finalizarLoginLocal();
                                return;
                            }
                            login_web(us, function (usuarioServidor) {
                                if (usuarioServidor && usuarioServidor !== -1
                                        && usuarioServidor.estado == 1) {
                                    guarda_id_usuario_servidor(usuarioServidor, async function () {
                                        guarda_ultimo_login(usuarioServidor, async function () {
                                            logeado = 1;
                                            await ok_login(usuarioServidor);
                                        });
                                    });
                                } else {
                                    finalizarLoginLocal();
                                }
                            });
                        });
                    } else {
                        if (contador != -1) {
                            (async () => {
                                app.dialog.progress("Iniciando sesión...");
                                let datos = await generarDataTrazabilidad(
                                    TipoAccionTypes.INICIO_SESION_INCORRECTO,
                                    $$("#input_username").val().toLowerCase().trim()
                                );

                                await obtenerUbicacionEInsertarLog(
                                    $$("#input_username").val().toLowerCase().trim(),
                                    datos
                                );
                                if (us.rut == "0") {
                                    $$("#lb_estado").css("color", "red");
                                    $$("#btn_login").prop("disabled", false);
                                    $$("#lb_estado").html("Usuario y/o password incorrectos");
                                }

                                setTimeout(function () {
                                    app.dialog.close();
                                }, 800);

                            })();
                        } else {
                            $$("#lb_estado").css("color", "red");
                            $$("#btn_login").prop("disabled", false);
                            $$("#lb_estado").html("Problemas de conexion");
                        }
                    }
                    setTimeout(function () {
                        app.dialog.close();
                    }, 0);
                });
            }
        });
    }
}

function logout() {
    app.dialog.confirm(
        "¿Está seguro que desea cerrar sesión?",
        "GFE",
        function () {
            ejecutarLogoutConfirmado().catch(function (error) {
                console.error(
                    "[LOGOUT][ERROR_CALLBACK]",
                    error && error.message ? error.message : "ERROR_LOGOUT"
                );
            });
        }
    );

    //$$('#formulario_login')[0].reset();
}

async function ejecutarLogoutConfirmado() {
    console.log("[LOGOUT][CONFIRMADO]");

    detenerProgramadorEnvioDatos("logout");

    const usuarioActivo = Obtener_dato_local("user_activo");
    Borrar_dato_local("user_activo");
    Borrar_dato_local("rut_activo");
    Borrar_dato_local("empresa_activo");
    Borrar_dato_local("id_usuario_activo");
    console.log("[LOGOUT][SESION_ELIMINADA]");

    // El login se abre antes de cualquier operación de trazabilidad o red.
    ls.open(false);

    Promise.resolve().then(async function () {
        const datos = await generarDataTrazabilidad(
            TipoAccionTypes.CIERRE_SESION,
            usuarioActivo
        );
        await obtenerUbicacionEInsertarLog(usuarioActivo, datos);
    }).catch(function (error) {
        console.error(
            "[LOGOUT][TRAZABILIDAD_ERROR]",
            error && error.message ? error.message : "ERROR_TRAZABILIDAD_LOGOUT"
        );
    });

    try {
        await inicializarSeguimientoBootstrap();
    } catch (error) {
        console.error(
            "[LOGOUT][BOOTSTRAP_ERROR]",
            error && error.message ? error.message : "ERROR_BOOTSTRAP"
        );
    }

    await reevaluarTrackingAhora();
    solicitarEnvioSeguimiento("logout", true);
    console.log("[LOGOUT][TRACKING_TECNICO_CONSERVADO]");
}

async function ok_login(usuario) {
    usuario_activo = usuario;
    var ls = app.loginScreen.create({ el: ".login-screen" });

    if (usuario.auditoria_login_gestionada !== true &&
        typeof AUDITORIA_registrarLoginLocal === "function") {
        Promise.resolve().then(function () {
            return AUDITORIA_registrarLoginLocal(
                usuario,
                usuario.tipo_login_auditoria || "OFFLINE"
            );
        }).catch(function () {});
    }

    (async () => {
        let datos = await generarDataTrazabilidad(
            TipoAccionTypes.INICIO_SESION_CORRECTO,
            $$("#input_username").val().toLowerCase().trim()
        );

        await obtenerUbicacionEInsertarLog(
            $$("#input_username").val().toLowerCase().trim(),
            datos
        );

        setTimeout(function () {
            app.dialog.close();
        }, 800);

    })();
    ls.close(false);


}

//falta controlar otros aspectos del boton, como las barritas
function onBackKeyDown() {
    //alerta(3);
}

function query() {
    alert("la query");
}

function goBack() {
    window.history.back();
}

function CrearTablas() {
    Tablas_crear_tablas();
}

function envio_guias_automatico() {
    alert("mi envio!");
}

async function clickIngresoPlanta() {

    const versionInvalida = parseInt(Obtener_dato_local("version_app_invalida") || "0");
    if (versionInvalida === 1) {
        app.dialog.alert(
            "La versión de la aplicación instalada no es la última vigente. " +
            "Actualice la app antes de confirmar el ingreso a planta.",
            "Actualización requerida"
        );
        return false;
    } else {
        mainView.router.navigate("/IngresoPlanta/");

    }


}

function obtener_informacion_movil() {
    //app.dialog.close();
    if (
        Obtener_dato_local("fecha_hora_carga_parametros") != undefined &&
        Obtener_dato_local("fecha_hora_carga_parametros") != null
    ) {
        DATOS_seleccionar_Parametro_general(1, 11, function (result_param) {
            var fecha_hora_inicial = new Date(
                Obtener_dato_local("fecha_hora_carga_parametros")
            );
            var fecha_hora_actual = new Date();

            var diff = Math.abs(
                new Date() - new Date(Obtener_dato_local("fecha_hora_carga_parametros"))
            );
            var minutes = Math.floor(diff / 1000 / 60);
            var tiempo = result_param.PAG_VALOR;
            if (minutes >= tiempo) {
                app.dialog.alert(
                    "Antes de realizar alguna acción, debe cargar parámetros",
                    "RECORDATORIO",
                    function () { }
                );
            }
        });
    } else {
        app.dialog.alert(
            "Antes de realizar alguna acción, debe cargar parámetros",
            "RECORDATORIO",
            function () { }
        );
    }
}


app.init();
