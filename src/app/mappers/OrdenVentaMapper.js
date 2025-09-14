// src/app/mappers/ordenVentaMapper.js
import config from '@/Common/json/config.json'
import OrdenVentaDTO from '@/app/DTO/Parametros/OrdenVentaDTO'
import { makeId } from './_id'

/**
 * Mapea un registro del backend a un documento PouchDB
 * @param {object} row  // el item tal cual llega del WS
 */
export function mapServerOvToDoc(row) {
    if (!row || row.numOv == null) throw new Error('numOv requerido')
    return {
        _id: makeId(
            config.bd.tipoEntidad.ordenVenta,
            row.numOv,
            row.codProducto,
            row.largoPorTrozo ?? 0
        ),
        type: config.bd.tipoEntidad.ordenVenta,
        ...row,

        // opcional (NO usar guión bajo al inicio para evitar error de PouchDB)
        syncedAt: new Date().toISOString(),
    }
}

/**
 * Mapea un documento PouchDB a DTO de dominio
 * @param {object} doc // documento leído de PouchDB
 * @returns {OrdenVentaDTO}
 */
export function ordenVentaDocToDTO(doc) {
    return new OrdenVentaDTO(
        doc.numOv,
        doc.codProyecto,
        doc.codCliente,
        doc.nomCliente,
        doc.codProducto,
        doc.nomProducto,
        doc.comentario ?? null,
        doc.unidadMedida,
        doc.codZona,
        doc.largoPorTrozo,
        doc.codOcReferencia ?? null,
        doc.ocReferencia ?? null,
        doc.fechaOcReferencia ?? null
    )
}
