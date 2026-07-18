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

function inicializarSeguimientoBootstrap() {
    if (SEGUIMIENTO_bootstrapPromesa) return SEGUIMIENTO_bootstrapPromesa;
    SEGUIMIENTO_bootstrapPromesa = (async function () {
        await Tablas_crear_tablas();
        if (typeof comprobarActualizarEsquema === "function") await comprobarActualizarEsquema();
        await configurarSeguimientoNativo();
        var migracion = await SEGUIMIENTO_migrarLegacyANativo();
        var inicio = await ComacoTracking.solicitarDrenaje("inicio_o_resume");
        await TRACKING_POLICY_procesarResultado(inicio, "inicio_o_resume");
        var estado = await ComacoTracking.obtenerEstado();
        console.log("[TRACKING][NATIVE_READY] activos=" + estado.seguimientosActivos + " pendientes=" + estado.pendientes + " legacy=" + migracion.posiciones);
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
