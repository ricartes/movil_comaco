import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { gdeDocToDTO } from '@/app/mappers/gdeMapper'

let instance = null;

export default class GdeDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.gde)
        return docs.map(gdeDocToDTO)
    }

    async listarPorEmpresaYRut(empId, rut) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.gde,
                empId: Number(empId),                  // ⬅️ empId aquí
                codDespachador: String(rut),
            },
            use_index: 'idx_gde_empId_rut',
        })
        return res.docs.map(gdeDocToDTO)
    }

    async listarPorEmpresaYRutPaginado(empId, rut, { limit = 20, skip = 0 } = {}) {
        const res = await this.db.find({
            selector: { type: 'gde', empId: Number(empId), codDespachador: String(rut) },
            use_index: 'idx_gde_empId_rut',
            limit,
            skip,
            sort: undefined, // (con mango, sólo puedes sort si fields están indexados)
        })
        return res.docs.map(gdeDocToDTO)
    }


    async insertar(gde) {
        try {
            return await getBaseDao().insertar(gde);

        } catch (error) {
            console.error("Error al insertar gde:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}