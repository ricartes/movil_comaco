import config from '@/Common/json/config.json'
import ZonaDTO from '@/app/DTO/Parametros/ZonaDTO'
import { makeId } from './_id'

/**
 * Mapea un registro del backend a documento PouchDB
 * _id = "Zona:{codigo}"
 */
export function mapServerZonaToDoc(row) {
    if (!row || row.codigo == null || row.empId == null) throw new Error('codigo requerido')
    return {
        _id: makeId(config.bd.tipoEntidad.zona, row.empId, row.codigo),
        type: config.bd.tipoEntidad.zona,
        ...row,
        // meta opcional (no usar "_" inicial)
        syncedAt: new Date().toISOString(),
    }
}

/** Lista → docs */
export function mapZonaArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.codigo != null && r.empId != null)
        .map(mapServerZonaToDoc)
}

/** Doc PouchDB → DTO de dominio */
export function zonaDocToDTO(doc) {
    return new ZonaDTO(doc)
}
