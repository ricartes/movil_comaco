// src/app/DTO/Parametros/EmpresaContratistaDTO.js
export default class EmpresaContratistaDTO {
    constructor(rolPredio, rutContratista, nombreContratista, codLinea, nombreLinea) {
        this.rolPredio = rolPredio;
        this.rutContratista = rutContratista;
        this.nombreContratista = nombreContratista ?? null;
        this.codLinea = codLinea;
        this.nombreLinea = nombreLinea ?? null;
    }
}
