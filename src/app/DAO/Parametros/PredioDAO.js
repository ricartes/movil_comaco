import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { predioDocToDTO } from '@/app/mappers/predioMapper'

let instance = null;

export default class PredioDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenCompra)
        return docs.map(predioDocToDTO)
    }


    // PredioService.js
    async listarPorProveedor(codEncargado, rutProveedor) {
        // (opcional pero recomendado) asegura índice para estos campos


        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor,
                // solo con rutPredio != null y != "" (evita nulos/vacíos)
                rolPredio: { $ne: null }
            },
            // si quieres excluir strings vacíos explícitamente:
            // use_index: 'idx-type-codEncargado-rutPredio'
        });

        return res.docs
            .filter(d => String(d.rolPredio || '').trim() !== '')
            .map(predioDocToDTO);
    }

}