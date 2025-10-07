import config from '@/Common/json/config.json';
import SiiUsuarioRangoFolioDTO from '@/app/DTO/SiiUsuarioRangoFolioDTO';
import { makeId } from './_id';

const T = config.bd.tipoEntidad;

// _id determinístico para URF
export const urfDocId = (empId, urfId) => makeId(T.siiUsuarioRangoFolio, `${empId}:${urfId}`);

/** Backend → Doc PouchDB (URF) */
export function mapServerURFToDoc(row, { batchId = null, staging = true } = {}) {
    if (!row || row.empId == null || row.urfId == null) {
        throw new Error('empId y urfId son obligatorios');
    }
    return {
        _id: urfDocId(row.empId, row.urfId),
        type: T.siiUsuarioRangoFolio,
        ...row, // empId, urfId, rutUsuario, folioInicial, folioFinal, cantidad, verificado, srfId, caf, rsask, rsapubk
        staging,
        batchId,
        syncedAt: new Date().toISOString(),
    };
}

/** Lista → docs */
export function mapURFArrayToDocs(rows = [], opts = {}) {
    return rows.map(r => mapServerURFToDoc(r, opts));
}

/** Doc → DTO */
export function urfDocToDTO(doc) {
    return new SiiUsuarioRangoFolioDTO(doc);
}
