// src/app/mappers/SiiFolioMapper.js
import config from '@/Common/json/config.json';
import SiiFolioDTO from '@/app/DTO/SiiFolioDTO';
import { makeId } from './_id';

const T = config.bd.tipoEntidad;

export const folioDocId = (empId, urfId, folio) =>
    makeId(T.folio, `${empId}:${urfId}:${folio}`);

export function buildFoliosDocsFromURF(urfRow, { batchId = null, staging = true } = {}) {
    const { empId, urfId, folioInicial, folioFinal } = urfRow;
    if (empId == null || urfId == null || folioInicial == null || folioFinal == null) {
        throw new Error('empId, urfId, folioInicial y folioFinal son obligatorios');
    }

    const maxU = urfRow.maxOcupado != null ? Number(urfRow.maxOcupado) : null;
    const now = new Date().toISOString();
    const docs = [];
    const estadosFolio = config.parametros.estadosFolio;
    for (let f = Number(folioInicial); f <= Number(folioFinal); f++) {
        const estado = maxU != null && f <= maxU ? estadosFolio.usado : estadosFolio.disponible; // usados hasta maxOcupado, resto disponibles
        docs.push({
            _id: folioDocId(empId, urfId, f),
            type: T.folio,
            empId,
            urfId,
            folio: f,
            estado,            // 'U' ó 'D'
            staging,
            batchId,
            createdAt: now,
            updatedAt: now,
        });
    }
    return docs;
}

export function folioDocToDTO(doc) {
    return new SiiFolioDTO(doc);
}
