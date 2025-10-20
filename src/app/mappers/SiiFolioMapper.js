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

    // ✅ Usar listas exactas del backend
    const usedSet = new Set((urfRow.foliosUsados || []).map(Number));
    const assignedSet = new Set((urfRow.foliosAsignados || []).map(Number));

    const estadosFolio = config.parametros.estadosFolio;
    // Asegúrate en config.json:
    //   estadosFolio.usado = 'U'
    //   estadosFolio.disponible = 'A'   // “disponible para usuario” = ASIGNADO

    const now = new Date().toISOString();
    const docs = [];

    for (let f = Number(folioInicial); f <= Number(folioFinal); f++) {
        let estado;
        if (usedSet.has(f)) {
            estado = estadosFolio.usado;          // 'U'
        } else if (assignedSet.has(f)) {
            estado = estadosFolio.disponible;     // 'A'
        } else {
            // Fallback seguro: si no vino en ninguna lista, trátalo como asignado
            estado = estadosFolio.disponible;     // 'A'
        }

        docs.push({
            _id: folioDocId(empId, urfId, f),
            type: T.folio,
            empId,
            urfId,
            folio: f,
            estado,            // 'U' | 'A'
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
