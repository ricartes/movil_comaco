// Fachada deliberadamente delgada: la captura, persistencia y transmisión viven en Android.
var SEGUIMIENTO_configuracionNativaPromesa = null;
var SEGUIMIENTO_configuracionNativaUrl = null;

function SEGUIMIENTO_obtenerDireccionServidor() {
    return new Promise(function (resolve, reject) {
        DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result) {
            // Principal.js reemplaza este parámetro al arrancar. El bootstrap técnico
            // puede ejecutarse antes de que termine ese callback, por lo que la URL
            // compilada vigente debe prevalecer sobre un valor SQLite obsoleto.
            if (typeof url_server_nuevo === "string" && url_server_nuevo) resolve(url_server_nuevo);
            else if (result && result.PAG_VALOR) resolve(String(result.PAG_VALOR));
            else reject(new Error("No existe DIRECCION_SERVIDOR para configurar el seguimiento nativo."));
        });
    });
}

function SEGUIMIENTO_pluginNativo() {
    if (typeof ComacoTracking === "undefined") {
        throw new Error("ComacoTracking no está disponible en esta plataforma.");
    }
    return ComacoTracking;
}

function configurarSeguimientoNativo() {
    return SEGUIMIENTO_obtenerDireccionServidor().then(function (baseUrl) {
        var urlNormalizada = String(baseUrl).replace(/\/+$/, "");
        if (SEGUIMIENTO_configuracionNativaPromesa &&
            SEGUIMIENTO_configuracionNativaUrl === urlNormalizada) {
            return SEGUIMIENTO_configuracionNativaPromesa;
        }

        var configuracionAnterior = SEGUIMIENTO_configuracionNativaPromesa || Promise.resolve();
        var nuevaConfiguracion = configuracionAnterior.catch(function () {
            // Permite recuperar una configuración fallida sin mantener la promesa
            // anterior rechazada como bloqueo permanente.
        }).then(function () {
            return SEGUIMIENTO_pluginNativo().configurar({
                URL_SERVICIO: urlNormalizada,
                UUID_DISPOSITIVO: (window.device && device.uuid) || Obtener_dato_local("uid") || "browser",
                VERSION_APP: Obtener_dato_local("version_app") || "",
                INTERVALO_MS: 1000,
                DISTANCIA_METROS: 0,
                TAMANO_LOTE: 50,
                TIMEOUT_HTTP_MS: 15000,
                REINTENTOS_CORTOS: 3,
                VERSION_ESQUEMA: 1
            });
        });

        SEGUIMIENTO_configuracionNativaUrl = urlNormalizada;
        SEGUIMIENTO_configuracionNativaPromesa = nuevaConfiguracion;
        return nuevaConfiguracion.catch(function (error) {
            if (SEGUIMIENTO_configuracionNativaPromesa === nuevaConfiguracion) {
                SEGUIMIENTO_configuracionNativaPromesa = null;
                SEGUIMIENTO_configuracionNativaUrl = null;
            }
            throw error;
        });
    });
}

function SEGUIMIENTO_registrarCredencialesNativas(credenciales) {
    return configurarSeguimientoNativo().then(async function () {
        await AUDITORIA_auditarConfiguracion("antes_tracking").catch(function () {});
        var resultado = await SEGUIMIENTO_pluginNativo().sincronizarSeguimientos(credenciales || []);
        await TRACKING_POLICY_procesarResultado(resultado, "registro_seguimiento");
        return resultado;
    });
}

function registrarSeguimientoLocalNativo(seguimiento) {
    var item = {
        ID_UNICO_SEGUIMIENTO: SEGUIMIENTO_uuidObligatorio(
            seguimiento && seguimiento.ID_UNICO_SEGUIMIENTO,
            "ID_UNICO_SEGUIMIENTO"
        ),
        ID_UNICO_MOVIL_GDE: SEGUIMIENTO_textoObligatorio(
            seguimiento && seguimiento.ID_UNICO_MOVIL_GDE,
            "ID_UNICO_MOVIL_GDE"
        ),
        UUID_DISPOSITIVO: (window.device && device.uuid) ||
            Obtener_dato_local("uid") || "browser",
        FECHA_INICIO_DISPOSITIVO_UTC: SEGUIMIENTO_fechaUtcObligatoria(
            seguimiento && seguimiento.FECHA_INICIO_DISPOSITIVO_UTC,
            "FECHA_INICIO_DISPOSITIVO_UTC"
        )
    };
    return configurarSeguimientoNativo().then(async function () {
        var resultado = await SEGUIMIENTO_pluginNativo().registrarSeguimientoLocal(item);
        await TRACKING_POLICY_procesarResultado(resultado, "seguimiento_local");
        return resultado;
    });
}

function cancelarSeguimientoLocalNativo(idUnicoSeguimiento) {
    if (!idUnicoSeguimiento || typeof ComacoTracking === "undefined") {
        return Promise.resolve(false);
    }
    return configurarSeguimientoNativo().then(function () {
        return SEGUIMIENTO_pluginNativo().cancelarSeguimientoLocal(idUnicoSeguimiento);
    });
}

function registrarErrorSeguimientoNativo(error) {
    if (typeof ComacoTracking === "undefined" ||
            typeof ComacoTracking.registrarErrorTecnico !== "function") {
        return Promise.resolve();
    }
    return configurarSeguimientoNativo().then(function () {
        return ComacoTracking.registrarErrorTecnico({
            CODIGO: error && error.code ? error.code : "SEGUIMIENTO_RESPUESTA_INVALIDA",
            ID_UNICO_MOVIL_GDE: error && error.ID_UNICO_MOVIL_GDE || "",
            ID_UNICO_SEGUIMIENTO_LOCAL: error && error.ID_UNICO_SEGUIMIENTO_LOCAL || "",
            ID_UNICO_SEGUIMIENTO_SERVIDOR: error && error.ID_UNICO_SEGUIMIENTO_SERVIDOR || ""
        });
    });
}

function reconciliarEstadoGpsNativo() {
    return configurarSeguimientoNativo().then(async function () {
        var credenciales = typeof listarCredencialesSeguimientoActivas === "function"
            ? await listarCredencialesSeguimientoActivas() : [];
        var sincronizacion = await SEGUIMIENTO_pluginNativo().sincronizarSeguimientos(credenciales);
        var continuar = await TRACKING_POLICY_procesarResultado(sincronizacion, "reconciliacion");
        if (continuar) {
            var drenaje = await SEGUIMIENTO_pluginNativo().solicitarDrenaje("reconciliacion");
            await TRACKING_POLICY_procesarResultado(drenaje, "reconciliacion_drenaje");
        }
        var estado = await SEGUIMIENTO_pluginNativo().obtenerEstado();
        return estado.servicioActivo === true || estado.seguimientosActivos > 0;
    });
}

function finalizarSeguimientoNativo(idUnicoSeguimiento) {
    return configurarSeguimientoNativo().then(async function () {
        var resultado = await SEGUIMIENTO_pluginNativo().finalizarSeguimiento(idUnicoSeguimiento);
        await TRACKING_POLICY_procesarResultado(resultado, "finalizacion");
        return resultado;
    });
}

function prepararFinalizacionSeguimientoNativo(idUnicoSeguimiento, timeoutMs) {
    return configurarSeguimientoNativo().then(async function () {
        var resultado = await SEGUIMIENTO_pluginNativo().prepararFinalizacionSeguimiento(
            idUnicoSeguimiento,
            timeoutMs || 15000
        );
        await TRACKING_POLICY_procesarResultado(resultado, "preparacion_finalizacion");
        return resultado;
    });
}

function cancelarPreparacionFinalizacionSeguimientoNativo(idUnicoSeguimiento) {
    return configurarSeguimientoNativo().then(async function () {
        var resultado = await SEGUIMIENTO_pluginNativo().cancelarPreparacionFinalizacionSeguimiento(
            idUnicoSeguimiento
        );
        await TRACKING_POLICY_procesarResultado(resultado, "cancelacion_preparacion_finalizacion");
        return resultado;
    });
}

function solicitarDrenajeSeguimientoNativo(motivo) {
    return configurarSeguimientoNativo().then(async function () {
        var razon = motivo || "javascript";
        var resultado = await SEGUIMIENTO_pluginNativo().solicitarDrenaje(razon);
        await TRACKING_POLICY_procesarResultado(resultado, razon);
        return resultado;
    });
}

function SEGUIMIENTO_diagnosticoPromesa(nombre, argumentos, valorPredeterminado) {
    return new Promise(function (resolve) {
        var diagnostic = window.cordova && cordova.plugins && cordova.plugins.diagnostic;
        if (!diagnostic || typeof diagnostic[nombre] !== "function") {
            resolve(valorPredeterminado);
            return;
        }
        var args = [resolve, function () { resolve(valorPredeterminado); }].concat(argumentos || []);
        diagnostic[nombre].apply(diagnostic, args);
    });
}

async function validarRequisitosTrackingCordova() {
    if (typeof ComacoTracking !== "undefined"
            && typeof ComacoTracking.obtenerDiagnosticoPolitica === "function") {
        var nativo = await ComacoTracking.obtenerDiagnosticoPolitica("preflight_interactivo");
        return {
            ok: nativo.decision.normalTrackingAllowed,
            gpsActivo: nativo.location.deviceLocationEnabled,
            permisoUbicacion: nativo.permissions.fineLocation,
            permisoBackground: nativo.permissions.backgroundLocation,
            permisoNotificaciones: nativo.permissions.postNotifications,
            backgroundRestricted: nativo.powerPolicy.backgroundRestricted,
            decision: nativo.decision,
            enforcement: nativo.enforcement,
            policyDiagnostic: nativo
        };
    }
    var diagnostic = window.cordova && cordova.plugins && cordova.plugins.diagnostic;
    if (!diagnostic) {
        return { ok: true, gpsActivo: true, permisoUbicacion: true, permisoBackground: true, permisoNotificaciones: true };
    }
    var gpsActivo = await SEGUIMIENTO_diagnosticoPromesa("isLocationEnabled", [], false);
    var estadoUbicacion = await SEGUIMIENTO_diagnosticoPromesa("getLocationAuthorizationStatus", [], "DENIED");
    var autorizado = estadoUbicacion === diagnostic.permissionStatus.GRANTED || estadoUbicacion === diagnostic.permissionStatus.GRANTED_WHEN_IN_USE;
    var background = estadoUbicacion === diagnostic.permissionStatus.GRANTED;
    var notificaciones = true;
    if (diagnostic.permission && diagnostic.permission.POST_NOTIFICATIONS) {
        var estadoNotificacion = await SEGUIMIENTO_diagnosticoPromesa("getPermissionAuthorizationStatus", [diagnostic.permission.POST_NOTIFICATIONS], "GRANTED");
        notificaciones = estadoNotificacion === diagnostic.permissionStatus.GRANTED;
    }
    return { ok: !!gpsActivo && autorizado && background && notificaciones, gpsActivo: !!gpsActivo, permisoUbicacion: autorizado, permisoBackground: background, permisoNotificaciones: notificaciones };
}

function solicitarActivarGPS() {
    if (window.cordova && cordova.plugins && cordova.plugins.diagnostic) cordova.plugins.diagnostic.switchToLocationSettings();
}

function inicializarGpsDiagnosticHandler() { return true; }

function AUDITORIA_prepararLogin(tipoLogin, userKey) {
    return configurarSeguimientoNativo().then(function () {
        return SEGUIMIENTO_pluginNativo().prepararAuditoriaLogin({
            TIPO_LOGIN: tipoLogin || "ONLINE",
            USER_KEY: userKey || ""
        });
    });
}

function AUDITORIA_confirmarLoginOnline(preparada, respuesta, userKey) {
    if (!preparada || !preparada.EVENTO || !respuesta) return Promise.resolve();
    return SEGUIMIENTO_pluginNativo().confirmarAuditoriaLoginOnline({
        ID_EVENTO: preparada.EVENTO.ID_EVENTO,
        ID_USUARIO: respuesta.ID_USUARIO,
        USER_KEY: userKey || "",
        TOKEN_INSTALACION: respuesta.TOKEN_INSTALACION || "",
        AUDITORIA_CONFIRMADA: respuesta.AUDITORIA_CONFIRMADA === true,
        ESTADO_DISPOSITIVO: respuesta.ESTADO_DISPOSITIVO || ""
    });
}

function AUDITORIA_descartarLoginPreparado(preparada) {
    if (!preparada || !preparada.EVENTO) return Promise.resolve();
    return SEGUIMIENTO_pluginNativo().descartarAuditoria(preparada.EVENTO.ID_EVENTO);
}

function AUDITORIA_registrarLoginLocal(usuario, tipoLogin) {
    return configurarSeguimientoNativo().then(function () {
        var idServidor = usuario && (usuario.id_usuario || usuario.ID_USUARIO);
        return SEGUIMIENTO_pluginNativo().registrarAuditoriaLogin({
            ID_USUARIO: idServidor ? Number(idServidor) : null,
            USER_KEY: usuario && usuario.user ? usuario.user : "",
            TIPO_LOGIN: tipoLogin || "OFFLINE"
        });
    });
}

function AUDITORIA_auditarConfiguracion(motivo) {
    var idUsuario = Number(Obtener_dato_local("id_usuario_activo") || 0);
    return configurarSeguimientoNativo().then(function () {
        return SEGUIMIENTO_pluginNativo().auditarConfiguracion({
            ID_USUARIO: idUsuario > 0 ? idUsuario : null,
            USER_KEY: Obtener_dato_local("user_activo") || "",
            MOTIVO: motivo || "configuracion"
        });
    });
}

function AUDITORIA_solicitarDrenaje(motivo) {
    if (typeof ComacoTracking === "undefined") return Promise.resolve();
    return configurarSeguimientoNativo().then(function () {
        return ComacoTracking.solicitarDrenajeAuditoria(motivo || "javascript");
    });
}

// -----------------------------------------------------------------------------
// Recuperación durable de la credencial de instalación para operación offline.
// -----------------------------------------------------------------------------
var CREDENCIAL_asegurarPromesa = null;
var CREDENCIAL_ultimoFalloMs = 0;
var CREDENCIAL_REINTENTO_FALLO_MS = 30000;
var CREDENCIAL_loginWebOriginal = typeof login_web === "function" ? login_web : null;
var CREDENCIAL_enviarGuiasOriginal = typeof enviar_guias_proveedor === "function"
    ? enviar_guias_proveedor : null;
var CREDENCIAL_cargaParametrosOriginal = typeof carga_parametros === "function"
    ? carga_parametros : null;

function CREDENCIAL_error(codigo, mensaje) {
    var error = new Error(mensaje || codigo || "ERROR_CREDENCIAL_INSTALACION");
    error.code = codigo || "ERROR_CREDENCIAL_INSTALACION";
    return error;
}

function CREDENCIAL_respuestaAsmx(data) {
    var respuesta = data && Object.prototype.hasOwnProperty.call(data, "d") ? data.d : data;
    if (typeof respuesta === "string") respuesta = JSON.parse(respuesta);
    return respuesta;
}

function CREDENCIAL_contextoUsuario(opciones) {
    opciones = opciones || {};
    return {
        usuario: String(opciones.usuario || Obtener_dato_local("ultimo_activo") ||
            Obtener_dato_local("user_activo") || "").trim(),
        password: String(opciones.password || Obtener_dato_local("ultimo_password") || ""),
        idUsuario: Number(opciones.idUsuario || Obtener_dato_local("id_usuario_activo") || 0)
    };
}

function CREDENCIAL_postAsegurar(baseUrl, entrada) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            type: "POST",
            url: String(baseUrl).replace(/\/+$/, "") + "/CredencialInstalacion.asmx/Asegurar",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(entrada),
            dataType: "json",
            timeout: 20000,
            success: function (data) {
                try {
                    resolve(CREDENCIAL_respuestaAsmx(data));
                } catch (error) {
                    reject(CREDENCIAL_error("RESPUESTA_CREDENCIAL_INVALIDA", error.message));
                }
            },
            error: function (xhr, textStatus) {
                var detalle = xhr && xhr.responseText ? String(xhr.responseText) : textStatus;
                reject(CREDENCIAL_error("SERVICIO_CREDENCIAL_NO_DISPONIBLE", detalle));
            }
        });
    });
}

function CREDENCIAL_asegurarInstalacion(motivo, opciones) {
    opciones = opciones || {};
    if (CREDENCIAL_asegurarPromesa) return CREDENCIAL_asegurarPromesa;

    if (checkConnection() === "No network connection") {
        return Promise.reject(CREDENCIAL_error("SIN_RED", "No hay conexión para validar la credencial."));
    }

    if (!opciones.ignorarEspera && CREDENCIAL_ultimoFalloMs > 0 &&
            Date.now() - CREDENCIAL_ultimoFalloMs < CREDENCIAL_REINTENTO_FALLO_MS) {
        return Promise.reject(CREDENCIAL_error("CREDENCIAL_EN_BACKOFF", "La recuperación está temporalmente en espera."));
    }

    var contexto = CREDENCIAL_contextoUsuario(opciones);
    if (!contexto.usuario) {
        return Promise.reject(CREDENCIAL_error("USUARIO_LOCAL_NO_DISPONIBLE", "No existe un usuario local para validar la instalación."));
    }

    CREDENCIAL_asegurarPromesa = (async function () {
        var preparada = null;
        var credencial = null;
        var tokenInstalacion = "";
        try {
            preparada = await AUDITORIA_prepararLogin("AUTOMATICO", contexto.usuario);
            try {
                credencial = await SEGUIMIENTO_pluginNativo().obtenerCredencialInstalacion();
                tokenInstalacion = credencial && credencial.TOKEN_INSTALACION
                    ? String(credencial.TOKEN_INSTALACION) : "";
            } catch (errorCredencialLocal) {
                tokenInstalacion = "";
            }

            var baseUrl = await SEGUIMIENTO_obtenerDireccionServidor();
            var respuesta = await CREDENCIAL_postAsegurar(baseUrl, {
                usuario: contexto.usuario,
                password: contexto.password,
                idUsuario: contexto.idUsuario,
                tokenInstalacion: tokenInstalacion,
                auditoria: preparada
            });

            if (!respuesta || respuesta.EXITO !== true) {
                throw CREDENCIAL_error(
                    respuesta && respuesta.CODIGO,
                    respuesta && respuesta.MENSAJE
                );
            }

            await AUDITORIA_confirmarLoginOnline(preparada, respuesta, contexto.usuario);

            var verificada = await SEGUIMIENTO_pluginNativo().obtenerCredencialInstalacion();
            if (!verificada || !verificada.ID_INSTALACION || !verificada.TOKEN_INSTALACION) {
                throw CREDENCIAL_error(
                    "CREDENCIAL_NO_PERSISTIDA",
                    "Android no confirmó la persistencia de la credencial."
                );
            }

            CREDENCIAL_ultimoFalloMs = 0;
            console.log(
                "[CREDENCIAL][OK] motivo=" + String(motivo || "automatico") +
                " codigo=" + String(respuesta.CODIGO || "OK")
            );

            Promise.resolve().then(function () {
                return AUDITORIA_solicitarDrenaje("credencial_asegurada");
            }).catch(function () {});
            Promise.resolve().then(function () {
                return solicitarDrenajeSeguimientoNativo("credencial_asegurada");
            }).catch(function () {});

            return respuesta;
        } catch (error) {
            CREDENCIAL_ultimoFalloMs = Date.now();
            if (preparada) {
                await AUDITORIA_descartarLoginPreparado(preparada).catch(function () {});
            }
            console.warn(
                "[CREDENCIAL][ERROR] motivo=" + String(motivo || "automatico") +
                " codigo=" + String(error && error.code || "ERROR_CREDENCIAL_INSTALACION")
            );
            throw error;
        } finally {
            tokenInstalacion = "";
            contexto.password = "";
            if (credencial) credencial.TOKEN_INSTALACION = null;
        }
    })().finally(function () {
        CREDENCIAL_asegurarPromesa = null;
    });

    return CREDENCIAL_asegurarPromesa;
}

function CREDENCIAL_reintentarEnvioGuias(bandera, callback) {
    CREDENCIAL_enviarGuiasOriginal(bandera, function (resultado) {
        if (resultado !== -1 || checkConnection() === "No network connection") {
            typeof callback === "function" && callback(resultado);
            return;
        }

        CREDENCIAL_asegurarInstalacion("reintento_envio_guias", {
            ignorarEspera: true
        }).then(function () {
            CREDENCIAL_enviarGuiasOriginal(bandera, callback);
        }).catch(function () {
            typeof callback === "function" && callback(-1);
        });
    });
}

if (CREDENCIAL_enviarGuiasOriginal) {
    enviar_guias_proveedor = function (bandera, callback) {
        CREDENCIAL_asegurarInstalacion("antes_envio_guias").then(function () {
            CREDENCIAL_reintentarEnvioGuias(bandera, callback);
        }).catch(function () {
            // La guía continúa pendiente en SQLite. No se borra ni cambia su estado.
            typeof callback === "function" && callback(-1);
        });
    };
}

if (CREDENCIAL_cargaParametrosOriginal) {
    carga_parametros = function () {
        if (checkConnection() === "No network connection") {
            return CREDENCIAL_cargaParametrosOriginal();
        }

        CREDENCIAL_asegurarInstalacion("carga_parametros", {
            ignorarEspera: true
        }).then(function () {
            CREDENCIAL_cargaParametrosOriginal();
        }).catch(function (error) {
            $$(".link").removeClass("disabled");
            $$("#btn_carga_parametros").removeClass("disabled");
            app.dialog.alert(
                "No fue posible validar la instalación. Los datos locales se conservaron y la sincronización se reintentará automáticamente.",
                "Sincronización pendiente"
            );
            console.warn("[CREDENCIAL][CARGA_PARAMETROS_BLOQUEADA]", error && error.code || "ERROR");
        });
    };
}

if (CREDENCIAL_loginWebOriginal) {
    login_web = function (u, callback) {
        CREDENCIAL_loginWebOriginal(u, function (resultado) {
            if (!resultado || resultado === -1 || resultado.estado != 1) {
                typeof callback === "function" && callback(resultado);
                return;
            }

            CREDENCIAL_asegurarInstalacion("login_online", {
                usuario: u && u.user,
                password: u && u.password,
                idUsuario: resultado.id_usuario || resultado.ID_USUARIO,
                ignorarEspera: true
            }).then(function () {
                resultado.auditoria_login_gestionada = true;
                typeof callback === "function" && callback(resultado);
            }).catch(function (error) {
                // Para usuarios ya existentes Principal.js conserva el login local.
                // Para una instalación nueva no se completa el login hasta persistir
                // la credencial, evitando crear una sesión incapaz de sincronizar.
                resultado.estado = 0;
                resultado.codigo_credencial = error && error.code || "ERROR_CREDENCIAL_INSTALACION";
                typeof callback === "function" && callback(resultado);
            });
        });
    };
}

document.addEventListener("online", function () {
    CREDENCIAL_asegurarInstalacion("conexion_recuperada", {
        ignorarEspera: true
    }).then(function () {
        if (typeof solicitarEnvioAutomaticoDatos === "function") {
            solicitarEnvioAutomaticoDatos("conexion_recuperada", true);
        }
    }).catch(function () {
        // El modo offline continúa operativo y las colas permanecen intactas.
    });
}, false);

document.addEventListener("resume", function () {
    if (checkConnection() !== "No network connection") {
        CREDENCIAL_asegurarInstalacion("resume", {
            ignorarEspera: true
        }).catch(function () {});
    }
}, false);
