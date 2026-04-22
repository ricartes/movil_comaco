import config from '@/Common/json/config.json'
import ClienteDTO from '@/app/DTO/Parametros/ClienteDTO'
import ClienteDestinoDTO from '@/app/DTO/Parametros/ClienteDestinoDTO'
import ClienteDestinoCanchaDTO from '@/app/DTO/Parametros/ClienteDestinoCanchaDTO'
import { makeId } from './_id'

export function mapServerClienteToDoc(row) {
    if (!row || row.empId == null || !row.rutCliente) throw new Error('cliente requerido')

    return {
        _id: makeId(config.bd.tipoEntidad.cliente, row.empId, row.rutCliente),
        type: config.bd.tipoEntidad.cliente,
        ...row,
        syncedAt: new Date().toISOString(),
    }
}

export function mapServerClienteDestinoToDoc(row) {
    if (!row || row.empId == null || !row.rutCliente || !row.destinoCliente) {
        throw new Error('destino de cliente requerido')
    }

    return {
        _id: makeId(config.bd.tipoEntidad.clienteDestino, row.empId, row.rutCliente, row.destinoCliente),
        type: config.bd.tipoEntidad.clienteDestino,
        ...row,
        direccionDestinoCliente: row.direccionDestinoCliente ?? row.direccionCliente ?? null,
        syncedAt: new Date().toISOString(),
    }
}

export function mapServerClienteDestinoCanchaToDoc(row) {
    if (!row || row.empId == null || !row.rutCliente || !row.destinoCliente || !row.nombreCancha) {
        throw new Error('cancha de destino requerida')
    }

    return {
        _id: makeId(
            config.bd.tipoEntidad.clienteDestinoCancha,
            row.empId,
            row.rutCliente,
            row.destinoCliente,
            row.nombreCancha
        ),
        type: config.bd.tipoEntidad.clienteDestinoCancha,
        ...row,
        syncedAt: new Date().toISOString(),
    }
}

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

export function destinoClienteCanchaDocToDTO(doc) {
    return new ClienteDestinoCanchaDTO(doc)
}

