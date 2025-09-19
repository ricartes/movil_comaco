import { getEmpresaContratistaDao } from "@/app/services/initServices"

export async function listarEmpresasContratistasPorOrigen(rolPredio) {

    return await getEmpresaContratistaDao().listarPorOrigen(rolPredio);
}


export async function listarLineasPorOrigenYEmpresaContratista(rolPredio, rutContratista) {

    return await getEmpresaContratistaDao().listarLineasPorOrigenYEmpresaContratista(rolPredio, rutContratista);
}
