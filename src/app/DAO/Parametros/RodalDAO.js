import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { rodalDocToDTO } from '@/app/mappers/rodalMapper'

let instance = null;

export default class RodalDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.rodal)
        return docs.map(rodalDocToDTO)
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.rodal);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos las rodals:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(rodal) {
        try {
            return await getBaseDao().insertar(rodal);

        } catch (error) {
            console.error("Error al insertar rodal:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}