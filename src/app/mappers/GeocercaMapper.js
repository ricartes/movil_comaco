import config from '@/Common/json/config.json'
import GeocercaDTO from '@/app/DTO/Parametros/GeocercalDTO'
import { makeId } from './_id'

/** Backend → Doc PouchDB */
export function mapServerGeocercaToDoc(row) {
    if (!row || row.id == null) {
        throw new Error('id de parámetro requerido');
    }

    return {
        _id: makeId(config.bd.tipoEntidad.geocerca, row.id),
        type: config.bd.tipoEntidad.geocerca,
        ...row,
        syncedAt: new Date().toISOString(),
    };
}


/** Lista backend → Docs PouchDB */
export function mapGeocercaArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.id != null)
        .map(mapServerGeocercaToDoc)
}

/** Doc PouchDB → DTO */
export function geocercaDocToDTO(doc) {
    return new GeocercaDTO(doc)
}
