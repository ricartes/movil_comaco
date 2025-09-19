import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { gdeDocToDTO, makeGdeDoc } from '@/app/mappers/gdeMapper'

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
                rutEmisor: rut,
                empId: Number(empId),
            },
            use_index: 'idx_gde_empId_rut',
        })
        return res.docs;
    }

    async listarPorEmpresaYRutPaginado(empId, rut, { limit = 20, skip = 0 } = {}) {
        const res = await this.db.find({
            selector: { type: 'gde' },
            use_index: 'idx_gde_empId_rut',
            limit,
            skip,
            sort: undefined, // (con mango, sólo puedes sort si fields están indexados)
        })
        console.log(res);
        return res.docs;
    }


    async insertar(gde) {
        try {

            

            const gdeInsert = makeGdeDoc(gde);
            console.log(gdeInsert);
            return await getBaseDao().insertar(gdeInsert);

        } catch (error) {
            console.error("Error al insertar gde:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}