import config from '@/Common/json/config.json'
import ClienteDTO from '@/app/DTO/Parametros/ClienteDTO'
import ClienteDestinoDTO from '@/app/DTO/Parametros/ClienteDestinoDTO'

/**
 * Mapea documento PouchDB -> DTO
 * @param {object} doc
 * @returns {ClienteDTO}
 */
export function clienteDocToDTO(doc) {
    return new ClienteDTO(doc)
}


/**
 * Mapea documento PouchDB -> DTO
 * @param {object} doc
 * @returns {ClienteDTO}
 */
export function destinoClienteDocToDTO(doc) {
    return new ClienteDestinoDTO(doc)
}

