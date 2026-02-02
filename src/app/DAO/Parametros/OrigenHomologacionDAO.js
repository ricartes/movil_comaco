import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { origenHomologacionDocToDTO } from '@/app/mappers/OrigenHomologacionMapper'

let instance = null;

export default class OrigenHomologacionDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.origenHomologacion)
        return docs.map(origenHomologacionDocToDTO)
    }





    // ...existing code...
    async obtener(empId, id) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.origenHomologacion,
                id
            },
            limit: 1
        });
        if (docs.length === 0) {
            return null;
        }
        return origenConfiguracionDocToDTO(docs[0]);
    }


    async obtenerPorCodigoOrigenYForestalExterna(codOrigen, idForestalExterna) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.origenHomologacion,
                codOrigen,
                idForestalExterna
            },
            limit: 1
        });
        if (docs.length === 0) {
            return null;
        }
        return origenHomologacionDocToDTO(docs[0]);
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.origenHomologacion);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los orígenes de homologación:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(origenHomologacion) {
        try {
            return await getBaseDao().insertar(origenHomologacion);

        } catch (error) {
            console.error("Error al insertar origenHomologacion:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}