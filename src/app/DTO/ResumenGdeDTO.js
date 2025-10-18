// src/app/dto/ResumenGdeDTO.js
export default class ResumenGdeDTO {
    constructor({ kpi, umCounts, serie, latest }) {
        this.kpi = kpi;                 // { emitidas, anuladas, totales }
        this.umCounts = umCounts;       // { MR, M3, TON, BDMT }
        this.serie = serie;             // { labels: string[], values: number[] }
        this.latest = latest;           // Array<{ empId?, folio, estado, unidadMedida, fechaEmision }>
    }

    static empty() {
        return new ResumenGdeDTO({
            kpi: { emitidas: 0, anuladas: 0, totales: 0 },
            umCounts: { MR: 0, M3: 0, ASTILLAS: 0 },
            serie: { labels: [], values: [] },
            latest: [],
        });
    }
}
