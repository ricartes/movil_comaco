import config from '@/Common/json/config.json'
import SocioDTO from '@/app/DTO/Parametros/SocioDTO'
import { makeId } from './_id'

/**
 * Mapea un registro del backend a documento PouchDB
 * _id = "socio:{codigo}"
 */
export function mapServerSocioToDoc(row) {
    if (!row || row.codigo == null) throw new Error('codigo requerido')
    return {
        _id: makeId(config.bd.tipoEntidad.socio, row.codigo),
        type: config.bd.tipoEntidad.socio,
        ...row,
        // meta opcional (no usar "_" inicial)
        syncedAt: new Date().toISOString(),
    }
}

/** Lista → docs */
export function mapSocioArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.codigo != null)
        .map(mapServerSocioToDoc)
}

/** Doc PouchDB → DTO de dominio */
export function socioDocToDTO(doc) {
    return new SocioDTO(doc)
}
