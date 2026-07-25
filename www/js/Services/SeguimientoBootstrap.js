// Bootstrap técnico independiente de la sesión interactiva y migración idempotente desde bd.db.
var SEGUIMIENTO_bootstrapPromesa = null;
var SEGUIMIENTO_bootstrapResumeRegistrado = false;

function SEGUIMIENTO_listarPosicionesLegacy() {
    return new Promise(function (resolve, reject) {
        var posiciones = [];
        SEGUIMIENTO_abrirBaseDatos().transaction(function (tr) {
            tr.executeSql("SELECT * FROM SEGUIMIENTO_POSICION_PENDIENTE ORDER BY ID", [], function (tr, rs) {
                posiciones = SEGUIMIENTO_filas(rs);
            });
        }, reject, function () { resolve(posiciones); });
    });
}

async function SEGUIMIENTO_migrarLegacyANativo() {
    var credenciales = await listarCredencialesSeguimientoActivas();
    var posiciones = await SEGUIMIENTO_listarPosicionesLegacy();
    await ComacoTracking.sincronizarSeguimientos(credenciales);
    var lote = 100;
    for (var i = 0; i < posiciones.length; i += lote) {
        await ComacoTracking.importarPosicionesLegacy(posiciones.slice(i, i + lote));
    }
    var verificacion = await ComacoTracking.verificarMigracion({
        seguimientos: credenciales.length,
        posiciones: posiciones.length,
        uuids: posiciones.map(function (item) { return item.UUID_POSICION; }),
        completar: true
    });
    if (!verificacion.verificada) throw new Error("La migración de seguimiento no pudo verificarse.");
    await SEGUIMIENTO_limpiarLegacyConfirmado(credenciales.map(function (item) {
        return item.ID_UNICO_SEGUIMIENTO;
    }), true);
    return { credenciales: credenciales.length, posiciones: posiciones.length };
}

async function SEGUIMIENTO_reconciliarProvisionalesLocales() {
    var seguimientos = await SEGUIMIENTO_listarGuiasLocalesPendientes();
    for (var i = 0; i < seguimientos.length; i++) {
        await registrarSeguimientoLocalNativo(seguimientos[i]);
    }
    return seguimientos.length;
}

function inicializarSeguimientoBootstrap() {
    if (SEGUIMIENTO_bootstrapPromesa) return SEGUIMIENTO_bootstrapPromesa;
    SEGUIMIENTO_bootstrapPromesa = (async function () {
        await Tablas_crear_tablas();
        if (typeof comprobarActualizarEsquema === "function") await comprobarActualizarEsquema();
        await configurarSeguimientoNativo();
        var migracion = await SEGUIMIENTO_migrarLegacyANativo();
        var provisionales = await SEGUIMIENTO_reconciliarProvisionalesLocales();
        var inicio = await ComacoTracking.solicitarDrenaje("inicio_o_resume");
        await TRACKING_POLICY_procesarResultado(inicio, "inicio_o_resume");
        var estado = await ComacoTracking.obtenerEstado();
        console.log("[TRACKING][NATIVE_READY] activos=" + estado.seguimientosActivos + " locales=" + provisionales + " pendientes=" + estado.pendientes + " legacy=" + migracion.posiciones);
        return true;
    })().catch(function (error) {
        SEGUIMIENTO_bootstrapPromesa = null;
        console.error("No fue posible inicializar el seguimiento técnico nativo.");
        throw error;
    });
    return SEGUIMIENTO_bootstrapPromesa;
}

async function SEGUIMIENTO_alResumeTecnico() {
    try {
        await inicializarSeguimientoBootstrap();
        await SEGUIMIENTO_reconciliarProvisionalesLocales();
        var retornoSettings = await TRACKING_POLICY_revalidarRetornoSettings();
        if (!retornoSettings) {
            await TRACKING_POLICY_revisar("resume");
            await reconciliarEstadoGpsNativo();
        }
    } catch (error) {
        console.error("No fue posible reconciliar el seguimiento técnico nativo.");
    }
    if (typeof manejarResumeInteractivo === "function") await manejarResumeInteractivo();
}

function SEGUIMIENTO_registrarEntradasTecnicas() {
    if (!SEGUIMIENTO_bootstrapResumeRegistrado && typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("resume", SEGUIMIENTO_alResumeTecnico, false);
        SEGUIMIENTO_bootstrapResumeRegistrado = true;
    }
}
SEGUIMIENTO_registrarEntradasTecnicas();

// La validación normal utiliza únicamente el token técnico. La contraseña local
// se envía sólo después de que el servidor responde que requiere renovación.
function CREDENCIAL_instalarValidacionSinPassword() {
    if (typeof CREDENCIAL_postAsegurar !== "function") return false;

    var postBase = CREDENCIAL_postAsegurar;
    CREDENCIAL_postAsegurar = function (baseUrl, entrada) {
        entrada = entrada || {};
        var passwordRenovacion = String(entrada.password || "");
        var validacion = {
            usuario: entrada.usuario || "",
            password: "",
            idUsuario: Number(entrada.idUsuario || 0),
            tokenInstalacion: entrada.tokenInstalacion || "",
            auditoria: entrada.auditoria
        };

        return postBase(baseUrl, validacion).then(function (respuesta) {
            if (!respuesta || respuesta.EXITO === true ||
                    respuesta.CODIGO !== "CREDENCIAL_REQUIERE_RENOVACION") {
                passwordRenovacion = "";
                return respuesta;
            }

            if (!passwordRenovacion) {
                passwordRenovacion = "";
                return respuesta;
            }

            var renovacion = {
                usuario: entrada.usuario || "",
                password: passwordRenovacion,
                idUsuario: Number(entrada.idUsuario || 0),
                tokenInstalacion: entrada.tokenInstalacion || "",
                auditoria: entrada.auditoria
            };

            return postBase(baseUrl, renovacion).finally(function () {
                renovacion.password = "";
                passwordRenovacion = "";
            });
        }).catch(function (error) {
            passwordRenovacion = "";
            throw error;
        });
    };

    return true;
}

// Una validación positiva se reutiliza durante treinta minutos para que el
// programador de diez segundos no consulte innecesariamente al servidor.
var CREDENCIAL_ultimaValidacionExitosaMs = 0;
var CREDENCIAL_ultimaValidacionUsuario = 0;
var CREDENCIAL_VALIDACION_TTL_MS = 30 * 60 * 1000;

function CREDENCIAL_instalarCacheValidacion() {
    if (typeof CREDENCIAL_asegurarInstalacion !== "function") return false;

    var asegurarBase = CREDENCIAL_asegurarInstalacion;
    CREDENCIAL_asegurarInstalacion = function (motivo, opciones) {
        opciones = opciones || {};
        var idUsuarioActual = Number(
            opciones.idUsuario || Obtener_dato_local("id_usuario_activo") || 0
        );
        var forzar = opciones.forzarValidacion === true ||
            motivo === "reintento_envio_guias" ||
            motivo === "carga_parametros" ||
            motivo === "conexion_recuperada" ||
            motivo === "login_online";
        var cacheVigente = !forzar &&
            CREDENCIAL_ultimaValidacionExitosaMs > 0 &&
            CREDENCIAL_ultimaValidacionUsuario === idUsuarioActual &&
            Date.now() - CREDENCIAL_ultimaValidacionExitosaMs <
                CREDENCIAL_VALIDACION_TTL_MS;

        if (cacheVigente) {
            return Promise.resolve({
                EXITO: true,
                CODIGO: "CREDENCIAL_CACHE_VIGENTE",
                CREDENCIAL_RENOVADA: false
            });
        }

        return asegurarBase(motivo, opciones).then(function (respuesta) {
            CREDENCIAL_ultimaValidacionExitosaMs = Date.now();
            CREDENCIAL_ultimaValidacionUsuario = idUsuarioActual;
            return respuesta;
        }).catch(function (error) {
            if (error && (
                    error.code === "CREDENCIAL_INSTALACION_NO_AUTORIZADA" ||
                    error.code === "CREDENCIAL_REQUIERE_RENOVACION" ||
                    error.code === "USUARIO_DISPOSITIVO_NO_AUTORIZADO")) {
                CREDENCIAL_ultimaValidacionExitosaMs = 0;
                CREDENCIAL_ultimaValidacionUsuario = 0;
            }
            throw error;
        });
    };

    return true;
}

// El envío se repara solamente cuando Recibe_Guia_V3 confirma que el token no
// está autorizado. Timeouts, errores funcionales y fallos de contrato no rotan
// credenciales y conservan la guía pendiente para el próximo ciclo.
var CREDENCIAL_ultimoCodigoEnvioGuia = "";

function CREDENCIAL_instalarReparacionSelectivaGuias() {
    if (typeof CREDENCIAL_enviarGuiasOriginal !== "function" ||
            typeof $ !== "function" || typeof document === "undefined") {
        return false;
    }

    $(document).ajaxError(function (_evento, xhr, configuracion) {
        var url = configuracion && configuracion.url
            ? String(configuracion.url) : "";
        if (url.indexOf("Recibe_Guia_V3") < 0) return;

        var cuerpo = String(xhr && xhr.responseText || "");
        CREDENCIAL_ultimoCodigoEnvioGuia =
            cuerpo.indexOf("CREDENCIAL_INSTALACION_NO_AUTORIZADA") >= 0
                ? "CREDENCIAL_INSTALACION_NO_AUTORIZADA"
                : "";
    });

    CREDENCIAL_reintentarEnvioGuias = function (bandera, callback) {
        CREDENCIAL_ultimoCodigoEnvioGuia = "";
        CREDENCIAL_enviarGuiasOriginal(bandera, function (resultado) {
            if (resultado !== -1 || checkConnection() === "No network connection") {
                typeof callback === "function" && callback(resultado);
                return;
            }

            // jQuery dispara ajaxError después del callback local de error.
            setTimeout(function () {
                if (CREDENCIAL_ultimoCodigoEnvioGuia !==
                        "CREDENCIAL_INSTALACION_NO_AUTORIZADA") {
                    typeof callback === "function" && callback(-1);
                    return;
                }

                CREDENCIAL_ultimaValidacionExitosaMs = 0;
                CREDENCIAL_ultimaValidacionUsuario = 0;
                CREDENCIAL_asegurarInstalacion("reintento_envio_guias", {
                    ignorarEspera: true,
                    forzarValidacion: true
                }).then(function () {
                    // Un único reintento. Si vuelve a fallar, la guía permanece local.
                    CREDENCIAL_enviarGuiasOriginal(bandera, callback);
                }).catch(function () {
                    typeof callback === "function" && callback(-1);
                });
            }, 0);
        });
    };

    return true;
}

function CREDENCIAL_postLogin(baseUrl, entrada) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            type: "POST",
            url: String(baseUrl).replace(/\/+$/, "") +
                "/CredencialInstalacion.asmx/Login",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(entrada),
            dataType: "json",
            timeout: 20000,
            success: function (data) {
                try {
                    resolve(CREDENCIAL_respuestaAsmx(data));
                } catch (error) {
                    reject(CREDENCIAL_error(
                        "RESPUESTA_LOGIN_CREDENCIAL_INVALIDA",
                        error.message
                    ));
                }
            },
            error: function (xhr, textStatus) {
                var detalle = xhr && xhr.responseText
                    ? String(xhr.responseText) : textStatus;
                reject(CREDENCIAL_error(
                    "LOGIN_CREDENCIAL_RESPUESTA_AMBIGUA",
                    detalle
                ));
            }
        });
    });
}

// Login estable: valida usuario y reutiliza el token si sigue vigente. El token
// sólo se rota cuando está ausente o desfasado, y el callback se ejecuta después
// de que Android confirma que la credencial quedó cifrada y persistida.
function CREDENCIAL_instalarLoginSeguro() {
    if (typeof login_web !== "function" || typeof $ !== "function") return false;

    login_web = function (u, callback) {
        var auditoriaPreparada = null;
        var credencialLocal = null;
        var tokenInstalacion = "";
        var respuesta = null;

        (async function () {
            auditoriaPreparada = await AUDITORIA_prepararLogin("ONLINE", u.user);
            try {
                credencialLocal =
                    await SEGUIMIENTO_pluginNativo().obtenerCredencialInstalacion();
                tokenInstalacion = credencialLocal &&
                    credencialLocal.TOKEN_INSTALACION
                    ? String(credencialLocal.TOKEN_INSTALACION) : "";
            } catch (_errorCredencialLocal) {
                tokenInstalacion = "";
            }

            var baseUrl = await SEGUIMIENTO_obtenerDireccionServidor();
            respuesta = await CREDENCIAL_postLogin(baseUrl, {
                usuario: u.user,
                password: u.password,
                tokenInstalacion: tokenInstalacion,
                auditoria: auditoriaPreparada
            });

            if (!respuesta || respuesta.EXITO !== true) {
                throw CREDENCIAL_error(
                    respuesta && respuesta.CODIGO,
                    respuesta && respuesta.MENSAJE
                );
            }

            await AUDITORIA_confirmarLoginOnline(
                auditoriaPreparada,
                respuesta,
                u.user
            );

            var credencialPersistida =
                await SEGUIMIENTO_pluginNativo().obtenerCredencialInstalacion();
            if (!credencialPersistida ||
                    !credencialPersistida.ID_INSTALACION ||
                    !credencialPersistida.TOKEN_INSTALACION) {
                throw CREDENCIAL_error(
                    "CREDENCIAL_NO_PERSISTIDA",
                    "Android no confirmó la credencial del login."
                );
            }

            u.rut = respuesta.USER_RUT;
            u.nombre = respuesta.USER_NOMBRE;
            u.apellido = respuesta.USER_APELLIDO;
            u.id_emp = respuesta.USER_ID_EMP;
            u.id_usuario = respuesta.ID_USUARIO;
            u.estado = 1;
            u.tipo_login_auditoria = "ONLINE";
            u.auditoria_login_gestionada = true;
            CREDENCIAL_ultimaValidacionExitosaMs = Date.now();
            CREDENCIAL_ultimaValidacionUsuario = Number(respuesta.ID_USUARIO || 0);
            credencialPersistida.TOKEN_INSTALACION = null;
            typeof callback === "function" && callback(u);
        })().catch(async function (error) {
            if (auditoriaPreparada) {
                await AUDITORIA_descartarLoginPreparado(auditoriaPreparada)
                    .catch(function () {});
            }
            u.estado = 0;
            u.codigo_credencial = error && error.code ||
                "ERROR_LOGIN_CREDENCIAL";
            typeof callback === "function" && callback(u);
        }).finally(function () {
            tokenInstalacion = "";
            if (credencialLocal) credencialLocal.TOKEN_INSTALACION = null;
            if (respuesta) respuesta.TOKEN_INSTALACION = null;
            u.password = "";
        });
    };

    return true;
}

CREDENCIAL_instalarValidacionSinPassword();
CREDENCIAL_instalarCacheValidacion();
CREDENCIAL_instalarReparacionSelectivaGuias();
CREDENCIAL_instalarLoginSeguro();
