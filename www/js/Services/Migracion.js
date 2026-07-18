

async function actualizaGuardaCambiosEsquema(version) {
    try {
        await DATOS_aplicaMigracionVersionada(version);
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
        
            const updates = versionesEsquema.filter(
                version => versionActual < version.versionNumber
            );

            for (const version of updates) {
                const resultado = await actualizaGuardaCambiosEsquema(version);
                if (resultado !== 1) {
                    throw new Error('FallÃ³ la actualizaciÃ³n de esquema ' + version.versionNumber);
                }
            }
            resolve(1);
        } catch (error) {
            reject(error);
        }
    });
}
