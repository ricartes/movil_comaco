// @ts-nocheck
export default class CarguioDTO {
    constructor({
        rutCarguio,
        nombreCarguio,
        patenteCarguio,

        // opcionales si viene desde PouchDB
        _id = undefined,
        _rev = undefined,
        type = undefined,
    } = {}) {
        this.rutCarguio = rutCarguio
        this.nombreCarguio = nombreCarguio
        this.patenteCarguio = patenteCarguio
    }
}
