import { getClienteDao } from "@/app/services/initServices"

export async function listarClientesPorPredio(codEncargado, rutProveedor, rolPredio) {

    return await getClienteDao().listarPorPredio(codEncargado, rutProveedor, rolPredio);
}

export async function listarDestinosPorCliente(codEncargado, rutProveedor, rolPredio, rutCliente) {

    return await getClienteDao().listarDestinosPorCliente(codEncargado, rutProveedor, rolPredio, rutCliente);
}

export function clienteEsEmisor(rutCliente, rutEmpresa) {
    if (!rutCliente || !rutEmpresa) return false;

    // Normaliza rutCliente quitando el DV
    const baseCliente = rutCliente.split("-")[0].trim();

    // Empresa viene separado: número + dv
    const baseEmpresa = String(rutEmpresa).trim(); // ya es único sin DV

    return baseCliente === baseEmpresa;
}


