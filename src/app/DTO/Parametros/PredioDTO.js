// src/app/DTO/Parametros/RodalDTO.js
export default class PredioDTO {
    constructor({ rolPredio, rolComuna, predio, codProyecto } = {}) {
        this.rolPredio = rolComuna;
        this.predio = predio;
        this.codProyecto = codProyecto;
    }
}