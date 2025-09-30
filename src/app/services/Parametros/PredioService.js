import { getPredioDao, getGeocercaDao } from "@/app/services/initServices"
import DatosGeocercaDTO from "@/app/DTO/DatosGeocercaDTO";
import { comprobarGeocerca } from "@/app/helpers/GeocercasHelpers";

export async function listarPrediosPorProveedor(codEncargado, rutProveedor) {

    return await getPredioDao().listarPorProveedor(codEncargado, rutProveedor);
}


export async function validarGeocercaPredio(rolPredio, latitud, longitud) {
    let mensaje = "Ubicación fuera de la geocerca. No podrá continuar con el despacho";
    let validado = false;

    alert(rolPredio);
    alert(latitud);
    alert(longitud);
    const datosGeocerca = await getGeocercaDao().obtenerPorPredio(rolPredio);
    alert(JSON.stringify(datosGeocerca));

    if (!datosGeocerca) {
        // Caso: predio no tiene geocerca
        mensaje = "Predio sin geocerca asociada. Sin embargo, podrá continuar con el despacho";
        validado = true;
    } else {
        const dentroGeocerca = comprobarGeocerca(datosGeocerca.geocerca, latitud, longitud);

        if (dentroGeocerca) {
            // Caso: ubicación dentro de la geocerca
            mensaje = "Ubicación dentro de la geocerca, podrá continuar";
            validado = true;
        } else if (datosGeocerca.flagControl === true) {
            // Caso: fuera de geocerca, pero flagControl permite continuar
            mensaje = "Ubicación fuera de la geocerca. Sin embargo, podrá continuar";
            validado = true;
        }
        // Caso contrario: se mantiene mensaje por defecto y validado = false
    }

    return new DatosGeocercaDTO(datosGeocerca, validado, mensaje);
}


