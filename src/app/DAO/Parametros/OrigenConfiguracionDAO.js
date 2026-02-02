import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { origenConfiguracionDocToDTO } from '@/app/mappers/OrigenConfiguracionMapper'

let instance = null;

export default class OrigenConfiguracionDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.origenConfiguracion)
        return docs.map(origenConfiguracionDocToDTO)
    }





    // ...existing code...
    async obtener(empId, id) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.origenConfiguracion,
                id
            },
            limit: 1
        });
        if (docs.length === 0) {
            return null;
        }
        return origenConfiguracionDocToDTO(docs[0]);
    }


    async obtenerPorCodigoOrigen(codOrigen) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.origenConfiguracion,
                codOrigen
            },
            limit: 1
        });
        if (docs.length === 0) {
            return null;
        }
        return origenConfiguracionDocToDTO(docs[0]);
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.origenConfiguracion);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los orígenes de configuración:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(origenConfiguracion) {
        try {
            return await getBaseDao().insertar(origenConfiguracion);

        } catch (error) {
            console.error("Error al insertar origenConfiguracion:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}