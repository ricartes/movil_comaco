import config from '@/Common/json/config.json'
import OrigenConfiguracionDTO from '@/app/DTO/Parametros/OrigenConfiguracionDTO'
import { makeId } from './_id'

/** Backend → Doc PouchDB */
export function mapServerOrigenConfiguracionToDoc(row) {
    if (!row || row.codOrigen == null) throw new Error('id de parámetro requerido')
    // Componemos con empId para evitar colisiones multi-empresa
    return {
        _id: makeId(config.bd.tipoEntidad.origenConfiguracion, row.codOrigen),
        type: config.bd.tipoEntidad.origenConfiguracion,
        ...row,
        syncedAt: new Date().toISOString(),
    }
}

/** Lista backend → Docs PouchDB */
export function mapOrigenConfiguracionArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.id != null)
        .map(mapServerOrigenConfiguracionToDoc)
}

/** Doc PouchDB → DTO */
export function origenConfiguracionDocToDTO(doc) {
    return new OrigenConfiguracionDTO(doc)
}
