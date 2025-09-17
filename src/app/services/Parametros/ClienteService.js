import { getClienteDao } from "@/app/services/initServices"

export async function listarClientesPorPredio(codEncargado, rutProveedor, rolPredio) {

    return await getClienteDao().listarPorPredio(codEncargado, rutProveedor, rolPredio);
}

