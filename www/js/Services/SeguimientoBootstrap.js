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

// Login V2 seguro: el callback de sesión se ejecuta únicamente después de que
// Android confirma que el token devuelto por el servidor quedó cifrado y persistido.
// Ante una respuesta de red ambigua no se usa el endpoint legacy, porque el servidor
// pudo haber rotado la credencial. Los usuarios existentes continúan por login local
// y el coordinador CREDENCIAL_asegurarInstalacion repara la sincronización después.
function CREDENCIAL_instalarLoginSeguro() {
    if (typeof login_web !== "function") return false;

    login_web = function (u, callback) {
        DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (resultParam) {
            var base = String(resultParam && resultParam.PAG_VALOR || "").replace(/\/+$/, "") +
                "/Webserviceproveedor.asmx/";

            AUDITORIA_prepararLogin("ONLINE", u.user).then(function (auditoriaPreparada) {
                $.ajax({
                    type: "POST",
                    url: base + "Login_Proveedor_V2",
                    contentType: "application/json; charset=utf-8",
                    data: JSON.stringify({
                        usuario: u.user,
                        password: u.password,
                        auditoria: auditoriaPreparada
                    }),
                    dataType: "json",
                    timeout: 15000,
                    success: async function (data) {
                        var respuesta = null;
                        try {
                            respuesta = CREDENCIAL_respuestaAsmx(data);
                            if (!respuesta || respuesta.EXITO !== true) {
                                await AUDITORIA_descartarLoginPreparado(auditoriaPreparada)
                                    .catch(function () {});
                                u.estado = 0;
                                u.codigo_credencial = respuesta && respuesta.CODIGO ||
                                    "LOGIN_V2_RECHAZADO";
                                typeof callback === "function" && callback(u);
                                return;
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
                            credencialPersistida.TOKEN_INSTALACION = null;
                            typeof callback === "function" && callback(u);
                        } catch (error) {
                            await AUDITORIA_descartarLoginPreparado(auditoriaPreparada)
                                .catch(function () {});
                            u.estado = 0;
                            u.codigo_credencial = error && error.code ||
                                "ERROR_PERSISTENCIA_CREDENCIAL";
                            typeof callback === "function" && callback(u);
                        } finally {
                            if (respuesta) respuesta.TOKEN_INSTALACION = null;
                        }
                    },
                    error: function () {
                        AUDITORIA_descartarLoginPreparado(auditoriaPreparada)
                            .catch(function () {})
                            .finally(function () {
                                u.estado = 0;
                                u.codigo_credencial = "LOGIN_V2_RESPUESTA_AMBIGUA";
                                typeof callback === "function" && callback(u);
                            });
                    }
                });
            }).catch(function (error) {
                u.estado = 0;
                u.codigo_credencial = error && error.code ||
                    "AUDITORIA_LOGIN_NO_DISPONIBLE";
                typeof callback === "function" && callback(u);
            });
        });
    };

    return true;
}

CREDENCIAL_instalarValidacionSinPassword();
CREDENCIAL_instalarLoginSeguro();
