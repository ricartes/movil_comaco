// @ts-nocheck
export default class GdeDTO {
    constructor({
        folio,
        fechaEmision,     // string 'YYYY-MM-DD'
        tipoTraslado,     // 'V', 'T', etc.
        codDespachador,
        unidadMedida,
        volumenTotal,
        valorTotal,
        _id = undefined,
        type = undefined,
    } = {}) {
        this.folio = Number(folio);
        this.fechaEmision = fechaEmision || null;    // normalizada a 'YYYY-MM-DD'
        this.tipoTraslado = tipoTraslado || 'V';
        this.codDespachador = codDespachador ?? null;
        this.unidadMedida = unidadMedida || 'MR';
        this.volumenTotal = Number(volumenTotal ?? 0);
        this.valorTotal = Number(valorTotal ?? 0);
        this._id = _id;
        this.type = type;
    }
}
