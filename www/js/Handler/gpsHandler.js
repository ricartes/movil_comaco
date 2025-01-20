
function inicializarGpsDiagnosticHandler() {
    cordova.plugins.diagnostic.registerLocationStateChangeHandler((state) => {

        const usuarioActivo = Obtener_dato_local("user_activo");
        if (usuarioActivo && usuarioActivo != "") {
            handleGpsStateChange();
        }

    });
}

function handleGpsStateChange(state) {

    if (state === cordova.plugins.diagnostic.locationMode.LOCATION_OFF) {
        alert("GPS desactivado");
    }
}