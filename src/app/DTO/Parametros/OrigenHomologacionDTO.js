// src/app/DTO/Parametros/RodalDTO.js
export default class OrigenHomologacionDTO {
    constructor({ id, codOrigen, idForestalExterna, forestalCodigo, forestalNombre, idOrigenExterno, origenExternoCodigo, origenExternoNombre, activo } = {}) {
        this.id = id;
        this.codOrigen = codOrigen;
        this.idForestalExterna = idForestalExterna;
        this.forestalCodigo = forestalCodigo;
        this.forestalNombre = forestalNombre;
        this.idOrigenExterno = idOrigenExterno;
        this.origenExternoCodigo = origenExternoCodigo;
        this.origenExternoNombre = origenExternoNombre;
        this.activo = activo;
    }
}