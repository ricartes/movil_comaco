import config from '@/Common/json/config.json'
import ParametroGeneralDTO from '@/app/DTO/Parametros/ParametroGeneralDTO'
import { makeId } from './_id'

/** Backend → Doc PouchDB */
export function mapServerParametroGeneralToDoc(row) {
    if (!row || row.id == null) throw new Error('id de parámetro requerido')
    // Componemos con empId para evitar colisiones multi-empresa
    return {
        _id: makeId(config.bd.tipoEntidad.parametroGeneral, row.empId ?? '0', row.id),
        type: config.bd.tipoEntidad.parametroGeneral,
        ...row,
        syncedAt: new Date().toISOString(),
    }
}

/** Lista backend → Docs PouchDB */
export function mapParametroGeneralArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.id != null)
        .map(mapServerParametroGeneralToDoc)
}

/** Doc PouchDB → DTO */
export function parametroGeneralDocToDTO(doc) {
    return new ParametroGeneralDTO(doc)
}
