$$(document).on('page:init', '.page[data-name="ingreso-planta"]', async function (e, page) {

    $$('.page[data-name="ingreso-planta"]').on('click', '#imagen_padron', async function () {
        await capturarEvidenciaIngresoPlanta();
    });





});


async function capturarEvidenciaIngresoPlanta() {
    alert("pasa");
    const estadoGPS = await verificarEstadoGPS();
    if (!estadoGPS) {
        app.dialog.alert(`Se ha detectado que el GPS se encuentra apagado. Favor habilítelo.`, "GFE");
    } else {

    }

}