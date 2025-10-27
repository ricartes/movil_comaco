// src/app/mappers/gdeMapper.js
import config from '@/Common/json/config.json'
import { makeId } from './_id'
import GdeDTO from '@/app/DTO/GdeDTO'
import { sanitizeForPouch } from "@/app/helpers/JsonHelpers";
function toYMD(fecha) {
    if (fecha instanceof Date) return fecha.toISOString().slice(0, 10)
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha
    throw new Error('fechaEmision debe ser Date o "YYYY-MM-DD"')
}





export function makeGdeDoc(raw) {
    const gdePlana = sanitizeForPouch(raw);
    return {
        type: config.bd.tipoEntidad.gde,
        empId: Number(raw.empresa?.id ?? raw.zona?.empId ?? 0),   // denormalizado
        rutEmisor: String(raw.emisor?.rut ?? '').trim(),          // denormalizado
        ...gdePlana,
        createdAt: new Date().toISOString(),
        folio: null,
        rescatado: false,
        syncing: false,
        sincronizado: false,
        sincronizadoAt: null,
        ultimoErrorSync: null,
        updatedAt: new Date().toISOString(),
        fechaEmision: null,
        emitiendo: false
    }
}


export function makeGdeRescatadaDoc(raw) {
    return {
        ...raw,
        rescatado: true,
    }
}

export function gdeDocToDTO(doc) {
    return new GdeDTO({
        folio: doc.folio,
        fechaEmision: doc.fechaEmision,
        tipoTraslado: doc.tipoTraslado,
        codDespachador: doc.codDespachador,
        unidadMedida: doc.unidadMedida,
        volumenTotal: doc.volumenTotal,
        valorTotal: doc.valorTotal,
        _id: doc._id,
        type: doc.type,
    })
}
