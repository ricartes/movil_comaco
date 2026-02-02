// src/app/DTO/Parametros/RodalDTO.js
export default class OrigenConfiguracionDTO {
    constructor({ codOrigen, carguioObligatorio, activo } = {}) {
        this.codOrigen = codOrigen;
        this.carguioObligatorio = carguioObligatorio;
        this.activo = activo;
    }
}