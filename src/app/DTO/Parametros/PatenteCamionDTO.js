// src/app/DTO/Parametros/RodalDTO.js
export default class PatenteCamionDTO {
    constructor({ patCamion, anchoCamion, vigencia } = {}) {
        this.patCamion = patCamion;
        this.anchoCamion = anchoCamion;
        this.vigencia = vigencia;
    }
}