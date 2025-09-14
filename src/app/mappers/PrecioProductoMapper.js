import config from '@/Common/json/config.json'
import PrecioProductoDTO from '@/app/DTO/Parametros/PrecioProductoDTO'
import { makeId } from './_id'

/**
 * Doc PouchDB con ID compuesto:
 * precio:{empresaId}:{codigoProducto}:{cliente.codigo}:{fechaInicial}:{fechaFinal}
 */
export function mapServerPrecioToDoc(row) {
    if (!row) throw new Error('row requerido')
    const emp = row.empresaId
    const prod = row.codigoProducto
    const cli = row?.cliente?.codigo ?? ''
    const fIni = row.fechaInicial ?? ''
    const fFin = row.fechaFinal ?? ''
    if (emp == null || prod == null) throw new Error('empresaId y codigoProducto requeridos')

    return {
        _id: makeId(
            config.bd.tipoEntidad.precio,
            emp,
            prod,
            cli,
            fIni,
            fFin
        ),
        type: config.bd.tipoEntidad.precio,
        ...row,
        // meta opcional (no usar "_" inicial)
        syncedAt: new Date().toISOString(),
    }
}

/** Lista → docs */
export function mapPrecioArrayToDocs(rows = []) {
    return rows.filter(Boolean).map(mapServerPrecioToDoc)
}

/** Doc PouchDB → DTO */
export function precioDocToDTO(doc) {
    return new PrecioProductoDTO(doc)
}
