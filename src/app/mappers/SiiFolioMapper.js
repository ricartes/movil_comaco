import config from '@/Common/json/config.json';
import SiiFolioDTO from '@/app/DTO/SiiFolioDTO';
import { makeId } from './_id';

const T = config.bd.tipoEntidad;

// _id determinístico para FOLIO
export const folioDocId = (empId, urfId, folio) =>
    makeId(T.folio, `${empId}:${urfId}:${folio}`);

/** Genera docs de folios (D = Disponible) desde un URF */
export function buildFoliosDocsFromURF(urfRow, { batchId = null, staging = true } = {}) {
    const { empId, urfId, folioInicial, folioFinal } = urfRow;
    if (empId == null || urfId == null || folioInicial == null || folioFinal == null) {
        throw new Error('empId, urfId, folioInicial y folioFinal son obligatorios');
    }
    const now = new Date().toISOString();
    const docs = [];
    for (let f = Number(folioInicial); f <= Number(folioFinal); f++) {
        docs.push({
            _id: folioDocId(empId, urfId, f),
            type: T.folio,
            empId,
            urfId,
            folio: f,
            estado: 'D', // Disponible
            staging,
            batchId,
            createdAt: now,
            updatedAt: now,
        });
    }
    return docs;
}

/** Doc → DTO */
export function folioDocToDTO(doc) {
    return new SiiFolioDTO(doc);
}
