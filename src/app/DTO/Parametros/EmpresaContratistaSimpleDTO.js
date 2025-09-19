// src/app/DTO/Parametros/EmpresaContratistaDTO.js
export default class EmpresaContratistaSimpleDTO {
    constructor({ rutContratista, nombreContratista } = {}) {
        this.rutContratista = rutContratista;
        this.nombreContratista = nombreContratista;
    }
}
