import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { ordenVentaDocToDTO } from '@/app/mappers/ordenVentaMapper'

let instance = null;

export default class OrdenVentaDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenVenta)
        return docs.map(ordenVentaDocToDTO)
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenVenta);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los OV:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(ordenVenta) {
        try {
            return await getBaseDao().insertar(ordenVenta);

        } catch (error) {
            console.error("Error al insertar OV:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}