import config from '@/Common/json/config.json'
import EmpresaDTO from '@/app/DTO/Parametros/EmpresaDTO'
import { makeId } from './_id'

/** Backend → Doc PouchDB */
export function mapServerEmpresaToDoc(row) {
    if (!row || row.id == null) throw new Error('id de empresa requerido')
    return {
        _id: makeId(config.bd.tipoEntidad.empresa, row.id),
        type: config.bd.tipoEntidad.empresa,
        ...row,
        syncedAt: new Date().toISOString(),
    }
}

/** Lista backend → Docs PouchDB */
export function mapEmpresaArrayToDocs(rows = []) {
    return rows.filter(r => r && r.id != null).map(mapServerEmpresaToDoc)
}

/** Doc PouchDB → DTO */
export function empresaDocToDTO(doc) {
    return new EmpresaDTO(doc)
}
