
import { getOrdenCompraDao } from "@/app/services/initServices"

import config from "@/Common/json/config.json";

export async function obtenerOrdenCompra(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto) {

    return await getOrdenCompraDao().obtenerPorDatos(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto);
}