// Contexto local para el flujo de evidencia de ingreso planta
var evidenciaIngresoContext = {
    fotoUrl: null,
    guias: []
};

var capturandoIngresoPlanta = false;


$$(document).on('page:init', '.page[data-name="ingreso-planta"]', function (e, page) {
    // Delegación de evento para la imagen de captura
    $$('.page[data-name="ingreso-planta"]').on('click', '#imagen_padron', function () {
        capturarEvidenciaIngresoPlanta();
    });
})


async function capturarEvidenciaIngresoPlanta() {
    if (capturandoIngresoPlanta) return; // evita doble ejecución
    capturandoIngresoPlanta = true;

    try {
        const estadoGPS = await verificarEstadoGPS();
        if (!estadoGPS) {
            app.dialog.alert(
                "Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.",
                "GFE"
            );
            capturandoIngresoPlanta = false;
            return;
        }

        // Evidencia 7 = CONFIRMA INGRESO PLANTA
        tipoevidencia = 7;

        navigator.camera.getPicture(
            onPhotoFileSuccessIngresoPlanta,
            function (err) {
                onFail(err);              // tu handler genérico
                capturandoIngresoPlanta = false;
            },
            {
                quality: 90,
                destinationType: Camera.DestinationType.FILE_URI,
                targetWidth: 1920,
                targetHeight: 1080
            }
        );
    } catch (e) {
        console.error(e);
        capturandoIngresoPlanta = false;
        app.dialog.alert(
            "Ocurrió un error al intentar capturar la evidencia.",
            "GFE"
        );
    }
}


function onPhotoFileSuccessIngresoPlanta(imageData) {
    window.resolveLocalFileSystemURL(imageData, resolveOnSuccessIngresoPlanta, resOnError);
}

function resolveOnSuccessIngresoPlanta(entry) {
    var d = new Date();
    var n = d.getTime();
    var newFileName = Obtener_dato_local("rut_activo") + "_" + n + ".jpg";
    var myFolderApp = "fotos";

    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSys) {
        fileSys.root.getDirectory(
            myFolderApp,
            { create: true, exclusive: false },
            function (directory) {
                entry.moveTo(directory, newFileName, successMoveIngresoPlanta, resOnError);
            },
            resOnError
        );
    }, resOnError);
}


// 3) Una vez movida la foto, procesamos todas las GDE no confirmadas
function successMoveIngresoPlanta(entry) {
    var fotoUrl = entry.toURL(); // misma URL para todas las guías

    procesarEvidenciasIngresoPlanta(fotoUrl);
}

async function procesarEvidenciasIngresoPlanta(fotoUrl) {
    try {
        const gdeNoConfirmadas = await DATOS_seleccionarGdeProveedorEnviadasNoConfirmadas();

        if (gdeNoConfirmadas === "-1" || !Array.isArray(gdeNoConfirmadas) || gdeNoConfirmadas.length === 0) {
            app.dialog.alert(
                "No se encontraron guías pendientes de confirmar ingreso planta.",
                "GFE"
            );
            capturandoIngresoPlanta = false;
            return;
        }

        // Guardamos contexto para este flujo
        evidenciaIngresoContext = {
            fotoUrl: fotoUrl,
            guias: gdeNoConfirmadas
        };

        // Obtenemos ubicación solo una vez para todas
        getLocationIngresoPlanta();

    } catch (err) {
        console.error(err);
        capturandoIngresoPlanta = false;
        app.dialog.alert(
            "Ocurrió un error al preparar las evidencias de ingreso a planta.",
            "GFE"
        );
    }
}


// 4) Ubicación para todas las evidencias
function getLocationIngresoPlanta() {
    app.dialog.preloader("Obteniendo ubicación");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            showPositionIngresoPlanta,
            errorGpsIngresoPlanta,
            options_gps
        );
    } else {
        app.dialog.close();
        app.dialog.alert(
            "Coordenadas no obtenidas. Favor revisar la configuración de GPS",
            "GFE"
        );
        guardarEvidenciasIngresoPlanta(0, 0);
    }
}

function showPositionIngresoPlanta(position) {
    app.dialog.close();
    guardarEvidenciasIngresoPlanta(
        position.coords.latitude,
        position.coords.longitude
    );
}

function errorGpsIngresoPlanta(err) {
    console.warn(err);
    app.dialog.close();
    app.dialog.alert(
        "Coordenadas no obtenidas. Favor revisar la configuración de GPS",
        "GFE"
    );
    guardarEvidenciasIngresoPlanta(0, 0);
}


// 5) Crear una evidencia por cada GDE y reutilizar fotos.js
function guardarEvidenciasIngresoPlanta(latitud, longitud) {
    const guias = evidenciaIngresoContext.guias || [];
    const fotoUrl = evidenciaIngresoContext.fotoUrl;

    if (!guias.length) {
        capturandoIngresoPlanta = false;
        return;
    }

    let pendientes = guias.length;

    guias.forEach(function (gde) {
        // Ajusta estos campos según cómo venga tu SELECT de GDE
        const evidencia = new CL_GDE_Evidencia();
        evidencia.ID_UNICO_MOVIL = "evid_gde" + obtener_IDUNICO();

        // Si tu identificador real es ROWID, cambia esta línea:
        evidencia.ID_GDE = gde.ID_GDE;           // o gde.ROWID

        evidencia.ID_UNICO_MOVIL_GDE = gde.ID_UNICO_MOVIL;
        evidencia.GDE_ESTADO_MOVIL = "B";        // borrador local
        evidencia.OBSERVACION = "EVIDENCIA CONFIRMA INGRESO PLANTA";              // se setea en guarda_evidencia_foto según TIPO_EVIDENCIA
        evidencia.ARCHIVO = fotoUrl;
        evidencia.ENVIADO = 0;                   // pendiente de envío
        evidencia.TIPO_EVIDENCIA = constantes.tipoEvidencia.ingresoPlanta;            // CONFIRMA INGRESO PLANTA
        evidencia.EVIDENCIA_COORDENADA_X = latitud;
        evidencia.EVIDENCIA_COORDENADA_Y = longitud;

        // Asignamos al global para que fotos.js lo use
        evidencia_actual = evidencia;

        // Reutiliza tu helper genérico; ya maneja TIPO_EVIDENCIA == 7
        guarda_evidencia_foto(latitud, longitud);

        pendientes--;
        if (pendientes === 0) {
            // Cambiamos la imagen en pantalla por la foto capturada
            $$("#imagen_confirma_planta").attr("src", fotoUrl);

            // Trazabilidad simple: CAPTURA_EVIDENCIA_INGRESO_PLANTA
            (async () => {
                try {
                    app.dialog.progress("Cargando...");
                    let datos = await generarDataTrazabilidad(
                        TipoAccionTypes.CAPTURA_EVIDENCIA_INGRESO_PLANTA,
                        Obtener_dato_local('user_activo'),
                        {
                            cantidadGuias: guias.length,
                            foto: fotoUrl
                        }
                    );

                    await obtenerUbicacionEInsertarLog(
                        Obtener_dato_local('user_activo'),
                        datos
                    );
                } catch (e) {
                    console.error(e);
                } finally {
                    app.dialog.close();
                    capturandoIngresoPlanta = false;
                    app.dialog.alert(
                        "Evidencia de ingreso a planta registrada para todas las guías pendientes.",
                        "GFE"
                    );
                }
            })();
        }
    });
}