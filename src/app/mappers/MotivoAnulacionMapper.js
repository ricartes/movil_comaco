import config from '@/Common/json/config.json'
import MotivoAnulacionDTO from '@/app/DTO/Parametros/MotivoAnulacionDTO'
import { makeId } from './_id'

/** Backend → Doc PouchDB */
export function mapServerMotivoAnulacionToDoc(row) {
    if (!row || row.empId == null || row.id == null) throw new Error('id de parámetro requerido')
    // Componemos con empId para evitar colisiones multi-empresa
    return {
        _id: makeId(config.bd.tipoEntidad.motivoAnulacion, row.empId ?? '0', row.id),
        type: config.bd.tipoEntidad.motivoAnulacion,
        ...row,
        syncedAt: new Date().toISOString(),
    }
}

/** Lista backend → Docs PouchDB */
export function mapMotivoAnulacionArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.id != null)
        .map(mapServerMotivoAnulacionToDoc)
}

/** Doc PouchDB → DTO */
export function motivoAnulacionlDocToDTO(doc) {
    return new MotivoAnulacionDTO(doc)
}
