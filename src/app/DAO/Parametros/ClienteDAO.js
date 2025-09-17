import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { clienteDocToDTO } from '@/app/mappers/ClienteMapper'

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
        return docs.map(clienteDocToDTO)
    }


    // PredioService.js
    async listarPorPredio(codEncargado, rutProveedor, rolPredio) {
        // (opcional pero recomendado) asegura índice para estos campos


        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor,
                rolPredio,
                // solo con rutPredio != null y != "" (evita nulos/vacíos)
                rutCliente: { $ne: null }
            },
            // si quieres excluir strings vacíos explícitamente:
            // use_index: 'idx-type-codEncargado-rutPredio'
        });

        return res.docs
            .filter(d => String(d.rutCliente || '').trim() !== '')
            .map(clienteDocToDTO);
    }

}