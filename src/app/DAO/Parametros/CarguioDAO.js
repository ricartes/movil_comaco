import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { carguioDocToDTO } from '@/app/mappers/carguioMapper'

let instance = null;

export default class CarguioDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.carguio)
        return docs.map(carguioDocToDTO)
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.carguio);
            for (const item of data) {
                console.log(item);
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos las carguios:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(carguio) {
        try {
            return await getBaseDao().insertar(carguio);

        } catch (error) {
            console.error("Error al insertar carguio:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}