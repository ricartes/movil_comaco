// Dom7
var version_movil = 3;
var $$ = Dom7;
var db = null;
var ip_interna = null;
var ip_externa = null;
var usuario_activo;
var hay_parametro;



var url_server_nuevo = "https://desarrollo-rcartes.ddns.net/origenes";
//var url_server_nuevo = "https://araucaria.mcondor.cl:5901/trazabilidad";
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

// Init/Create left panel view

// Init/Create main view
var mainView = app.views.create(".view-main", {
    pushState: false,
});

var ls = app.loginScreen.create({ el: ".login-screen" });

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

//error acelerometro
function onError() {
    alert("onError!");
}

function EnvioAutomatico(segundo_plano, automatico) {
    var bloqueado = Obtener_dato_local("bloqueado");
    //alert(bloqueado);

    if (envio_automatico_activado == 1 || automatico == 1) {
        if (bloqueado == 0) {
            var mensaje = "";
            var error_aserrable = 0;
            var error_pulpable = 0;
            envio_automatico_activado = 0;
            Guardar_dato_local("bloqueado", 1);

            if (segundo_plano == 1) {
                /*cordova.plugins.backgroundMode.configure({
                            title: 'GFE',
                            icon: 'ldpi',
                            text: 'Enviando...'
                        });*/
            }

            if (checkConnection() != "No network connection") {
                comprueba_conexion("0", function (result_conexion) {
                    if (result_conexion == 1) {
                        enviar_guias_proveedor("0", function (result_guias) {
                            enviar_evidencias_proveedor("0", function (result_evidencias) {
                                enviar_imagenes("0", function (result_imagenes) {
                                    enviar_actualizacion_numero_guias(
                                        "0",
                                        function (result_actualizadas) {
                                            Guardar_dato_local("bloqueado", 0);
                                            envio_automatico_activado = 1;
                                            if (
                                                result_evidencias == 1 ||
                                                result_evidencias == 0 ||
                                                result_imagenes == 1 ||
                                                result_imagenes == 0
                                            ) {
                                                $$("#ESTADO_").text("Datos enviados correctamente");
                                            } else {
                                                $$("#ESTADO_").text("Error al enviar datos");
                                            }
                                        }
                                    );
                                });
                            });
                        });
                    } else {
                        Guardar_dato_local("bloqueado", 0);
                        envio_automatico_activado = 1;
                        $$("#ESTADO_").text("Conexión no establecida con el servidor");

                        if (segundo_plano == 1) {
                            /*cordova.plugins.backgroundMode.configure({
                                              title: 'GFE',
                                              icon: 'ldpi',
                                              text: 'Conexión no establecida con el servidor'
                                          });*/
                        }
                    }
                });
            } else {
                Guardar_dato_local("bloqueado", 0);
                envio_automatico_activado = 1;
                $$("#ESTADO_").text("Conexión a Internet no detectada");

                if (segundo_plano == 1) {
                    /*cordova.plugins.backgroundMode.configure({
                                  title: 'GFE',
                                  icon: 'ldpi',
                                  text: 'Conexión a Internet no detectada'
                              });*/
                }
            }
        } else {
            if (segundo_plano == 1) {
                /*cordova.plugins.backgroundMode.configure({
                            title: 'GFE',
                            icon: 'ldpi',
                            text: 'proceso bloqueado... Otro envio en curso'
                        });*/
            }
        }
    }
}

function EnvioAutomatico_segundo_plano(segundo_plano, automatico) {

    Guardar_dato_local("bloqueado", 1);
    const bloqueadoTraza = parseInt(Obtener_dato_local("bloqueado-traza"));



    if (checkConnection() != "No network connection") {
        comprueba_conexion("0", function (result_conexion) {
            if (result_conexion == 1) {
                enviar_guias_proveedor("0", function (result_guias) {
                    enviar_evidencias_proveedor("0", function (result_evidencias) {
                        enviar_imagenes("0", function (result_imagenes) {
                            Guardar_dato_local("bloqueado", 0);
                            envio_automatico_activado = 1;
                            if (
                                result_evidencias == 1 ||
                                result_evidencias == 0 ||
                                result_imagenes == 1 ||
                                result_imagenes == 0
                            ) {
                                $$("#ESTADO_").text("Datos enviados correctamente");
                            } else {
                                $$("#ESTADO_").text("Error al enviar datos");
                            }
                        });
                    });
                });



            } else {
                Guardar_dato_local("bloqueado", 0);
            }
        });
    } else {
        Guardar_dato_local("bloqueado", 0);
    }
    if (bloqueadoTraza === 0) {
        compruebaEnviaTrazabilidad().then((resultadoTrazabilidad) => {
        }).catch((error) => { });
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

function onActivate() {
    //cordova.plugins.backgroundMode.disableWebViewOptimizations();
    //var isSilent = !cordova.plugins.backgroundMode.getDefaults().silent;
    //cordova.plugins.backgroundMode.setDefaults({ silent: isSilent });

    cordova.plugins.backgroundMode.disableWebViewOptimizations();
    envio_automatico_activado = 1;
    var counter = 0;
    timmer = setInterval(function () {
        var bloqueado = Obtener_dato_local("bloqueado");

        if (bloqueado == 0) {
            EnvioAutomatico_segundo_plano(1, 1);
        } else {
            /*cordova.plugins.backgroundMode.configure({
                              title: 'GFE',
                              icon: 'ldpi',
                              text: 'Proceso bloqueado...'
                          });*/
        }
    }, 10000);
}



//cuando el dispositivo ha cargado todos los elementos
document.addEventListener("deviceready", async function () {


    inicializarVariables();
    if (Obtener_dato_local("actualiza_direccion") == undefined) {
        Guardar_dato_local("actualiza_direccion", 0);
    }


    permisosCamara();

    //
    cordova.plugins.backgroundMode.enable();

    cordova.plugins.backgroundMode.setDefaults({
        title: "GFE",
        icon: "ldpi",
        text: "Proceso ejecutando en segundo plano...",
    });

    cordova.plugins.backgroundMode.disableBatteryOptimizations();
    cordova.plugins.backgroundMode.on("activate", onActivate);

    Borrar_dato_local("version_app");
    cordova.getAppVersion.getVersionNumber(function (version) {
        Guardar_dato_local("version_app", version);
        $$("#ver_app").text(version);
    });

    try {
        await Tablas_crear_tablas(); //ok
        await comprobarActualizarEsquema();

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

    $$("#uid_movil").text("UUID: " + device.uuid);

    ls.open(false);

    var rut_activo = Obtener_dato_local("ultimo_activo");
    var clave_activo = Obtener_dato_local("ultimo_password");

    //alert(rut_activo);
    //alert(clave_activo);

    if (rut_activo != undefined && clave_activo != undefined) {
        $$("#input_username").val(rut_activo);
        $$("#input_password").val(clave_activo);
    }

    document.addEventListener("backbutton", boton_atras, false);

    $$("#btn_login").on("click", async function () {
        const estadoGPS = await verificarEstadoGPS();
        if (!estadoGPS) {
            app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo para iniciar sesión.`, "GFE");
        } else {
            login();
        }
    });

    $$(".login-screen").on("loginscreen:opened", function (e) {
        envio_automatico_activado = 0;
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
        datos_usuario(usuario_activo, function (result) {
            //alert(result);
            if (result != -1) {
                Guardar_dato_local("bloqueado", 0);
                envio_automatico_activado = 1;
                Guardar_dato_local(
                    "nombre_activo",
                    result.nombre + " " + result.apellido
                );
                Guardar_dato_local("user_activo", result.user);
                Guardar_dato_local("rut_activo", result.rut);
                Guardar_dato_local("empresa_activo", result.id_emp);

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
            }
        });
    });




    if (typeof initializeResumeHandler === "function") {
        initializeResumeHandler();
    } else {
        app.dialog.alert("La función initializeResumeHandler no está disponible.");
    }

    if (typeof inicializarGpsDiagnosticHandler === "function") {
        inicializarGpsDiagnosticHandler();
    } else {
        app.dialog.alert("La función inicializarGpsDiagnosticHandler no está disponible.");
    }

    /*if (typeof configureBackgroundGeolocation === "function") {
        configureBackgroundGeolocation();
    } else {
        app.dialog.alert("La función configureBackgroundGeolocation no está disponible.");
    }*/

});


function mostarOcultarMenuPrincipal(visible) {
    if (visible) {
        $$('#page_guias').removeClass("disabled");
        $$('#btn_canchaGuiaIndex').removeClass("disabled");
        $$('#btnControlFaenas').removeClass("disabled");
        $$('#btn_consultaGuiaIndex').removeClass("disabled");
        $$('#btn_login').removeClass("disabled");
        $$('#item_zonas').removeClass("disabled");
        $$('#item_cargar_folios').removeClass("disabled");
        $$('#item_liberar_folios').removeClass("disabled");
        $$('#item_enviar_guias').removeClass("disabled");
        $$('#item_enviar_cfaena').removeClass("disabled");
        $$("#item_configuracion").removeClass("disabled");
    } else {
        $$('#page_guias').addClass("disabled");
        $$('#btn_canchaGuiaIndex').addClass("disabled");
        $$('#btnControlFaenas').addClass("disabled");
        $$('#btn_consultaGuiaIndex').addClass("disabled");
        $$('#item_zonas').addClass("disabled");
        $$('#item_cargar_folios').addClass("disabled");
        $$('#item_liberar_folios').addClass("disabled");
        $$('#item_enviar_guias').addClass("disabled");
        $$('#item_enviar_cfaena').addClass("disabled");
        $$("#item_configuracion").addClass("disabled");
        //$$('#btn_login').addClass("disabled");
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
                function () {
                    Borrar_dato_local("user_activo");
                    Borrar_dato_local("rut_activo");
                    Borrar_dato_local("nombre_activo");
                    Borrar_dato_local("empresa_activo");
                    navigator.app.exitApp();
                }
            );
            break;

        case "carga-folios":
            //seleccion_zonas();
            mainView.router.navigate("/");
            //seleccion_zonas();
            break;

        case "carga-parametros":
            mainView.router.navigate("/");
            //seleccion_zonas();
            break;

        case "enviar-datos":
            //alert("activo envio automatico");
            //envio_automatico_activado=1;
            //seleccion_zonas();
            $$("#enviados_appbar").text("");
            envio_automatico_activado = 1;
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
    if (hay_parametro == 0) {
        app.dialog.alert("No se han cargado los parámetros", "Emisión desde faena");
        return false;
    } else {

        try {

            const estadoGPS = await verificarEstadoGPS();
            if (!estadoGPS) {
                app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
            } else {

                const fecha_hora = FechaHoraActual();
                app.dialog.progress("Espere por favor...");
                comparar_fecha_hora_ws(fecha_hora, function (result_fecha) {
                    app.dialog.close();
                    if (result_fecha == 0) {
                        // Hora incorrecta según el servidor
                        app.dialog.alert(`Se ha detectado que la hora está incorrecta (${fecha_hora}). Favor configurar la fecha/hora en automático.`, "GFE");

                    } else if (result_fecha === -1) {
                        // No hay conexión: Validar configuración automática
                        validateAutomaticDateTimeZone((isAutomatic) => {
                            if (isAutomatic) {
                                mainView.router.navigate("/EmisionDesdeFaena/0/-1/0");
                            } else {
                                app.dialog.alert(`(${fecha_hora}) Se ha detectado que la configuración de fecha/hora NO está en automático. Favor configurar la fecha/hora en automático.`, "GFE");
                            }
                        });
                    } else {
                        // Hora correcta según el servidor
                        mainView.router.navigate("/EmisionDesdeFaena/0/-1/0");
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
                                    guarda_usuario(result, function (result1) {
                                        logeado = 1;
                                        ok_login(result);
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
                        guarda_ultimo_login(us, function (res) {
                            logeado = 1;
                            ok_login(us);
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

            const usuarioActivo = Obtener_dato_local('user_activo');
            Borrar_dato_local("user_activo");
            Borrar_dato_local("rut_activo");
            Borrar_dato_local("empresa_activo");
            (async () => {
                let datos = await generarDataTrazabilidad(
                    TipoAccionTypes.CIERRE_SESION,
                    usuarioActivo,
                );
                await obtenerUbicacionEInsertarLog(
                    usuarioActivo,
                    datos
                );
            })();
            ls.open(false);
        }
    );

    //$$('#formulario_login')[0].reset();
}

function ok_login(usuario) {
    usuario_activo = usuario;
    var ls = app.loginScreen.create({ el: ".login-screen" });

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

    app.dialog.confirm(
        "¿Está seguro que desea confirmar el ingreso planta?",
        "GFE",
        async function () {

            app.dialog.progress("Enviando...")
            try {
                await enviarConfirmacionIngresoPlantaService();

            } catch (ex) {
                alert(JSON.stringify(ex));
            }
            finally {
                app.dialog.close();
            }
        }
    );




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
