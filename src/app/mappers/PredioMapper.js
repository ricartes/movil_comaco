import config from '@/Common/json/config.json'
import PredioDTO from '@/app/DTO/Parametros/PredioDTO'

/**
 * Mapea documento PouchDB -> DTO
 * @param {object} doc
 * @returns {PredioDTO}
 */
export function predioDocToDTO(doc) {
    return new PredioDTO(doc)
}
