import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { transportistaDocToDTO, transportistaSimpleDocToDTO, patenteDocToDTO } from '@/app/mappers/transportistaMapper'


let instance = null;

export default class TransportistaDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.transportista);

        // Map para evitar duplicados por rutTransportista
        const map = new Map();
        for (const d of docs) {
            const rut = String(d.rutTransportista ?? '').trim();
            if (!rut) continue;
            if (!map.has(rut)) {
                map.set(rut, d);
            }
        }

        // ahora aplicas tu mapper a los docs únicos
        return Array.from(map.values()).map(transportistaSimpleDocToDTO);
    }

    async listarPatentesPorTransportista(rutTransportista) {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.transportista);

        // Map para evitar duplicados por rutTransportista
        const map = new Map();
        for (const d of docs) {
            const rut = String(d.rutTransportista ?? '').trim();
            if (!rut) continue;
            if (!map.has(rut)) {
                map.set(rut, d);
            }
        }

        // ahora aplicas tu mapper a los docs únicos
        return Array.from(map.values()).map(patenteDocToDTO);
    }






    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.transportista);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los TRANSPORTISTAS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(transportista) {
        try {
            return await getBaseDao().insertar(transportista);

        } catch (error) {
            console.error("Error al insertar TRANSPORTISTAS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}