// @ts-nocheck
// DTO simple: copia 1:1 los campos del backend
export default class SocioDTO {
    constructor({
        codigo,
        rut,
        razonSocial,
        giro = null,
        ciudad = null,
        comuna = null,
        direccion = null,
        telefono = null,
        pais = null,
        esTransportista = null,
        esCargador = null,
        esDescargador = null,
        esContratista = null,

        // opcionales si vienes desde PouchDB
        _id = undefined,
        _rev = undefined,
        type = undefined,
    } = {}) {
        this.codigo = codigo
        this.rut = rut
        this.razonSocial = razonSocial
        this.giro = giro
        this.ciudad = ciudad
        this.comuna = comuna
        this.direccion = direccion
        this.telefono = telefono
        this.pais = pais
        this.esTransportista = esTransportista
        this.esCargador = esCargador
        this.esDescargador = esDescargador
        this.esContratista = esContratista
    }
}
