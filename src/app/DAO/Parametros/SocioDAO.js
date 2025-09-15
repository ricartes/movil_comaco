import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { socioDocToDTO } from '@/app/mappers/SocioMapper'

let instance = null;

export default class socioDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.socio)
        return docs.map(socioDocToDTO)
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.socio);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los SOCIOS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(socio) {
        try {
            return await getBaseDao().insertar(socio);

        } catch (error) {
            console.error("Error al insertar SOCIO:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}