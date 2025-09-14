import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { empresaContratistaDocToDTO } from '@/app/mappers/empresaContratistaMapper'

let instance = null;

export default class EmpresaContratistaDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.empresaContratista)
        return docs.map(empresaContratistaDocToDTO)
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.empresaContratista);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos las empresaContratistas:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(empresaContratista) {
        try {
            return await getBaseDao().insertar(empresaContratista);

        } catch (error) {
            console.error("Error al insertar empresaContratista:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}