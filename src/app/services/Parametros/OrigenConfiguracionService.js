import { getOrigenConfiguracionDao } from "@/app/services/initServices"

export async function obtenerConfiguracionOrigenPorCodigo(codOrigen) {
    return await getOrigenConfiguracionDao().obtenerPorCodigoOrigen(codOrigen);
}

