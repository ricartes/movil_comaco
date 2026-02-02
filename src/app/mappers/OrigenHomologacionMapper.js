import config from '@/Common/json/config.json'
import OrigenHomologacionDTO from '@/app/DTO/Parametros/OrigenHomologacionDTO'
import { makeId } from './_id'

/** Backend → Doc PouchDB */
export function mapServerOrigenHomologacionToDoc(row) {
    if (!row || row.id == null) throw new Error('id de parámetro requerido')
    // Componemos con empId para evitar colisiones multi-empresa
    return {
        _id: makeId(config.bd.tipoEntidad.origenHomologacion, row.id),
        type: config.bd.tipoEntidad.origenHomologacion,
        ...row,
        syncedAt: new Date().toISOString(),
    }
}

/** Lista backend → Docs PouchDB */
export function mapOrigenHomologacionArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.id != null)
        .map(mapServerOrigenHomologacionToDoc)
}

/** Doc PouchDB → DTO */
export function origenHomologacionDocToDTO(doc) {
    return new OrigenHomologacionDTO(doc)
}
