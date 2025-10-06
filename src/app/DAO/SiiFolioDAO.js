import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
let instance = null;

export default class SiiFolioDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }

    async insertarUsuarioRangoFolio(rangoFolio) {
        try {

            return await getBaseDao().insertar({
                ...rangoFolio,
                type: config.bd.tipoEntidad.siiUsuarioRangoFolio,
            })
        } catch (error) {
            console.error("Error al crear usuario rango folio:", error);
            throw error; // Re-lanzar para manejo externo
        }
    }

    async insertarFolio(rangoFolio) {
        try {

            return await getBaseDao().insertar({
                ...rangoFolio,
                type: config.bd.tipoEntidad.folio,
            })
        } catch (error) {
            console.error("Error al crear folio:", error);
            throw error; // Re-lanzar para manejo externo
        }
    }


}
