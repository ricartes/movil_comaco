import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { motivoAnulacionlDocToDTO } from '@/app/mappers/MotivoAnulacionMapper'

let instance = null;

export default class MotivoAnulacionDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.motivoAnulacion)
        return docs.map(motivoAnulacionlDocToDTO)
    }


    async listarPorEmpresa(empId) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.motivoAnulacion,
                empId: Number(empId)
            },
        })
        return res.docs
            .map(motivoAnulacionlDocToDTO);
    }



    // ...existing code...
    async obtener(empId, id) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.motivoAnulacion,
                empId,
                id
            },
            limit: 1
        });
        if (docs.length === 0) {
            return null;
        }
        return motivoAnulacionlDocToDTO(docs[0]);
    }


    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.motivoAnulacion);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los motivos de anulación:", error);
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