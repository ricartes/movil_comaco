import config from '@/Common/json/config.json'
import ProductoDTO from '@/app/DTO/Parametros/ProductoDTO'
import { makeId } from './_id'

export function mapServerProductoToDoc(row) {
    if (!row) throw new Error('row requerido')
    const codProducto = row.codProducto ?? row.codigo ?? row.ItemCode
    const nombreProducto = row.nombreProducto ?? row.nombre ?? row.ItemName
    const unidadMedida = row.unidadMedida ?? row.unidad_medida
    if (codProducto == null) throw new Error('codProducto requerido')
    if (!unidadMedida) throw new Error(`unidadMedida requerida para producto ${codProducto}`)

    return {
        _id: makeId(config.bd.tipoEntidad.producto, codProducto),
        type: config.bd.tipoEntidad.producto,
        ...row,
        codProducto,
        nombreProducto,
        unidadMedida,
        flagCambioGde: row.flagCambioGde ?? row.Flag_cambio_gde ?? row.flag_cambio_gde ?? false,
        alertaVencimientoPrecio: row.alertaVencimientoPrecio ?? row.ALERTA_VENCIMIENTO_PRECIO ?? false,
        syncedAt: new Date().toISOString(),
    }
}

/**
 * Mapea documento PouchDB -> DTO
 * @param {ProductoDTO} doc
 * @returns {ProductoDTO}
 */
export function productoDocToDTO(doc) {
    return new ProductoDTO(doc)
}


