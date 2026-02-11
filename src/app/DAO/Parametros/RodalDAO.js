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

    async listarPorOrigen(codOrigen) {

        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.rodal);
        // filtra solo por codOrigen
        const filtrados = docs.filter(d => String(d.codOrigen ?? '').trim() === String(codOrigen ?? '').trim());



        // distinct por codRodal
        const map = new Map();
        for (const d of filtrados) {
            const key = String(d.codrodal ?? '').trim();
            if (!key) continue;
            if (!map.has(key)) map.set(key, d);
        }

        return Array.from(map.values()).map(rodalDocToDTO);
    }


    async obtenerPorOrigen(codOrigen) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.rodal,
                codOrigen
            },
            limit: 1
        });

        if (docs.length === 0) {
            return null;
        }

        return rodalDocToDTO(docs[0]);

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