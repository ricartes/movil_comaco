import config from '@/Common/json/config.json'
import ProveedorDTO from '@/app/DTO/Parametros/ProveedorDTO'

/**
 * Mapea documento PouchDB -> DTO
 * @param {object} doc
 * @returns {ProveedorDTO}
 */
export function proveedorDocToDTO(doc) {
    return new ProveedorDTO(doc)
}
