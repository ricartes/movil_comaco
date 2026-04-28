// src/app/DTO/Parametros/ProductoDTO.js
function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        return ['1', 'true', 't', 'yes', 'y', 'si', 's'].includes(value.trim().toLowerCase());
    }
    return false;
}

export default class ProductoDTO {
    constructor(params = {}) {
        const { codProducto, nombreProducto, unidadMedida, fsc, categoria, sag, tipoCertificacion, codigoCertificacion } = params;

        this.codProducto = codProducto;
        this.nombreProducto = nombreProducto;
        this.unidadMedida = unidadMedida;
        this.fsc = fsc;
        this.categoria = categoria;
        this.sag = sag;
        this.flagCambioGde = toBoolean(params.flagCambioGde ?? params.Flag_cambio_gde ?? params.flag_cambio_gde ?? false);
        this.alertaVencimientoPrecio = toBoolean(params.alertaVencimientoPrecio ?? params.ALERTA_VENCIMIENTO_PRECIO ?? false);
        this.tipoCertificacion = tipoCertificacion;
        this.codigoCertificacion = codigoCertificacion;
    }
}
