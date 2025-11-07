// src/app/DTO/Parametros/ProductoDTO.js
export default class ProductoDTO {
    constructor({ codProducto, nombreProducto, unidadMedida, fsc, categoria, sag, tipoCertificacion, codigoCertificacion } = {}) {
        this.codProducto = codProducto;
        this.nombreProducto = nombreProducto;
        this.unidadMedida = unidadMedida;
        this.fsc = fsc;
        this.categoria = categoria;
        this.sag = sag;
        this.tipoCertificacion = tipoCertificacion;
        this.codigoCertificacion = codigoCertificacion;
    }
}