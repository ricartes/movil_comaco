let appStartTime = Date.now(); // Hora real al iniciar la app
let elapsedTime = 0;           // Tiempo acumulado por el reloj interno
const THRESHOLD = 5000; // Umbral de 5 segundos
// Función para inicializar el evento resume
function initializeResumeHandler() {
    document.addEventListener("resume", function () {

        const usuarioActivo = Obtener_dato_local("user_activo");
        if (usuarioActivo && usuarioActivo != "") {
            handleTimeChange();
        }
    }, false);
}

// Función para manejar el cambio de hora
function handleTimeChange() {
    const fecha_hora = FechaHoraActual();

    // Validar contra el servidor
    comparar_fecha_hora_ws(fecha_hora, function (result_fecha) {
        if (result_fecha == 0) {
            // Hora incorrecta según el servidor
            dispatchTimeChangeEvent(false, "Hora incorrecta según el servidor");
        } else if (result_fecha === -1) {
            // No hay conexión: Validar configuración automática
            validateAutomaticDateTimeZone((isAutomatic) => {
                if (isAutomatic) {
                    dispatchTimeChangeEvent(true, "Configuración automática activa");
                } else {
                    dispatchTimeChangeEvent(false, "Configuración automática desactivada");
                }
            });
        } else {
            // Hora correcta según el servidor
            dispatchTimeChangeEvent(true, "Hora correcta según el servidor");
        }
    });
}

// Función para validar configuración automática
function validateAutomaticDateTimeZone(callback) {
    window.VerifyAutomaticDateTimeZone.isAutomaticChecked(function (isIt) {
        callback(isIt == "true");
    });
}

// Función para disparar eventos personalizados
function dispatchTimeChangeEvent(horaCorrecta, mensaje) {
    const event = new CustomEvent("timeChangeDetected", {
        detail: {
            horaCorrecta: horaCorrecta,
            mensaje: mensaje,
            timestamp: new Date().getTime(), // Incluye un timestamp para trazabilidad
        },
    });
    document.dispatchEvent(event);
    console.log(`Evento disparado: ${mensaje}`);
}

