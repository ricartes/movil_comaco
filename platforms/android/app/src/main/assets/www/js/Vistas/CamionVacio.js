var id_gde_actual;
var tipo_evidencia_camion_vacio = 1;
var tipo_evidencia_camion_vacio_2 = 3;
var gde_actual = null;

$$(document).on('page:init', '.page[data-name="camion-vacio"]', async function (e, page) {

    id_gde_actual = mainView.router.currentRoute.params.idgde;


    const gde = await seleccionarGdeProveedor(id_gde_actual);
    gde_actual = gde;

    DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_vacio, function (datos_evidencia) {
        if (datos_evidencia != "-1") {
            $$("#imagen_camion_vacio").attr("src", datos_evidencia[0].ARCHIVO);
        }

        DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_vacio_2, function (datos_evidencia_2) {
            if (datos_evidencia_2 != "-1") {
                $$("#imagen_camion_vacio_2").attr("src", datos_evidencia_2[0].ARCHIVO);
            }

        });
    });


    $$("#btn_puntos").click(function () {

        DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_vacio, function (datos_evidencia) {
            DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_camion_vacio_2, async function (datos_evidencia_2) {
                if (datos_evidencia != "-1" && datos_evidencia_2 != "-1") {

                    if (gde_actual.GDE_CAPTURA_FOTO_CAMION_VACIO == 0) {
                        const resultado = await DATOS_cambiaEstadoCamionVacio(id_gde_actual, 1);
                    }
                    mainView.router.navigate('/PuntosGDE/' + 0 + '/' + id_gde_actual + '/' + 0);

                } else {
                    app.dialog.alert("Antes de continuar. Debe capturar las imágenes del camión vacio", "Evidencia", function () {
                        return false;
                    });
                }

            });


        });
    });
});




function capturar_evidencia_camion_vacio(tipo_evidencia) {
    alert("entra");
    alert(JSON.stringify(gde_actual));
    if (gde_actual.GDE_CAPTURA_FOTO_CAMION_VACIO == 0) {

        if (tipo_evidencia == 1) {
            capturePhotoWithFile(id_gde_actual, tipo_evidencia);
        }
        if (tipo_evidencia == 3) {
            capturePhotoWithFile(id_gde_actual, tipo_evidencia);
        }
    }
    else {
        app.dialog.alert("Ya ha capturado las evidencias necesarias para el camión vacio", "Evidencia", function () {
            return false;
        });
    }

}




function cargar_evidencia_camion_vacio(evidencia, tipo) {


    if (tipo == 1) {
        $$("#imagen_camion_vacio").attr("src", evidencia.ARCHIVO);
    }
    if (tipo == 3) {

        $$("#imagen_camion_vacio_2").attr("src", evidencia.ARCHIVO);
    }




}


function volver_emision() {

    mainView.router.navigate('/EmisionDesdeFaena/' + 0 + '/' + id_gde_actual + '/' + 0);

}