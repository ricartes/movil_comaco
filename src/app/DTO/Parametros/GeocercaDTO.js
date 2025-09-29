// src/app/DTO/Parametros/GeocercaDTO.js
export default class GeocercaDTO {
    constructor({
        id = null,
        rolPredio = '',
        geocerca = {},           // GeoJSON (objeto o string)
        fechaDesde = null,       // string "YYYY-MM-DD"
        fechaHasta = null,       // string "YYYY-MM-DD" o null
        usuario = null,
        fechaRegistro = null,    // string ISO 8601
        flagControl = false,
    } = {}) {
        this.id = id;
        this.rolPredio = rolPredio;
        this.geocerca = geocerca;
        this.fechaDesde = fechaDesde;
        this.fechaHasta = fechaHasta;
        this.usuario = usuario;
        this.fechaRegistro = fechaRegistro;
        this.flagControl = flagControl;
    }
}
