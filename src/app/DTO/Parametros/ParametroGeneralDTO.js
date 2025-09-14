// @ts-nocheck
export default class ParametroGeneralDTO {
    constructor({
        empId,
        id,
        glosa,
        valor,

        // opcionales si el doc viene de PouchDB
        _id = undefined,
        _rev = undefined,
        type = undefined,
    } = {}) {
        this.empId = empId
        this.id = id
        this.glosa = glosa
        this.valor = valor
    }
}
