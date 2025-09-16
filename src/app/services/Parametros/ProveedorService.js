import { getProveedorDao } from "@/app/services/initServices"

export async function listarProveedoresPorZona(codEncargado) {

    return await getProveedorDao().listarPorZona(codEncargado);
}

