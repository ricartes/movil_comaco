import { getOrigenHomologacionDao } from "@/app/services/initServices"
import { getOrdenCompraDao } from "@/app/services/initServices"
import config from "@/Common/json/config.json";
export async function obtenerOrdenCompraDesdeHomologacionOrigen(origenExternoCodigo) {

    let ocAsignada = null;
    const idOrigenForestalLosLagos = config.parametros.origenExterno.forestalLosLagos || 1;
    const origenHomologacion = await getOrigenHomologacionDao().obtenerPorCodigoOrigenYForestalExterna(
        origenExternoCodigo,
        idOrigenForestalLosLagos
    );
    if (origenHomologacion && origenHomologacion.codOrigen) {
        ocAsignada = await getOrdenCompraDao().obtenerPorRolPredio(
            origenHomologacion.codOrigen
        );
    }

    return ocAsignada;
}

