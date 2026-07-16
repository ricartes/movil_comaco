// ================== ENVÍO SEGUIMIENTO GPS ==================

var SEGUIMIENTO_envioEnCurso = false;

function SEGUIMIENTO_resultadoCiclo() {
    return {
        LOTES_ENVIADOS: 0,
        POSICIONES_CONFIRMADAS: 0,
        POSICIONES_PENDIENTES: 0,
        SEGUIMIENTOS_PENDIENTES: 0,
        ERRORES: 0,
        OMITIDO: false,
        MOTIVO: null,
        HUBO_PROGRESO: false,
        REQUIERE_CONTINUACION: false
    };
}

function SEGUIMIENTO_textoDisponible(valor) {
    if (typeof valor !== "string") {
        return null;
    }

    var texto = valor.trim();
    var textoMinuscula = texto.toLowerCase();
    if (texto === "" || textoMinuscula === "undefined" || textoMinuscula === "null") {
        return null;
    }
    return texto;
}

function SEGUIMIENTO_hayConexionDisponible() {
    try {
        return checkConnection() !== "No network connection";
    } catch (error) {
        console.warn("No fue posible comprobar la conexión para seguimiento:", error);
        return false;
    }
}

function SEGUIMIENTO_posicionParaEnviar(posicion) {
    var uuidPosicion = SEGUIMIENTO_uuidObligatorio(posicion.UUID_POSICION, "UUID_POSICION");
    var fechaDispositivoUtc = SEGUIMIENTO_fechaUtcObligatoria(
        posicion.FECHA_DISPOSITIVO_UTC,
        "FECHA_DISPOSITIVO_UTC"
    );

    if (uuidPosicion !== posicion.UUID_POSICION) {
        throw new Error("UUID_POSICION no puede modificarse antes del envío.");
    }
    if (fechaDispositivoUtc !== posicion.FECHA_DISPOSITIVO_UTC) {
        throw new Error("FECHA_DISPOSITIVO_UTC debe conservar su formato UTC original.");
    }

    return {
        UUID_POSICION: posicion.UUID_POSICION,
        SECUENCIA_LOCAL: posicion.SECUENCIA_LOCAL === undefined ? null : posicion.SECUENCIA_LOCAL,
        FECHA_DISPOSITIVO_UTC: posicion.FECHA_DISPOSITIVO_UTC,
        LATITUD: posicion.LATITUD,
        LONGITUD: posicion.LONGITUD,
        PRECISION_METROS: posicion.PRECISION_METROS === undefined ? null : posicion.PRECISION_METROS,
        VELOCIDAD_MPS: posicion.VELOCIDAD_MPS === undefined ? null : posicion.VELOCIDAD_MPS,
        RUMBO_GRADOS: posicion.RUMBO_GRADOS === undefined ? null : posicion.RUMBO_GRADOS,
        ALTITUD_METROS: posicion.ALTITUD_METROS === undefined ? null : posicion.ALTITUD_METROS,
        ES_UBICACION_SIMULADA: posicion.ES_UBICACION_SIMULADA === true || posicion.ES_UBICACION_SIMULADA === 1,
        ORIGEN_CAPTURA: posicion.ORIGEN_CAPTURA
    };
}

function SEGUIMIENTO_desempaquetarRespuesta(respuesta) {
    var resultado = respuesta;
    if (resultado && Object.prototype.hasOwnProperty.call(resultado, "d")) {
        resultado = resultado.d;
    }

    if (typeof resultado === "string") {
        resultado = JSON.parse(resultado);
    }

    if (!resultado || typeof resultado !== "object") {
        throw new Error("La respuesta de seguimiento no es válida.");
    }
    return resultado;
}

function SEGUIMIENTO_analizarConfirmaciones(respuesta, posicionesEnviadas) {
    var resultado = SEGUIMIENTO_desempaquetarRespuesta(respuesta);
    if (resultado.EXITO !== true || !Array.isArray(resultado.POSICIONES)) {
        throw new Error("El servidor rechazó el lote de seguimiento.");
    }

    var enviadosPorClave = {};
    posicionesEnviadas.forEach(function (posicion) {
        enviadosPorClave[posicion.UUID_POSICION.toUpperCase()] = posicion.UUID_POSICION;
    });

    var uuidRespuesta = {};
    var confirmadosPorClave = {};
    var insertadas = 0;
    var yaExistian = 0;
    resultado.POSICIONES.forEach(function (posicionResultado) {
        if (!posicionResultado) {
            throw new Error("La respuesta contiene una posición nula.");
        }

        var uuid = SEGUIMIENTO_uuidObligatorio(posicionResultado.UUID_POSICION, "UUID_POSICION de respuesta");
        var clave = uuid.toUpperCase();
        if (uuidRespuesta[clave]) {
            throw new Error("La respuesta contiene UUID_POSICION duplicados.");
        }
        uuidRespuesta[clave] = true;

        if (posicionResultado.ESTADO !== "INSERTADA" && posicionResultado.ESTADO !== "YA_EXISTIA") {
            throw new Error("La respuesta contiene un estado de posición no aceptado.");
        }

        if (enviadosPorClave[clave]) {
            confirmadosPorClave[clave] = enviadosPorClave[clave];
            if (posicionResultado.ESTADO === "INSERTADA") {
                insertadas++;
            } else {
                yaExistian++;
            }
        }
    });

    var confirmados = [];
    var omitidos = [];
    posicionesEnviadas.forEach(function (posicion) {
        var clave = posicion.UUID_POSICION.toUpperCase();
        if (confirmadosPorClave[clave]) {
            confirmados.push(posicion.UUID_POSICION);
        } else {
            omitidos.push(posicion.UUID_POSICION);
        }
    });

    return {
        CONFIRMADOS: confirmados,
        OMITIDOS: omitidos,
        INSERTADAS: insertadas,
        YA_EXISTIAN: yaExistian
    };
}

async function SEGUIMIENTO_registrarIntentoSeguro(listaUuid) {
    if (listaUuid.length === 0) {
        return;
    }

    try {
        await registrarIntentoEnvioPosiciones(listaUuid, new Date().toISOString());
    } catch (error) {
        console.error("No fue posible registrar el intento de envío GPS.");
    }
}

async function SEGUIMIENTO_procesarLote(
    idUnicoSeguimiento,
    posiciones,
    uuidDispositivo,
    versionApp,
    resumen,
    cantidadPendienteAntes
) {
    var uuidLote = posiciones.map(function (posicion) {
        return posicion.UUID_POSICION;
    });
    var inicioHttpMs = null;
    var finHttpMs = null;
    var httpIniciado = false;
    var fechaMasAntiguaMs = posiciones.reduce(function (menor, posicion) {
        var valor = Date.parse(posicion.FECHA_CREACION_UTC);
        return isFinite(valor) && (menor === null || valor < menor) ? valor : menor;
    }, null);

    try {
        var posicionesEntrada = posiciones.map(SEGUIMIENTO_posicionParaEnviar);
        inicioHttpMs = Date.now();
        httpIniciado = true;
        var respuesta = await enviarPosicionesSeguimientoWebService({
            ID_UNICO_SEGUIMIENTO: idUnicoSeguimiento,
            UUID_DISPOSITIVO: uuidDispositivo,
            VERSION_APP: versionApp || "",
            POSICIONES: posicionesEntrada
        });
        finHttpMs = Date.now();
        var confirmaciones = SEGUIMIENTO_analizarConfirmaciones(respuesta, posicionesEntrada);

        if (confirmaciones.CONFIRMADOS.length > 0) {
            await eliminarPosicionesSeguimientoPorUuid(confirmaciones.CONFIRMADOS);
            resumen.POSICIONES_CONFIRMADAS += confirmaciones.CONFIRMADOS.length;
            resumen.HUBO_PROGRESO = true;
        }

        if (confirmaciones.OMITIDOS.length > 0) {
            console.warn("El servidor omitió posiciones de un lote GPS.");
            await SEGUIMIENTO_registrarIntentoSeguro(confirmaciones.OMITIDOS);
            resumen.POSICIONES_PENDIENTES += confirmaciones.OMITIDOS.length;
            resumen.ERRORES++;
        }

        if (typeof SEGUIMIENTO_registrarDiagnosticoLote === "function") {
            SEGUIMIENTO_registrarDiagnosticoLote({
                CANTIDAD_ENVIADA: posiciones.length,
                INSERTADAS: confirmaciones.INSERTADAS,
                YA_EXISTIAN: confirmaciones.YA_EXISTIAN,
                OMITIDAS: confirmaciones.OMITIDOS.length,
                DEMORA_HASTA_POST_MS: typeof SEGUIMIENTO_fechaSolicitudCicloMs === "number"
                    ? Math.max(0, inicioHttpMs - SEGUIMIENTO_fechaSolicitudCicloMs)
                    : null,
                DURACION_HTTP_MS: finHttpMs - inicioHttpMs,
                EDAD_POSICION_MAS_ANTIGUA_MS: fechaMasAntiguaMs === null
                    ? null
                    : Math.max(0, inicioHttpMs - fechaMasAntiguaMs),
                DEMORA_DESDE_CREACION_HASTA_POST_MS: fechaMasAntiguaMs === null
                    ? null
                    : Math.max(0, inicioHttpMs - fechaMasAntiguaMs),
                CANTIDAD_RESTANTE: typeof cantidadPendienteAntes === "number"
                    ? Math.max(0, cantidadPendienteAntes - confirmaciones.CONFIRMADOS.length)
                    : null,
                RESULTADO: confirmaciones.OMITIDOS.length === 0 ? "EXITO" : "PARCIAL"
            });
        }

        return {
            EXITO: confirmaciones.OMITIDOS.length === 0,
            PARCIAL: confirmaciones.OMITIDOS.length > 0,
            CONFIRMADAS: confirmaciones.CONFIRMADOS.length
        };
    } catch (error) {
        console.warn("No fue posible enviar el lote de seguimiento GPS.");
        if (httpIniciado) {
            finHttpMs = Date.now();
            await SEGUIMIENTO_registrarIntentoSeguro(uuidLote);
        }
        resumen.POSICIONES_PENDIENTES += uuidLote.length;
        resumen.ERRORES++;
        if (typeof SEGUIMIENTO_registrarDiagnosticoLote === "function") {
            SEGUIMIENTO_registrarDiagnosticoLote({
                CANTIDAD_ENVIADA: posiciones.length,
                INSERTADAS: 0,
                YA_EXISTIAN: 0,
                OMITIDAS: posiciones.length,
                DEMORA_HASTA_POST_MS: httpIniciado && typeof SEGUIMIENTO_fechaSolicitudCicloMs === "number"
                    ? Math.max(0, inicioHttpMs - SEGUIMIENTO_fechaSolicitudCicloMs)
                    : null,
                DURACION_HTTP_MS: httpIniciado ? finHttpMs - inicioHttpMs : null,
                EDAD_POSICION_MAS_ANTIGUA_MS: !httpIniciado || fechaMasAntiguaMs === null
                    ? null
                    : Math.max(0, inicioHttpMs - fechaMasAntiguaMs),
                DEMORA_DESDE_CREACION_HASTA_POST_MS: !httpIniciado || fechaMasAntiguaMs === null
                    ? null
                    : Math.max(0, inicioHttpMs - fechaMasAntiguaMs),
                CANTIDAD_RESTANTE: typeof cantidadPendienteAntes === "number" ? cantidadPendienteAntes : null,
                RESULTADO: "ERROR"
            });
        }
        return { EXITO: false, PARCIAL: false, CONFIRMADAS: 0 };
    }
}

async function SEGUIMIENTO_resumenPendientes() {
    if (typeof listarResumenSeguimientosConPosicionesPendientes === "function") {
        return await listarResumenSeguimientosConPosicionesPendientes();
    }

    var ids = await listarSeguimientosConPosicionesPendientes();
    return (ids || []).map(function (idSeguimiento) {
        return {
            ID_UNICO_SEGUIMIENTO: idSeguimiento,
            CANTIDAD_PENDIENTE: null,
            FECHA_CREACION_UTC_MAS_ANTIGUA: null
        };
    });
}

async function enviarPosicionesSeguimientoPendientes() {
    var resumen = SEGUIMIENTO_resultadoCiclo();

    if (typeof HABILITAR_ENVIO_SEGUIMIENTO_NUEVO !== "undefined" && !HABILITAR_ENVIO_SEGUIMIENTO_NUEVO) {
        resumen.OMITIDO = true;
        resumen.MOTIVO = "DESHABILITADO";
        return resumen;
    }

    if (SEGUIMIENTO_envioEnCurso) {
        resumen.OMITIDO = true;
        resumen.MOTIVO = "ENVIO_EN_CURSO";
        return resumen;
    }

    if (!SEGUIMIENTO_hayConexionDisponible()) {
        resumen.OMITIDO = true;
        resumen.MOTIVO = "SIN_CONEXION";
        return resumen;
    }

    var uuidDispositivo = SEGUIMIENTO_textoDisponible(Obtener_dato_local("uid"));
    if (!uuidDispositivo) {
        resumen.OMITIDO = true;
        resumen.MOTIVO = "UUID_DISPOSITIVO_AUSENTE";
        return resumen;
    }

    SEGUIMIENTO_envioEnCurso = true;
    try {
        var seguimientos = await SEGUIMIENTO_resumenPendientes();
        if (!Array.isArray(seguimientos) || seguimientos.length === 0) {
            resumen.OMITIDO = true;
            resumen.MOTIVO = "COLA_VACIA";
            return resumen;
        }

        var versionApp = SEGUIMIENTO_textoDisponible(Obtener_dato_local("version_app")) || "";

        var colaSeguimientos = seguimientos.slice(0);
        while (colaSeguimientos.length > 0 && resumen.LOTES_ENVIADOS < SEGUIMIENTO_MAX_LOTES_POR_CICLO) {
            if (!SEGUIMIENTO_hayConexionDisponible()) {
                resumen.OMITIDO = true;
                resumen.MOTIVO = "SIN_CONEXION";
                break;
            }

            var seguimiento = colaSeguimientos.shift();
            var idUnicoSeguimiento = seguimiento.ID_UNICO_SEGUIMIENTO;
            var posiciones = await listarPosicionesSeguimientoPendientes(
                idUnicoSeguimiento,
                SEGUIMIENTO_TAMANO_LOTE
            );
            if (!Array.isArray(posiciones) || posiciones.length === 0) {
                continue;
            }

            resumen.LOTES_ENVIADOS++;
            var resultadoLote = await SEGUIMIENTO_procesarLote(
                idUnicoSeguimiento,
                posiciones,
                uuidDispositivo,
                versionApp,
                resumen,
                typeof seguimiento.CANTIDAD_PENDIENTE === "number"
                    ? seguimiento.CANTIDAD_PENDIENTE
                    : null
            );
            if (!resultadoLote.EXITO) {
                break;
            }

            if (typeof seguimiento.CANTIDAD_PENDIENTE === "number") {
                seguimiento.CANTIDAD_PENDIENTE = Math.max(
                    0,
                    seguimiento.CANTIDAD_PENDIENTE - resultadoLote.CONFIRMADAS
                );
            }

            var siguiente = await listarPosicionesSeguimientoPendientes(idUnicoSeguimiento, 1);
            if (Array.isArray(siguiente) && siguiente.length > 0) {
                colaSeguimientos.push(seguimiento);
            }
        }

        var pendientesFinales = await SEGUIMIENTO_resumenPendientes();
        resumen.SEGUIMIENTOS_PENDIENTES = Array.isArray(pendientesFinales) ? pendientesFinales.length : 0;
        resumen.POSICIONES_PENDIENTES = Array.isArray(pendientesFinales)
            ? pendientesFinales.reduce(function (total, seguimientoPendiente) {
                return total + (Number(seguimientoPendiente.CANTIDAD_PENDIENTE) || 0);
            }, 0)
            : resumen.POSICIONES_PENDIENTES;
        resumen.REQUIERE_CONTINUACION = resumen.SEGUIMIENTOS_PENDIENTES > 0;
    } catch (error) {
        console.error("Error controlado en el emisor de seguimiento GPS.");
        resumen.ERRORES++;
    } finally {
        SEGUIMIENTO_envioEnCurso = false;
    }

    return resumen;
}

// ================== PROGRAMADOR DE ENVÍO DE BAJA LATENCIA ==================

var SEGUIMIENTO_programadorActivo = false;
var SEGUIMIENTO_cicloProgramadorEnCurso = false;
var SEGUIMIENTO_reenvioSolicitado = false;
var SEGUIMIENTO_timeoutDebounce = null;
var SEGUIMIENTO_timeoutRespaldo = null;
var SEGUIMIENTO_timeoutReintento = null;
var SEGUIMIENTO_motivoPendiente = null;
var SEGUIMIENTO_prioridadMotivoPendiente = 0;
var SEGUIMIENTO_fechaSolicitudPendienteMs = null;
var SEGUIMIENTO_fechaSolicitudCicloMs = null;
var SEGUIMIENTO_motivoCicloActual = null;
var SEGUIMIENTO_backoffActualMs = SEGUIMIENTO_BACKOFF_INICIAL_MS;
var SEGUIMIENTO_tipoReintento = null;
var SEGUIMIENTO_listenerOnlineRegistrado = false;
var SEGUIMIENTO_diagnosticoEnvio = [];

function SEGUIMIENTO_prioridadMotivo(motivo) {
    var prioridades = {
        conexion_recuperada: 60,
        inicio_o_resume: 50,
        e2e_latencia: 50,
        nueva_captura: 40,
        continuacion_drenaje: 30,
        respaldo: 20,
        legacy: 10
    };
    return prioridades[motivo] || 1;
}

function SEGUIMIENTO_definirMotivoPendiente(motivo) {
    var motivoNormalizado = SEGUIMIENTO_textoDisponible(motivo) || "sin_especificar";
    var prioridad = SEGUIMIENTO_prioridadMotivo(motivoNormalizado);
    if (!SEGUIMIENTO_motivoPendiente || prioridad > SEGUIMIENTO_prioridadMotivoPendiente) {
        SEGUIMIENTO_motivoPendiente = motivoNormalizado;
        SEGUIMIENTO_prioridadMotivoPendiente = prioridad;
    }
    if (SEGUIMIENTO_fechaSolicitudPendienteMs === null) {
        SEGUIMIENTO_fechaSolicitudPendienteMs = Date.now();
    }
}

function SEGUIMIENTO_limpiarTimeout(nombre) {
    if (nombre === "debounce" && SEGUIMIENTO_timeoutDebounce !== null) {
        clearTimeout(SEGUIMIENTO_timeoutDebounce);
        SEGUIMIENTO_timeoutDebounce = null;
    }
    if (nombre === "respaldo" && SEGUIMIENTO_timeoutRespaldo !== null) {
        clearTimeout(SEGUIMIENTO_timeoutRespaldo);
        SEGUIMIENTO_timeoutRespaldo = null;
    }
    if (nombre === "reintento" && SEGUIMIENTO_timeoutReintento !== null) {
        clearTimeout(SEGUIMIENTO_timeoutReintento);
        SEGUIMIENTO_timeoutReintento = null;
        SEGUIMIENTO_tipoReintento = null;
    }
}

function SEGUIMIENTO_registrarDiagnostico(evento) {
    if (typeof HABILITAR_DIAGNOSTICO_ENVIO_SEGUIMIENTO !== "undefined" &&
        !HABILITAR_DIAGNOSTICO_ENVIO_SEGUIMIENTO) {
        return;
    }
    SEGUIMIENTO_diagnosticoEnvio.push(evento);
    if (SEGUIMIENTO_diagnosticoEnvio.length > 50) {
        SEGUIMIENTO_diagnosticoEnvio.splice(0, SEGUIMIENTO_diagnosticoEnvio.length - 50);
    }
}

function SEGUIMIENTO_registrarDiagnosticoLote(datos) {
    SEGUIMIENTO_registrarDiagnostico({
        TIPO: "LOTE",
        MOTIVO: SEGUIMIENTO_motivoCicloActual || "ciclo",
        CANTIDAD_ENVIADA: Number(datos.CANTIDAD_ENVIADA) || 0,
        INSERTADAS: Number(datos.INSERTADAS) || 0,
        YA_EXISTIAN: Number(datos.YA_EXISTIAN) || 0,
        OMITIDAS: Number(datos.OMITIDAS) || 0,
        DEMORA_HASTA_POST_MS: datos.DEMORA_HASTA_POST_MS,
        DURACION_HTTP_MS: datos.DURACION_HTTP_MS === null ? null : (Number(datos.DURACION_HTTP_MS) || 0),
        EDAD_POSICION_MAS_ANTIGUA_MS: datos.EDAD_POSICION_MAS_ANTIGUA_MS,
        DEMORA_DESDE_CREACION_HASTA_POST_MS: datos.DEMORA_DESDE_CREACION_HASTA_POST_MS,
        CANTIDAD_RESTANTE: datos.CANTIDAD_RESTANTE,
        RESULTADO: datos.RESULTADO
    });
}

function obtenerDiagnosticoEnvioSeguimiento() {
    return {
        PROGRAMADOR_ACTIVO: SEGUIMIENTO_programadorActivo,
        CICLO_EN_CURSO: SEGUIMIENTO_cicloProgramadorEnCurso,
        DEBOUNCE_PROGRAMADO: SEGUIMIENTO_timeoutDebounce !== null,
        RESPALDO_PROGRAMADO: SEGUIMIENTO_timeoutRespaldo !== null,
        REINTENTO_PROGRAMADO: SEGUIMIENTO_timeoutReintento !== null,
        TIPO_REINTENTO: SEGUIMIENTO_tipoReintento,
        BACKOFF_ACTUAL_MS: SEGUIMIENTO_backoffActualMs,
        EVENTOS: SEGUIMIENTO_diagnosticoEnvio.slice(0)
    };
}

function SEGUIMIENTO_sesionDisponible() {
    try {
        return !!SEGUIMIENTO_textoDisponible(Obtener_dato_local("user_activo"));
    } catch (error) {
        return false;
    }
}

async function SEGUIMIENTO_contarPendientes() {
    var resumen = await SEGUIMIENTO_resumenPendientes();
    var seguimientos = Array.isArray(resumen) ? resumen.length : 0;
    var posiciones = Array.isArray(resumen)
        ? resumen.reduce(function (total, item) {
            return total + (Number(item.CANTIDAD_PENDIENTE) || 0);
        }, 0)
        : 0;
    return { SEGUIMIENTOS: seguimientos, POSICIONES: posiciones };
}

function SEGUIMIENTO_programarRespaldo() {
    if (!SEGUIMIENTO_programadorActivo) {
        return;
    }
    SEGUIMIENTO_limpiarTimeout("respaldo");
    SEGUIMIENTO_timeoutRespaldo = setTimeout(function () {
        SEGUIMIENTO_timeoutRespaldo = null;
        solicitarEnvioSeguimiento("respaldo", true);
        SEGUIMIENTO_programarRespaldo();
    }, SEGUIMIENTO_INTERVALO_RESPALDO_MS);
}

function SEGUIMIENTO_programarReintento(motivo, demoraMs, tipo) {
    if (!SEGUIMIENTO_programadorActivo) {
        return;
    }
    SEGUIMIENTO_limpiarTimeout("reintento");
    SEGUIMIENTO_tipoReintento = tipo;
    SEGUIMIENTO_timeoutReintento = setTimeout(function () {
        SEGUIMIENTO_timeoutReintento = null;
        SEGUIMIENTO_tipoReintento = null;
        solicitarEnvioSeguimiento(motivo, true);
    }, demoraMs);
}

function SEGUIMIENTO_programarBackoff(motivo) {
    var demora = SEGUIMIENTO_backoffActualMs;
    SEGUIMIENTO_programarReintento(motivo, demora, "BACKOFF");
    SEGUIMIENTO_backoffActualMs = Math.min(
        SEGUIMIENTO_backoffActualMs * 2,
        SEGUIMIENTO_BACKOFF_MAXIMO_MS
    );
}

function SEGUIMIENTO_resultadoTexto(resumen) {
    if (resumen && resumen.OMITIDO && resumen.MOTIVO === "SIN_CONEXION") {
        return "OFFLINE";
    }
    if (!resumen || resumen.ERRORES > 0) {
        return resumen && resumen.HUBO_PROGRESO ? "PARCIAL" : "ERROR";
    }
    return "EXITO";
}

async function SEGUIMIENTO_ejecutarCicloProgramado() {
    SEGUIMIENTO_timeoutDebounce = null;
    if (!SEGUIMIENTO_programadorActivo || SEGUIMIENTO_cicloProgramadorEnCurso) {
        if (SEGUIMIENTO_cicloProgramadorEnCurso) {
            SEGUIMIENTO_reenvioSolicitado = true;
        }
        return;
    }

    if (!SEGUIMIENTO_sesionDisponible()) {
        SEGUIMIENTO_motivoPendiente = null;
        SEGUIMIENTO_prioridadMotivoPendiente = 0;
        SEGUIMIENTO_fechaSolicitudPendienteMs = null;
        return;
    }

    SEGUIMIENTO_cicloProgramadorEnCurso = true;
    var motivo = SEGUIMIENTO_motivoPendiente || "sin_especificar";
    var fechaSolicitudMs = SEGUIMIENTO_fechaSolicitudPendienteMs === null
        ? Date.now()
        : SEGUIMIENTO_fechaSolicitudPendienteMs;
    SEGUIMIENTO_fechaSolicitudCicloMs = fechaSolicitudMs;
    SEGUIMIENTO_motivoCicloActual = motivo;
    SEGUIMIENTO_motivoPendiente = null;
    SEGUIMIENTO_prioridadMotivoPendiente = 0;
    SEGUIMIENTO_fechaSolicitudPendienteMs = null;
    var inicioMs = Date.now();
    var conexionInicial = SEGUIMIENTO_hayConexionDisponible();
    var antes = { SEGUIMIENTOS: 0, POSICIONES: 0 };
    var despues = { SEGUIMIENTOS: 0, POSICIONES: 0 };
    var resumen = null;

    try {
        antes = await SEGUIMIENTO_contarPendientes();
        resumen = await enviarPosicionesSeguimientoPendientes();
        despues = await SEGUIMIENTO_contarPendientes();
    } catch (error) {
        console.warn("Error controlado en el programador de seguimiento GPS.");
        resumen = SEGUIMIENTO_resultadoCiclo();
        resumen.ERRORES = 1;
        try {
            despues = await SEGUIMIENTO_contarPendientes();
        } catch (errorConteo) {
            despues = antes;
        }
    } finally {
        var resultadoTexto = SEGUIMIENTO_resultadoTexto(resumen);
        SEGUIMIENTO_registrarDiagnostico({
            TIPO: "CICLO",
            MOTIVO: motivo,
            HORA_SOLICITUD_UTC: new Date(fechaSolicitudMs).toISOString(),
            DEMORA_DESDE_SOLICITUD_MS: Math.max(0, inicioMs - fechaSolicitudMs),
            TIEMPO_ESPERADO_DEBOUNCE_MS: Math.max(0, inicioMs - fechaSolicitudMs),
            INICIO_UTC: new Date(inicioMs).toISOString(),
            FIN_UTC: new Date().toISOString(),
            DURACION_MS: Date.now() - inicioMs,
            CONEXION_INICIAL: conexionInicial,
            PENDIENTES_ANTES: antes.POSICIONES,
            PENDIENTES_DESPUES: despues.POSICIONES,
            SEGUIMIENTOS_ANTES: antes.SEGUIMIENTOS,
            SEGUIMIENTOS_DESPUES: despues.SEGUIMIENTOS,
            LOTES_ENVIADOS: resumen ? resumen.LOTES_ENVIADOS : 0,
            POSICIONES_CONFIRMADAS: resumen ? resumen.POSICIONES_CONFIRMADAS : 0,
            POSICIONES_RESTANTES: despues.POSICIONES,
            RESULTADO: resultadoTexto
        });

        SEGUIMIENTO_cicloProgramadorEnCurso = false;
        SEGUIMIENTO_fechaSolicitudCicloMs = null;
        SEGUIMIENTO_motivoCicloActual = null;

        if (!SEGUIMIENTO_programadorActivo) {
            return;
        }

        var requiereBackoff = resultadoTexto === "OFFLINE" || resultadoTexto === "ERROR" ||
            (resultadoTexto === "PARCIAL" && !(resumen && resumen.HUBO_PROGRESO));
        if (requiereBackoff) {
            SEGUIMIENTO_definirMotivoPendiente(motivo);
            SEGUIMIENTO_registrarDiagnostico({
                TIPO: "BACKOFF",
                MOTIVO: motivo,
                DEMORA_MS: SEGUIMIENTO_backoffActualMs,
                RESULTADO: "BACKOFF"
            });
            SEGUIMIENTO_programarBackoff(motivo);
        } else {
            SEGUIMIENTO_backoffActualMs = SEGUIMIENTO_BACKOFF_INICIAL_MS;
            SEGUIMIENTO_limpiarTimeout("reintento");
            if (SEGUIMIENTO_reenvioSolicitado) {
                SEGUIMIENTO_reenvioSolicitado = false;
                solicitarEnvioSeguimiento("nueva_captura", true);
            } else if (resumen && resumen.REQUIERE_CONTINUACION) {
                SEGUIMIENTO_definirMotivoPendiente("continuacion_drenaje");
                SEGUIMIENTO_programarReintento(
                    "continuacion_drenaje",
                    SEGUIMIENTO_PAUSA_ENTRE_CICLOS_MS,
                    "CONTINUACION"
                );
            }
        }
    }
}

function solicitarEnvioSeguimiento(motivo, inmediato) {
    if (!SEGUIMIENTO_programadorActivo) {
        return false;
    }

    SEGUIMIENTO_definirMotivoPendiente(motivo);
    if (SEGUIMIENTO_cicloProgramadorEnCurso || SEGUIMIENTO_envioEnCurso) {
        SEGUIMIENTO_reenvioSolicitado = true;
        return true;
    }

    if (inmediato) {
        SEGUIMIENTO_limpiarTimeout("debounce");
        if (motivo === "conexion_recuperada" || motivo === "inicio_o_resume") {
            SEGUIMIENTO_limpiarTimeout("reintento");
        } else if (SEGUIMIENTO_timeoutReintento !== null && SEGUIMIENTO_tipoReintento === "BACKOFF") {
            return true;
        }
        SEGUIMIENTO_timeoutDebounce = setTimeout(SEGUIMIENTO_ejecutarCicloProgramado, 0);
        return true;
    }

    if (SEGUIMIENTO_timeoutReintento !== null && SEGUIMIENTO_tipoReintento === "BACKOFF") {
        return true;
    }
    SEGUIMIENTO_limpiarTimeout("debounce");
    SEGUIMIENTO_timeoutDebounce = setTimeout(
        SEGUIMIENTO_ejecutarCicloProgramado,
        SEGUIMIENTO_DEBOUNCE_ENVIO_MS
    );
    return true;
}

function SEGUIMIENTO_alRecuperarConexion() {
    if (!SEGUIMIENTO_programadorActivo) {
        return;
    }
    SEGUIMIENTO_limpiarTimeout("reintento");
    solicitarEnvioSeguimiento("conexion_recuperada", true);
}

function inicializarProgramadorEnvioSeguimiento() {
    if (SEGUIMIENTO_programadorActivo) {
        return false;
    }
    SEGUIMIENTO_programadorActivo = true;
    SEGUIMIENTO_backoffActualMs = SEGUIMIENTO_BACKOFF_INICIAL_MS;
    if (!SEGUIMIENTO_listenerOnlineRegistrado && typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("online", SEGUIMIENTO_alRecuperarConexion, false);
        SEGUIMIENTO_listenerOnlineRegistrado = true;
    }
    SEGUIMIENTO_programarRespaldo();
    return true;
}

function detenerProgramadorEnvioSeguimiento() {
    SEGUIMIENTO_programadorActivo = false;
    SEGUIMIENTO_reenvioSolicitado = false;
    SEGUIMIENTO_motivoPendiente = null;
    SEGUIMIENTO_prioridadMotivoPendiente = 0;
    SEGUIMIENTO_fechaSolicitudPendienteMs = null;
    SEGUIMIENTO_limpiarTimeout("debounce");
    SEGUIMIENTO_limpiarTimeout("respaldo");
    SEGUIMIENTO_limpiarTimeout("reintento");
    if (SEGUIMIENTO_listenerOnlineRegistrado && typeof document !== "undefined" && document.removeEventListener) {
        document.removeEventListener("online", SEGUIMIENTO_alRecuperarConexion, false);
        SEGUIMIENTO_listenerOnlineRegistrado = false;
    }
}
