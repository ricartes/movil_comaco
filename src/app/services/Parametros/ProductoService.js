import { getProductoDao } from "@/app/services/initServices"

export async function listarProductosPorClienteDestino(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente) {

    return await getProductoDao().listarProductosPorClienteDestino(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente);
}

export async function listarLargosPorProducto(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto) {

    return await getProductoDao().listarLargosPorProducto(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto);
}

