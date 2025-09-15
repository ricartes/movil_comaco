// src/app/services/CargaParametrosService.js
import config from '@/Common/json/config.json'
import store from '@/js/store'
import CargaParametrosWebServices from '@/app/webservices/CargaParametrosWebServices'

import {
    getOrdenCompraDao, getOrdenVentaDao, getTransportistaDao, getSocioDao,
    getPrecioProductoDao, getEmpresaDao, getParametroGeneralDao, getCarguioDao, getEmpresContratistaDao, getRodalDao
} from '@/app/services/initServices'
import { mapServerOrdenCompraToDoc } from '@/app/mappers/ordenCompraMapper'
import { mapServerOvToDoc } from '@/app/mappers/ordenVentaMapper'
import { mapServerTransportistaToDoc } from '@/app/mappers/transportistaMapper'
import { mapServerSocioToDoc } from '@/app/mappers/SocioMapper'
import { mapServerPrecioToDoc } from '@/app/mappers/PrecioProductoMapper'
import { mapServerEmpresaToDoc } from '@/app/mappers/empresaMapper'
import { mapServerParametroGeneralToDoc } from '@/app/mappers/parametroGeneralMapper'
import { mapServerCarguioToDoc } from '@/app/mappers/carguioMapper'
import { mapServerEmpresaContratistaToDoc } from '@/app/mappers/empresaContratistaMapper'
import { mapServerRodalToDoc } from '@/app/mappers/rodalMapper'

// Helper genérico: pide WS, mapea y reemplaza en PouchDB
async function loadAndReplace({ empId, rut, ruta, mapper, daoGetter, nombre }) {
    const token = store.state.token
    if (!token) throw new Error('Token no disponible')

    const resp = await CargaParametrosWebServices.cargarParametro(empId, rut, ruta, token)
    if (!resp?.status) {
        throw new Error(resp?.message || `Error en servicio de ${nombre}`)
    }

    const rows = Array.isArray(resp.data) ? resp.data : []
    const docs = rows.map(mapper)

    const dao = daoGetter()
    // Reemplazo total
    await dao.eliminarTodos()
    if (typeof dao.insertarMasivo === 'function') {
        await dao.insertarMasivo(docs)
    } else {
        await Promise.all(docs.map(d => dao.insertar(d)))
    }

    return { status: true, count: docs.length }
}

const CargaParametrosService = {
    cargarOrdenesCompra(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarOrdenCompra,
            mapper: mapServerOrdenCompraToDoc,
            daoGetter: getOrdenCompraDao,
            nombre: 'órdenes de compra',
        })
    },

    cargarOrdenesVenta(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarOrdenVenta,
            mapper: mapServerOvToDoc,
            daoGetter: getOrdenVentaDao,
            nombre: 'órdenes de venta',
        })
    },

    cargarTransportista(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarTransportista,
            mapper: mapServerTransportistaToDoc,
            daoGetter: getTransportistaDao,
            nombre: 'transportistas',
        })
    },

    cargarSocios(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarSocios,
            mapper: mapServerSocioToDoc,
            daoGetter: getSocioDao,
            nombre: 'socios',
        })
    },
    cargarPrecios(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarPrecios,
            mapper: mapServerPrecioToDoc,
            daoGetter: getPrecioProductoDao,
            nombre: 'Precio Producto',
        })
    },
    cargarEmpresas(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarEmpresas,
            mapper: mapServerEmpresaToDoc,
            daoGetter: getEmpresaDao,
            nombre: 'Empresa',
        })
    },
    cargarParametroGeneral(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarParametroGeneral,
            mapper: mapServerParametroGeneralToDoc,
            daoGetter: getParametroGeneralDao,
            nombre: 'Parametro General',
        })
    },
    cargarCarguios(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarCarguios,
            mapper: mapServerCarguioToDoc,
            daoGetter: getCarguioDao,
            nombre: 'Carguios',
        })
    },
    cargarEmpresaContratista(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarEmpresaContratista,
            mapper: mapServerEmpresaContratistaToDoc,
            daoGetter: getEmpresContratistaDao,
            nombre: 'Empresa contratista',
        })
    },
    cargarRodales(empId, rut) {
        return loadAndReplace({
            empId,
            rut,
            ruta: config.rutas.RescatarRodales,
            mapper: mapServerRodalToDoc,
            daoGetter: getRodalDao,
            nombre: 'Rodales',
        })
    },
}

export default CargaParametrosService
