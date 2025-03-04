

async function actualizaGuardaCambiosEsquema(version) {
    try {
        await DATOS_ejecutaSecuenciaQuery(version.queries);
        await DATOS_guardaHistoricoCambios(version.versionNumber);
        return 1;
    } catch (error) {
        console.error('Error en actualizaGuardaCambiosEsquema:', error);
        return 0;
    }
}



function comprobarActualizarEsquema() {
    return new Promise(async (resolve, reject) => {
        try {
            await DATOS_crearTablaMigracion();
            const versionActual = await DATOS_ultimaVersion() || 0;
        
            const updates = versionesEsquema
                .filter(version => versionActual < version.versionNumber)
                .map(version => actualizaGuardaCambiosEsquema(version));

            const results = await Promise.all(updates);
            if (results.includes(0)) {
                reject(new Error('Algunas actualizaciones fallaron'));
            } else {
                resolve(1);
            }
        } catch (error) {
            reject(error);
        }
    });
}
