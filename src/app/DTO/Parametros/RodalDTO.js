// src/app/DTO/Parametros/RodalDTO.js
export default class RodalDTO {
    constructor(codOrigen, codrodal, nomrodal, fechaPlantacion, planManejo, nroaviso) {
        this.codOrigen = codOrigen;                // string (normalizado en doc)
        this.codrodal = Number(codrodal);          // number
        this.nomrodal = nomrodal ?? null;          // string|null
        this.fechaPlantacion = fechaPlantacion ?? null; // string ISO o null (se guarda tal cual)
        this.planManejo = planManejo ?? null;      // string|null
        this.nroaviso = nroaviso ?? null;          // string|null
    }
}
