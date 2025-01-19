// Función para inicializar el evento resume
function initializeResumeHandler() {
    document.addEventListener("resume", function () {
        alert("App reanudada");

        // Lógica para manejar el cambio de hora
        handleTimeChange();
    }, false);
}

// Función para manejar el cambio de hora
function handleTimeChange() {
    const realTime = Date.now(); // Tiempo real
    const systemTime = new Date().getTime(); // Hora del sistema
    const discrepancy = Math.abs(systemTime - realTime);
    const threshold = 5000; // Umbral de 5 segundos

    alert(realTime);
    alert(systemTime);

    if (discrepancy > threshold) {
        alert("Cambio en la hora del sistema detectado.");
        alert("El sistema detectó un cambio en la hora.");
    } else {
        alert("No hubo cambios significativos en la hora del sistema.");
    }
}
