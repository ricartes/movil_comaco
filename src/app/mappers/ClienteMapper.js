import config from '@/Common/json/config.json'
import ClienteDTO from '@/app/DTO/Parametros/ClienteDTO'

/**
 * Mapea documento PouchDB -> DTO
 * @param {object} doc
 * @returns {ClienteDTO}
 */
export function clienteDocToDTO(doc) {
    return new ClienteDTO(doc)
}
