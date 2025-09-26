import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
let instance = null;

export default class TrazabilidadDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }

    async insertar(trazabilidad) {
        try {

            return await getBaseDao().insertar({
                ...trazabilidad,
                type: config.bd.tipoEntidad.trazabilidad,    // 🔑 siempre marcamos el tipo
            })
        } catch (error) {
            console.error("Error al crear trazabilidad:", error);
            throw error; // Re-lanzar para manejo externo
        }
    }


}
