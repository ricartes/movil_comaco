import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { productoDocToDTO } from '@/app/mappers/ProductoMapper'

let instance = null;

export default class PredioDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenCompra)
        return docs.map(predioDocToDTO)
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


    async listarLargosPorProducto(codEncargado, rutProveedor, rolPredio, rutCliente, destinoCliente, codProducto) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor,
                rolPredio,
                rutCliente,
                destinoCliente,
                codProducto
            }
        });

        // distinct por largoTrozo (considera null como “sin largo”)
        const set = new Set();
        for (const d of docs) {
            // normaliza a string para dedupe estable
            const key = d.largoTrozo == null ? 'NULL' : String(d.largoTrozo);
            set.add(key);
        }

        // Devuelve números (o null) ordenados
        const largos = Array.from(set).map(k => (k === 'NULL' ? null : Number(k)));
        // Opcional: ordena colocando null al final
        largos.sort((a, b) => (a == null) - (b == null) || (a - b));

        return largos;
    }



}