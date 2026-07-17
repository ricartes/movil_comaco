// Bootstrap técnico independiente de la sesión interactiva.
var SEGUIMIENTO_bootstrapPromesa = null;
var SEGUIMIENTO_bootstrapResumeRegistrado = false;

async function SEGUIMIENTO_reconciliarGpsTecnico() {
    if (typeof reevaluarTrackingAhora === "function") {
        await reevaluarTrackingAhora();
    }
}

function inicializarSeguimientoBootstrap() {
    if (SEGUIMIENTO_bootstrapPromesa) {
        return SEGUIMIENTO_bootstrapPromesa;
    }

    SEGUIMIENTO_bootstrapPromesa = (async function () {
        await Tablas_crear_tablas();
        if (typeof listarCredencialesSeguimientoActivas === "function") {
            await listarCredencialesSeguimientoActivas();
        }
        inicializarProgramadorEnvioSeguimiento();
        await SEGUIMIENTO_reconciliarGpsTecnico();
        solicitarEnvioSeguimiento("inicio_o_resume", true);
        return true;
    })().catch(function (error) {
        SEGUIMIENTO_bootstrapPromesa = null;
        console.error("No fue posible inicializar el seguimiento técnico.");
        throw error;
    });

    return SEGUIMIENTO_bootstrapPromesa;
}

async function SEGUIMIENTO_alResumeTecnico() {
    try {
        await inicializarSeguimientoBootstrap();
        await SEGUIMIENTO_reconciliarGpsTecnico();
        solicitarEnvioSeguimiento("inicio_o_resume", true);
    } catch (error) {
        console.error("No fue posible reanudar el seguimiento técnico.");
    }

    if (typeof manejarResumeInteractivo === "function") {
        await manejarResumeInteractivo();
    }
}

function SEGUIMIENTO_registrarEntradasTecnicas() {
    if (!SEGUIMIENTO_bootstrapResumeRegistrado &&
        typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("resume", SEGUIMIENTO_alResumeTecnico, false);
        SEGUIMIENTO_bootstrapResumeRegistrado = true;
    }
}

SEGUIMIENTO_registrarEntradasTecnicas();
document.addEventListener("deviceready", function () {
    inicializarSeguimientoBootstrap().catch(function () {
        // El bootstrap ya emitió un mensaje sanitizado.
    });
}, false);
