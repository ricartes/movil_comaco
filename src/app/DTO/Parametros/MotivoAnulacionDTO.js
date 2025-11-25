// src/app/DTO/Parametros/MotivoAnulacionDTO.js
export default class MotivoAnulacionDTO {
    constructor({ empId, id, glosa, requiereGlosa } = {}) {
        this.empId = empId;
        this.id = id;
        this.glosa = glosa;
        this.requiereGlosa = requiereGlosa;
    }
}
