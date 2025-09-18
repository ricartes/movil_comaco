import config from '@/Common/json/config.json'
import ProductoDTO from '@/app/DTO/Parametros/ProductoDTO'

/**
 * Mapea documento PouchDB -> DTO
 * @param {ProductoDTO} doc
 * @returns {ProductoDTO}
 */
export function productoDocToDTO(doc) {
    return new ProductoDTO(doc)
}


