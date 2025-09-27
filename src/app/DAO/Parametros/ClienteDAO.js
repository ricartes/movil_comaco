import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { clienteDocToDTO, destinoClienteDocToDTO } from '@/app/mappers/ClienteMapper'

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
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor,
                rolPredio
            },
            use_index: 'idx_oc_zona_prov_predio_cli',
        });

        const map = new Map();
        for (const d of res.docs) {
            const rut = String(d.rutCliente ?? '').trim();
            if (!rut) continue;
            if (!map.has(rut)) {
                map.set(rut, d); // primer doc por rutCliente
            }
        }

        return Array.from(map.values())
            .sort((a, b) => {
                const nA = (a.razonSocialCliente || '').toLowerCase();
                const nB = (b.razonSocialCliente || '').toLowerCase();
                return nA.localeCompare(nB, 'es', { sensitivity: 'base' });
            })
            .map(clienteDocToDTO);
    }



    async listarDestinosPorCliente(codEncargado, rutProveedor, rolPredio, rutCliente) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor,
                rolPredio,
                rutCliente
            },
            use_index: 'idx_oc_zona_prov_predio_cli',
        });

        const map = new Map();
        for (const d of res.docs) {
            const destino = String(d.destinoCliente ?? '').trim();
            if (!destino) continue;
            if (!map.has(destino)) {
                map.set(destino, d);
            }
        }

        return Array.from(map.values()).map(destinoClienteDocToDTO);
    }


}