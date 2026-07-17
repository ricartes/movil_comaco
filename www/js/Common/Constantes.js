const constantes = {
    empresaPredeterminada: 1,
    validaRangoHoraCamionCargado: false, //TODO: PASARLO A TRUE
    parametroTiempoMinimoCarguio: 12,
    parametroTiempoMaximoCarguio: 13,
    parametroDetieneProcesoCambioHora: 14,
    parametroDetieneProcesoApagaGPS: 15,
    parametroIntentosMaximoCamionPadron: 16,
    cantidadMaximaIntentosCaptura: 2,
    mensajeGeocercaNoValida: "GEOCERCA NO VÁLIDA O NO ENCONTRADA",
    mensajeHoraCamionCargadoNoValida: "FECHA HORA CAMIÓN CARGADO FUERA DE LOS RANGOS ESTABLECIDOS",
    tipoPunto: {
        inicial: 1,
        final: 2
    },
    tipoEvidencia: {
        camionVacio1: 1,
        camionVacio2: 3,
        camionCargado1: 2,
        camionCargado2: 4,
        padronVehiculo: 5,
        otra: 6,
        ingresoPlanta: 7
    }



}

const HABILITAR_ENVIO_SEGUIMIENTO_NUEVO = true;
const HABILITAR_CAPTURA_SEGUIMIENTO_NUEVO = true;
const SEGUIMIENTO_TAMANO_LOTE = 100;
const SEGUIMIENTO_MAX_LOTES_POR_CICLO = 5;
const SEGUIMIENTO_DEBOUNCE_ENVIO_MS = 3000;
const SEGUIMIENTO_INTERVALO_RESPALDO_MS = 15000;
const SEGUIMIENTO_PAUSA_ENTRE_CICLOS_MS = 1500;
const SEGUIMIENTO_BACKOFF_INICIAL_MS = 5000;
const SEGUIMIENTO_BACKOFF_MAXIMO_MS = 60000;
const HABILITAR_DIAGNOSTICO_ENVIO_SEGUIMIENTO = true;
const SEGUIMIENTO_TIMEOUT_HTTP_MS = 15000;
