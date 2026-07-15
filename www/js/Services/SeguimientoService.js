// ================== ENVÍO SEGUIMIENTO GPS ==================

var SEGUIMIENTO_envioEnCurso = false;

function SEGUIMIENTO_resultadoCiclo() {
    return {
        LOTES_ENVIADOS: 0,
        POSICIONES_CONFIRMADAS: 0,
        POSICIONES_PENDIENTES: 0,
        ERRORES: 0,
        OMITIDO: false,
        MOTIVO: null
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
        OMITIDOS: omitidos
    };
}

async function SEGUIMIENTO_registrarIntentoSeguro(listaUuid) {
    if (listaUuid.length === 0) {
        return;
    }

    try {
        await registrarIntentoEnvioPosiciones(listaUuid, new Date().toISOString());
    } catch (error) {
        console.error("No fue posible registrar el intento de envío GPS:", error);
    }
}

async function SEGUIMIENTO_procesarLote(idUnicoSeguimiento, posiciones, uuidDispositivo, versionApp, resumen) {
    var uuidLote = posiciones.map(function (posicion) {
        return posicion.UUID_POSICION;
    });

    try {
        var posicionesEntrada = posiciones.map(SEGUIMIENTO_posicionParaEnviar);
        var respuesta = await enviarPosicionesSeguimientoWebService({
            ID_UNICO_SEGUIMIENTO: idUnicoSeguimiento,
            UUID_DISPOSITIVO: uuidDispositivo,
            VERSION_APP: versionApp || "",
            POSICIONES: posicionesEntrada
        });
        var confirmaciones = SEGUIMIENTO_analizarConfirmaciones(respuesta, posicionesEntrada);

        if (confirmaciones.CONFIRMADOS.length > 0) {
            await eliminarPosicionesSeguimientoPorUuid(confirmaciones.CONFIRMADOS);
            resumen.POSICIONES_CONFIRMADAS += confirmaciones.CONFIRMADOS.length;
        }

        if (confirmaciones.OMITIDOS.length > 0) {
            console.warn("El servidor omitió posiciones del lote GPS:", confirmaciones.OMITIDOS);
            await SEGUIMIENTO_registrarIntentoSeguro(confirmaciones.OMITIDOS);
            resumen.POSICIONES_PENDIENTES += confirmaciones.OMITIDOS.length;
            resumen.ERRORES++;
        }

        return confirmaciones.OMITIDOS.length === 0;
    } catch (error) {
        console.warn("No fue posible enviar el lote de seguimiento GPS:", error);
        await SEGUIMIENTO_registrarIntentoSeguro(uuidLote);
        resumen.POSICIONES_PENDIENTES += uuidLote.length;
        resumen.ERRORES++;
        return false;
    }
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
        var seguimientos = await listarSeguimientosConPosicionesPendientes();
        if (!Array.isArray(seguimientos) || seguimientos.length === 0) {
            resumen.OMITIDO = true;
            resumen.MOTIVO = "COLA_VACIA";
            return resumen;
        }

        var versionApp = SEGUIMIENTO_textoDisponible(Obtener_dato_local("version_app")) || "";

        for (var indiceSeguimiento = 0;
            indiceSeguimiento < seguimientos.length && resumen.LOTES_ENVIADOS < SEGUIMIENTO_MAX_LOTES_POR_CICLO;
            indiceSeguimiento++) {
            var idUnicoSeguimiento = seguimientos[indiceSeguimiento];
            var loteCompleto = true;

            do {
                var posiciones = await listarPosicionesSeguimientoPendientes(
                    idUnicoSeguimiento,
                    SEGUIMIENTO_POSICIONES_POR_LOTE
                );
                if (!Array.isArray(posiciones) || posiciones.length === 0) {
                    break;
                }

                resumen.LOTES_ENVIADOS++;
                loteCompleto = await SEGUIMIENTO_procesarLote(
                    idUnicoSeguimiento,
                    posiciones,
                    uuidDispositivo,
                    versionApp,
                    resumen
                );
            } while (loteCompleto && resumen.LOTES_ENVIADOS < SEGUIMIENTO_MAX_LOTES_POR_CICLO);
        }
    } catch (error) {
        console.error("Error controlado en el emisor de seguimiento GPS:", error);
        resumen.ERRORES++;
    } finally {
        SEGUIMIENTO_envioEnCurso = false;
    }

    return resumen;
}
