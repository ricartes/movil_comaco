import { getRodalDao } from "@/app/services/initServices"

export async function listarRodalesPorOrigen(codOrigen) {

    return await getRodalDao().listarPorOrigen(codOrigen);
}


export async function obtenerRodalPorOrigen(codOrigen) {

    return await getRodalDao().obtenerPorOrigen(codOrigen);
}

