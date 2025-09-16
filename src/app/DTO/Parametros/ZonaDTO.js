// src/app/DTO/Parametros/RodalDTO.js
export default class ZonaDTO {
    constructor({ empId, codigo, descripcion, sector } = {}) {
        this.empId = empId ?? null;
        this.codigo = codigo ?? null;
        this.descripcion = descripcion ?? null;
        this.sector = sector ?? null;
    }
}
