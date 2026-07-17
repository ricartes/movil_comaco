// Compatibilidad de llamadas históricas. No hay temporizadores, captura ni HTTP en JavaScript.
function solicitarEnvioSeguimiento(motivo) {
    if (typeof solicitarDrenajeSeguimientoNativo !== "function") return Promise.resolve(false);
    return solicitarDrenajeSeguimientoNativo(motivo || "compatibilidad").catch(function () { return false; });
}

function inicializarProgramadorEnvioSeguimiento() {
    return solicitarEnvioSeguimiento("inicializacion_nativa");
}

function detenerProgramadorEnvioSeguimiento() {
    if (typeof ComacoTracking === "undefined") return Promise.resolve(false);
    return ComacoTracking.detenerSiCorresponde().catch(function () { return false; });
}

function enviarPosicionesSeguimientoPendientes(motivo) {
    return solicitarEnvioSeguimiento(motivo || "compatibilidad_envio");
}

// Mapeador puro que documenta el contrato congelado; el emisor efectivo está en Android.
function SEGUIMIENTO_posicionParaEnviar(posicion) {
    return {
        UUID_POSICION: posicion.UUID_POSICION,
        SECUENCIA_LOCAL: posicion.SECUENCIA_LOCAL === undefined ? null : posicion.SECUENCIA_LOCAL,
        FECHA_DISPOSITIVO_UTC: posicion.FECHA_DISPOSITIVO_UTC,
        LATITUD: posicion.LATITUD,
        LONGITUD: posicion.LONGITUD,
        PRECISION_METROS: posicion.PRECISION_METROS == null ? null : posicion.PRECISION_METROS,
        VELOCIDAD_MPS: posicion.VELOCIDAD_MPS == null ? null : posicion.VELOCIDAD_MPS,
        RUMBO_GRADOS: posicion.RUMBO_GRADOS == null ? null : posicion.RUMBO_GRADOS,
        ALTITUD_METROS: posicion.ALTITUD_METROS == null ? null : posicion.ALTITUD_METROS,
        ES_UBICACION_SIMULADA: posicion.ES_UBICACION_SIMULADA === true || posicion.ES_UBICACION_SIMULADA === 1,
        ORIGEN_CAPTURA: posicion.ORIGEN_CAPTURA
    };
}
