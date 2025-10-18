import config from '@/Common/json/config.json'
import LargoProductoDTO from '@/app/DTO/Parametros/LargoProductoDTO'
import { makeId } from './_id'

/** Backend → Doc PouchDB */
export function mapServerLargoProductoToDoc(row) {
    if (!row || row.largo == null) {
        throw new Error('largo de parámetro requerido');
    }

    return {
        _id: makeId(config.bd.tipoEntidad.largoProducto, row.largo),
        type: config.bd.tipoEntidad.largoProducto,
        ...row,
        syncedAt: new Date().toISOString(),
    };
}


/** Lista backend → Docs PouchDB */
export function mapLargoProductoArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.id != null)
        .map(mapServerLargoProductoToDoc)
}

/** Doc PouchDB → DTO */
export function largoProductoDocToDTO(doc) {
    return new LargoProductoDTO(doc)
}
