// Bootstrap técnico independiente de la sesión interactiva.
var SEGUIMIENTO_bootstrapPromesa = null;
var SEGUIMIENTO_bootstrapResumeRegistrado = false;

async function SEGUIMIENTO_reconciliarGpsTecnico() {
    if (typeof reevaluarTrackingAhora === "function") {
        return await reevaluarTrackingAhora();
    }
    return false;
}

function inicializarSeguimientoBootstrap() {
    if (SEGUIMIENTO_bootstrapPromesa) {
        return SEGUIMIENTO_bootstrapPromesa;
    }

    SEGUIMIENTO_bootstrapPromesa = (async function () {
        if (typeof configureBackgroundGeolocation === "function") {
            await configureBackgroundGeolocation();
        }

        await Tablas_crear_tablas();
        if (typeof comprobarActualizarEsquema === "function") {
            await comprobarActualizarEsquema();
        }

        var credencialesActivas = [];
        if (typeof listarCredencialesSeguimientoActivas === "function") {
            credencialesActivas = await listarCredencialesSeguimientoActivas();
        }

        inicializarProgramadorEnvioSeguimiento();

        var guiasTecnicas = [];
        if (typeof DATOS_seleccionarGuiasSeguimientoTecnicoActivas === "function") {
            guiasTecnicas = await DATOS_seleccionarGuiasSeguimientoTecnicoActivas();
        }

        var gpsIniciado = await SEGUIMIENTO_reconciliarGpsTecnico();
        solicitarEnvioSeguimiento("inicio_o_resume", true);

        console.log(
            "[TRACKING][COLD_START]" +
            " guiasTecnicas=" + (Array.isArray(guiasTecnicas) ? guiasTecnicas.length : 0) +
            " credencialesActivas=" + (Array.isArray(credencialesActivas) ? credencialesActivas.length : 0) +
            " gpsIniciado=" + (gpsIniciado === true)
        );

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
