// src/app/mappers/ordenCompraMapper.js
import config from '@/Common/json/config.json'
import { OrdenCompraDTO } from '@/app/DTO/Parametros/OrdenCompraDTO'
import { makeId } from './_id'


/**
 * @typedef {Object} ServerOrdenCompra
 * @property {string}  numOc
 * @property {string}  codEncargado
 * @property {number}  codCliente
 * @property {string}  rutCliente
 * @property {string}  razonSocialCliente
 * @property {string}  direccionCliente
 * @property {string}  comunaCliente
 * @property {string}  ciudadCliente
 * @property {string}  giroCliente
 * @property {string|null} telefonoCliente
 * @property {string}  destinoCliente
 * @property {string|null} codCargador
 * @property {string|null} rutCargador
 * @property {string|null} nombreCargador
 * @property {string|null} codContratista
 * @property {string|null} rutContratista
 * @property {string|null} codDescargador
 * @property {string|null} rutDescargador
 * @property {string|null} nombreDescargador
 * @property {string|null} patente
 * @property {string|null} carro
 * @property {string|null} rutChofer
 * @property {string|null} nombreChofer
 * @property {string|null} codTransportista
 * @property {string|null} rutTransportista
 * @property {string|null} nombreTransportista
 * @property {number}  codProveedor
 * @property {string}  rutProveedor
 * @property {string}  nomProveedor
 * @property {string}  codProyecto
 * @property {string}  rolPredio
 * @property {string}  rolComuna
 * @property {string}  predio
 * @property {number|null} anioPlantacion
 * @property {number}  codProducto
 * @property {string}  nombreProducto
 * @property {string}  descripcionZona
 * @property {number|null} precioCosecha
 * @property {number|null} precioCargador
 * @property {number|null} precioDescargador
 * @property {number|null} precioFlete
 * @property {string|null} freeText
 * @property {string}  unidadMedida
 * @property {number|null} largoTrozo
 * @property {string}  direccionDestinoCliente
 * @property {string}  comunaDestinoCliente
 * @property {string}  ciudadDestinoCliente
 * @property {string}  tipoDoctoRef
 * @property {string|null} fechaDoctoRef
 * @property {string|null} groupNum
 * @property {string|null} uFeTipoDesp
 * @property {number|null} diametroMin
 * @property {number|null} diametroMax
 * @property {string|null} planManejo
 * @property {number|null} coordenadaX
 * @property {number|null} coordenadaY
 * @property {string|null} fsc
 * @property {string|null} categoria
 * @property {string|null} sag
 * @property {string|null} ocCliente
 */

/**
 * Mapea una fila del WS a documento PouchDB.
 * _id_: `${tipo}:${numOc}`
 * type: `config.bd.tipoEntidad.ordenCompra`
 *
 * @param {ServerOrdenCompra} row
 * @returns {Object} doc listo para PouchDB
 */
export function mapServerOrdenCompraToDoc(row) {
    if (!row || !row.numOc) throw new Error('numOc requerido para ordenar compra')
    return {
        _id: makeId(config.bd.tipoEntidad.ordenCompra, row.numOc),
        type: config.bd.tipoEntidad.ordenCompra,
        // Copiamos todos los campos tal cual vienen del backend
        ...row,
        // metadatos opcionales
        syncedAt: new Date().toISOString(),
    }
}


export function ocDocToDTO(doc) {
    return new OrdenCompraDTO(doc) // tu DTO copia 1:1 los campos
}

