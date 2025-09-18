// src/app/DTO/Parametros/RodalDTO.js
export default class PatenteCamionDTO {
    constructor({ patCamion, vigencia } = {}) {
        this.patCamion = patCamion;
        this.vigencia = vigencia;
    }
}