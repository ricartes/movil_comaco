// src/app/mappers/gdeMapper.js
import config from '@/Common/json/config.json'
import { makeId } from './_id'
import GdeDTO from '@/app/DTO/GdeDTO'

function toYMD(fecha) {
    if (fecha instanceof Date) return fecha.toISOString().slice(0, 10)
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha
    throw new Error('fechaEmision debe ser Date o "YYYY-MM-DD"')
}

export function makeGdeDoc(raw, empId) {
    if (!raw?.folio) throw new Error('folio requerido')
    if (!empId) throw new Error('empId requerido')

    return {
        _id: makeId(config.bd.tipoEntidad.gde, empId, String(raw.folio)),
        type: config.bd.tipoEntidad.gde,

        empId: Number(empId),                   // ⬅️ ahora este nombre
        folio: Number(raw.folio),
        fechaEmision: toYMD(raw.fechaEmision),
        tipoTraslado: raw.tipoTraslado ?? 'V',
        codDespachador: raw.codDespachador ?? null,
        unidadMedida: raw.unidadMedida ?? 'MR',
        volumenTotal: Number(raw.volumenTotal ?? 0),
        valorTotal: Number(raw.valorTotal ?? 0),

        createdAt: new Date().toISOString(),
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
