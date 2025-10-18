import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { largoProductoDocToDTO } from '@/app/mappers/LargoProductoMapper'

let instance = null;

export default class LargoProductoDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.largoProducto)
        return docs.map(largoProductoDocToDTO)
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.largoProducto);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los largos producto:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(largoProducto) {
        try {
            return await getBaseDao().insertar(largoProducto);

        } catch (error) {
            console.error("Error al insertar largo producto:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}