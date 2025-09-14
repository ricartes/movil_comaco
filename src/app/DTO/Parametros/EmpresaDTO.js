// @ts-nocheck
// Copia 1:1 los campos del backend
export default class EmpresaDTO {
    constructor({
        id,
        rut,
        dv,
        razonSocial,
        direccion,
        comuna,
        ciudad,
        giro,
        correo,
        actividadEconomica,
        telefono,
        fechaResolucion,
        numeroResolucion,
        codigoSII,
        actividadSII,

        // opcionales si viene desde PouchDB
        _id = undefined,
        _rev = undefined,
        type = undefined,
    } = {}) {
        this.id = id
        this.rut = rut
        this.dv = dv
        this.razonSocial = razonSocial
        this.direccion = direccion
        this.comuna = comuna
        this.ciudad = ciudad
        this.giro = giro
        this.correo = correo
        this.actividadEconomica = actividadEconomica
        this.telefono = telefono
        this.fechaResolucion = fechaResolucion
        this.numeroResolucion = numeroResolucion
        this.codigoSII = codigoSII
        this.actividadSII = actividadSII
    }
}
