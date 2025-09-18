import config from '@/Common/json/config.json'
import TransportistaDTO from '@/app/DTO/Parametros/TransportistaDTO'
import TransportistaSimpleDTO from '@/app/DTO/Parametros/TransportistaSimpleDTO'
import PatenteCamionDTO from '@/app/DTO/Parametros/PatenteCamionDTO'
import { makeId } from './_id'

/**
 * Mapea un registro del backend a un documento PouchDB
 * _id compuesto por patCamion + patCarro (si no hay carro, usa '-')
 * @param {object} row
 */
export function mapServerTransportistaToDoc(row) {
    if (!row || !row.patCamion) throw new Error('patCamion requerido')

    return {
        _id: makeId(
            config.bd.tipoEntidad.transportista,
            row.patCamion,
            row.patCarro ?? '-'
        ),
        type: config.bd.tipoEntidad.transportista,
        ...row,
        // metadato opcional (NO usar prefijo _)
        syncedAt: new Date().toISOString(),
    }
}

/**
 * Conveniencia para listas
 * @param {object[]} rows
 */
export function mapTransportistaArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.patCamion)
        .map(mapServerTransportistaToDoc)
}

/**
 * Mapea documento PouchDB -> DTO
 * @param {object} doc
 * @returns {TransportistaDTO}
 */
export function transportistaDocToDTO(doc) {
    return new TransportistaDTO(
        doc.patCamion,
        doc.patCarro,
        doc.rutChofer,
        doc.nomChofer,
        doc.codTransportista,
        doc.nomTransportista,
        doc.rutTransportista,
        doc.vigencia
    )
}

export function transportistaSimpleDocToDTO(doc) {
    return new TransportistaSimpleDTO(
        doc
    )
}


export function patenteDocToDTO(doc) {
    return new PatenteCamionDTO(
        doc
    )
}
