import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { productoDocToDTO } from '@/app/mappers/ProductoMapper'

let instance = null;

export default class ProductoDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.producto)
        return docs
            .sort((a, b) => {
                const nA = (a.nombreProducto || '').toLowerCase();
                const nB = (b.nombreProducto || '').toLowerCase();
                return nA.localeCompare(nB, 'es', { sensitivity: 'base' });
            })
            .map(productoDocToDTO)
    }


    // PredioService.js
    async listarProductosPorClienteDestino(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor,
                rolPredio,
                rutCliente,
                destinoCliente
            }
        });

        // dedupe por codProducto
        const map = new Map();
        for (const d of docs) {
            const cod = String(d.codProducto ?? '').trim();
            if (!cod) continue;

            if (!map.has(cod)) {
                // guardas el documento completo para luego mapearlo
                map.set(cod, d);
            }
        }

        // ahora mapeas los docs únicos → DTO
        return Array.from(map.values()).map(productoDocToDTO);
    }




    /**
     * Lista todos los largos disponibles en la colección de largos de producto
     * @returns 
     */
    async listarTodosLosLargos() {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.largoProducto
            }
        });

        // distinct por largoTrozo (considera null como “sin largo”)
        const set = new Set();
        for (const d of docs) {
            // normaliza a string para dedupe estable
            const key = d.largo == null ? 'NULL' : String(d.largo);
            set.add(key);
        }

        // Devuelve números (o null) ordenados
        const largos = Array.from(set).map(k => (k === 'NULL' ? null : Number(k)));
        // Opcional: ordena colocando null al final
        largos.sort((a, b) => (a == null) - (b == null) || (a - b));

        return largos;
    }


    /**
     * Lista los largos disponibles para un producto en base a los parámetros de orden-compra
     * 
     * @param {*} codEncargado 
     * @param {*} rutProveedor 
     * @param {*} rolPredio 
     * @param {*} rutCliente 
     * @param {*} destinoCliente 
     * @param {*} codProducto 
     * @returns 
     */
    async listarLargosPorProducto(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.largoProducto
            }
        });

        // distinct por largoTrozo (considera null como “sin largo”)
        const set = new Set();
        for (const d of docs) {
            // normaliza a string para dedupe estable
            const key = d.largo == null ? 'NULL' : String(d.largo);
            set.add(key);
        }

        // Devuelve números (o null) ordenados
        const largos = Array.from(set).map(k => (k === 'NULL' ? null : Number(k)));
        // Opcional: ordena colocando null al final
        largos.sort((a, b) => (a == null) - (b == null) || (a - b));

        return largos;
    }

    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.producto);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }
        } catch (error) {
            console.error("Error al eliminar todos los productos:", error);
            throw error;
        }
    }

    async insertar(producto) {
        try {
            return await getBaseDao().insertar(producto);
        } catch (error) {
            console.error("Error al insertar producto:", error);
            throw error;
        }
    }



}
