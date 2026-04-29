
import { getOrdenCompraDao } from "@/app/services/initServices"

import config from "@/Common/json/config.json";


export async function listarOrdenesCaompra() {

    return await getOrdenCompraDao().listar();
}

export async function obtenerOrdenCompra(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto) {

    return await getOrdenCompraDao().obtenerPorDatos(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto);
}

export async function obtenerOrdenCompraPorCliente(rutCliente) {

    return await getOrdenCompraDao().obtenerPorRutCliente(rutCliente);
}

export async function obtenerOrdenCompraPorDestino(destinoCliente) {

    return await getOrdenCompraDao().obtenerPorDestinoCliente(destinoCliente);
}

export async function obtenerOrdenCompraPorProducto(codProducto) {

    return await getOrdenCompraDao().obtenerPorCodProducto(codProducto);
}

