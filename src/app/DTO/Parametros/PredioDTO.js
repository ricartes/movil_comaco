// src/app/DTO/Parametros/RodalDTO.js
export default class PredioDTO {
    constructor({ rolPredio, rolComuna, predio, codProyecto } = {}) {
        this.rolPredio = rolPredio;
        this.rolComuna = rolComuna;
        this.predio = predio;
        this.codProyecto = codProyecto;
    }
}