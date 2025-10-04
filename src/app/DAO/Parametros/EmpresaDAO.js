import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { empresaDocToDTO } from '@/app/mappers/empresaMapper'

let instance = null;

export default class EmpresaDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.empresa)
        return docs.map(empresaDocToDTO)
    }


    async obtener(id) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.empresa,
                id
            },
            limit: 1, // 👈 optimiza: solo un doc
        });


        const doc = res.docs[0] || null;
        return doc ? empresaDocToDTO(doc) : null;
    }




    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.empresa);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos las empresas:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(empresa) {
        try {
            return await getBaseDao().insertar(empresa);

        } catch (error) {
            console.error("Error al insertar empresa:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}