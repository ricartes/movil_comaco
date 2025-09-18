// src/app/DTO/Parametros/ProductoDTO.js
export default class ProductoDTO {
    constructor({ codProducto, nombreProducto, unidadMedida, fsc, categoria, sag } = {}) {
        this.codProducto = codProducto;
        this.nombreProducto = nombreProducto;
        this.unidadMedida = unidadMedida;
        this.fsc = fsc;
        this.categoria = categoria;
        this.sag = sag;
    }
}