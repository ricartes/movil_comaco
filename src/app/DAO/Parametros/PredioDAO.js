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
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor,
                rolPredio: { $ne: null }
            }
        });

        const map = new Map();

        for (const d of res.docs) {
            const rol = String(d.rolPredio ?? '').trim();
            if (!rol) continue;
            if (!map.has(rol)) {
                map.set(rol, d); // guardamos el primer doc de ese rolPredio
            }
        }

        return Array.from(map.values())
            .sort((a, b) => {
                const nA = (a.predio || '').toLowerCase();
                const nB = (b.predio || '').toLowerCase();
                return nA.localeCompare(nB, 'es', { sensitivity: 'base' });
            })
            .map(predioDocToDTO);
    }


}