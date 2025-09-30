import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { geocercaDocToDTO } from '@/app/mappers/geocercaMapper'

let instance = null;

export default class GeocercaDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.geocerca)
        return docs.map(geocercaDocToDTO)
    }


    async obtener(id) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.geocerca,
                id
            },
            limit: 1, // 👈 optimiza: solo un doc
        });

        const doc = res.docs[0] || null;
        return doc ? geocercaDocToDTO(doc) : null;
    }


    async obtenerPorPredio(rolPredio) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.geocerca,
                rolPredio: rolPredio   // 👈 filtra por rolPredio
            },
            limit: 1, // optimiza: solo un doc
        });

        const doc = res.docs[0] || null;
        return doc ? geocercaDocToDTO(doc) : null;
    }






    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.geocerca);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos las empresas:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(geocerca) {
        try {
            return await getBaseDao().insertar(geocerca);

        } catch (error) {
            console.error("Error al insertar geocerca:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}