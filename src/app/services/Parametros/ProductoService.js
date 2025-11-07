import { getProductoDao, getPrecioProductoDao, getParametroGeneralDao } from "@/app/services/initServices"
import PrecioPorductoGdeDTO from "@/app/DTO/Parametros/PrecioPorductoGdeDTO";
import config from "@/Common/json/config.json";


/**
 * Lista productos asociados a un cliente destino
 * @param {*} codEncargado 
 * @param {*} rutProveedor 
 * @param {*} rolPredio 
 * @param {*} rutCliente 
 * @param {*} destinoCliente 
 * @returns 
 */
export async function listarProductosPorClienteDestino(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente) {

    return await getProductoDao().listarProductosPorClienteDestino(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente);
}

/**
 * Lista largo productos
 * @param {*} codEncargado 
 * @param {*} rutProveedor 
 * @param {*} rolPredio 
 * @param {*} rutCliente 
 * @param {*} destinoCliente 
 * @param {*} codProducto 
 * @returns 
 */
export async function listarLargosPorProducto(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto) {

    return await getProductoDao().listarLargosPorProducto(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto);
}


export async function obtenerPrecioProducto(empId, codProducto, rutCliente) {
    let precio = 0;
    let precioPorDefecto = false;
    const precioProducto = await getPrecioProductoDao().obtenerPorProductoVigente(empId, codProducto, rutCliente);
    if (precioProducto) {
        precio = precioProducto.precio;
    } else {
        const parametroGeneral = await getParametroGeneralDao().obtener(empId, config.parametros.parametrosGenerales.precioPorDefecto);
        if (parametroGeneral) {
            precio = Number(parametroGeneral.valor);
            precioPorDefecto = true;
        }

    }

    return new PrecioPorductoGdeDTO({ precio: precio, indicadorPrecioPorDefecto: precioPorDefecto });

}
