import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { ocDocToDTO } from '@/app/mappers/ordenCompraMapper'

let instance = null;

export default class OrdenCompraDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                numOc: { $ne: null }
            }
        });

        const map = new Map();
        for (const d of res.docs) {
            const num = String(d.numOc ?? '').trim();
            if (!num) continue;
            if (!map.has(num)) map.set(num, d);
        }

        return Array.from(map.values())
            .sort((a, b) => Number(a.numOc) - Number(b.numOc))
            .map(ocDocToDTO);
    }



    async obtenerPorDatos(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto) {

        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor,
                rolPredio,
                rutCliente,
                destinoCliente,
                codProducto,

            },
            limit: 1
        });

        if (docs.length === 0) {
            return null; // No se encontró ningún precio vigente
        }
        return ocDocToDTO(docs[0]); // Retorna el primer documento mapeado a DTO
    }

    async obtenerPorRutCliente(rutCliente) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                rutCliente,
            },
            limit: 1
        });

        return docs.length ? ocDocToDTO(docs[0]) : null;
    }

    async obtenerPorDestinoCliente(destinoCliente) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                destinoCliente,
            },
            limit: 1
        });

        return docs.length ? ocDocToDTO(docs[0]) : null;
    }

    async obtenerPorCodProducto(codProducto) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codProducto,
            },
            limit: 1
        });

        if (docs.length) return ocDocToDTO(docs[0]);

        const altCodProducto =
            typeof codProducto === 'number' ? String(codProducto) : Number(codProducto);

        if (Number.isNaN(altCodProducto)) return null;

        const alt = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codProducto: altCodProducto,
            },
            limit: 1
        });

        return alt.docs.length ? ocDocToDTO(alt.docs[0]) : null;
    }


    async obtenerPorRolPredio(rolPredio) {

        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                rolPredio
            },
            limit: 1
        });

        if (docs.length === 0) {
            return null; // No se encontró ningún precio vigente
        }
        return ocDocToDTO(docs[0]); // Retorna el primer documento mapeado a DTO
    }

    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenCompra);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los OC:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(ordenCompra) {
        try {
            return await getBaseDao().insertar(ordenCompra);

        } catch (error) {
            console.error("Error al insertar OC:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}
