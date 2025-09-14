// @ts-nocheck
// Copia 1:1 los campos del backend
export default class PrecioProductoDTO {
    constructor({
        empresaId,
        codigoProducto,
        fechaInicial,
        fechaFinal,
        precio,
        cliente = { codigo: null, rut: null, razon: null },

        // opcionales si vienes desde PouchDB
        _id = undefined,
        _rev = undefined,
        type = undefined,
    } = {}) {
        this.empresaId = empresaId
        this.codigoProducto = codigoProducto
        this.fechaInicial = fechaInicial
        this.fechaFinal = fechaFinal
        this.precio = precio
        this.cliente = cliente
    }
}
