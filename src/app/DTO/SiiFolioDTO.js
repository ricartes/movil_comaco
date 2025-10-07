export default class SiiFolioDTO {
    constructor({
        empId,
        urfId,
        folio,
        estado,     // 'D' | 'A' | 'U'
        staging,    // bool (opcional)
        batchId,    // string (opcional)
        createdAt,  // ISO (opcional)
        updatedAt,  // ISO (opcional)
    } = {}) {
        this.empId = empId;
        this.urfId = urfId;
        this.folio = folio;
        this.estado = estado;
        this.staging = staging;
        this.batchId = batchId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
