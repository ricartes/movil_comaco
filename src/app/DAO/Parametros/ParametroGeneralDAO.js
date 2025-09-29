import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { parametroGeneralDocToDTO } from '@/app/mappers/parametroGeneralMapper'

let instance = null;

export default class ParametroGeneralDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.parametroGeneral)
        return docs.map(parametroGeneralDocToDTO)
    }


    async listarPorEmpresa(empId) {

        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.parametroGeneral,
                empId: Number(empId)
            },
        })
        return res.docs
            .map(parametroGeneralDocToDTO);
    }



    // ...existing code...
    async obtener(empId, id) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.parametroGeneral,
                empId,
                id
            },
            limit: 1
        });
        if (docs.length === 0) {
            return null;
        }
        return parametroGeneralDocToDTO(docs[0]);
    }


    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.parametroGeneral);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos las parametroGeneral:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(parametroGeneral) {
        try {
            return await getBaseDao().insertar(parametroGeneral);

        } catch (error) {
            console.error("Error al insertar parametroGeneral:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}