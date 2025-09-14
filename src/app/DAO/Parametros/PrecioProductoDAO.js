import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { precioDocToDTO } from '@/app/mappers/PrecioProductoMapper'

let instance = null;

export default class PrecioProductoDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.precio)
        return docs.map(precioDocToDTO)
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.precio);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los precioS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(precio) {
        try {
            return await getBaseDao().insertar(precio);

        } catch (error) {
            console.error("Error al insertar precio:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}