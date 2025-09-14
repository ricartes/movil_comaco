// src/app/mappers/rodalMapper.js
import config from '@/Common/json/config.json'
import RodalDTO from '@/app/DTO/Parametros/RodalDTO'
import { makeId } from './_id'
import { normalizeText } from './_normalize' // ya lo vienes usando

/** Mapea item del WS -> documento PouchDB */
export function mapServerRodalToDoc(row) {
    if (!row || !row.codOrigen || row.codrodal == null) {
        throw new Error('codOrigen y codrodal son requeridos');
    }

    const codOrigen = normalizeText(row.codOrigen); // p.ej. "2219-629"
    const codrodal = Number(row.codrodal);

    return {
        _id: makeId(config.bd.tipoEntidad.rodal, codOrigen, String(codrodal)),
        type: config.bd.tipoEntidad.rodal,

        // guardamos normalizados / originales
        codOrigen,                   // normalizado para búsquedas consistentes
        codrodal,                    // number
        nomrodal: row.nomrodal ?? null,
        fechaPlantacion: row.fechaPlantacion ?? null, // string (no parseamos)
        planManejo: row.planManejo ?? null,
        nroaviso: row.nroaviso ?? null,

        syncedAt: new Date().toISOString(),
    };
}

/** Mapea documento PouchDB -> DTO de dominio */
export function rodalDocToDTO(doc) {
    return new RodalDTO(
        doc.codOrigen,
        doc.codrodal,
        doc.nomrodal ?? null,
        doc.fechaPlantacion ?? null,
        doc.planManejo ?? null,
        doc.nroaviso ?? null,
    );
}

/** Conveniencia para arrays del WS */
export function mapRodalArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.codOrigen && r.codrodal != null)
        .map(mapServerRodalToDoc);
}
