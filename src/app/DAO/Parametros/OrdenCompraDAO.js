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
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenCompra);
        return docs.map(ocDocToDTO)
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