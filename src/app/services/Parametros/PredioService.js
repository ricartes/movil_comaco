import { getPredioDao } from "@/app/services/initServices"

export async function listarPrediosPorProveedor(codEncargado, rutProveedor) {

    return await getPredioDao().listarPorProveedor(codEncargado, rutProveedor);
}

