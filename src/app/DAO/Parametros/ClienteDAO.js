import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import {
    clienteDocToDTO,
    destinoClienteDocToDTO,
    destinoClienteCanchaDocToDTO,
} from '@/app/mappers/ClienteMapper'

let instance = null;

export default class ClienteDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }

    async listar() {
        const res = await this.db.find({
            selector: { type: config.bd.tipoEntidad.ordenCompra },
        });

        const map = new Map();

        for (const d of res.docs) {
            const rut = String(d.rutCliente ?? '').trim();
            if (!rut) continue;
            if (!map.has(rut)) map.set(rut, d);
        }

        return Array.from(map.values())
            .sort((a, b) => {
                const nA = (a.razonSocialCliente || '').toLowerCase();
                const nB = (b.razonSocialCliente || '').toLowerCase();
                return nA.localeCompare(nB, 'es', { sensitivity: 'base' });
            })
            .map(clienteDocToDTO);
    }

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
                map.set(rut, d);
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

        const destinos = Array.from(map.values()).map(destinoClienteDocToDTO);
        return destinos;
    }

    async listarParametrosCliente() {
        const clientes = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.cliente);

        return clientes
            .sort((a, b) => {
                const nA = (a.razonSocialCliente || '').toLowerCase();
                const nB = (b.razonSocialCliente || '').toLowerCase();
                return nA.localeCompare(nB, 'es', { sensitivity: 'base' });
            })
            .map(clienteDocToDTO);
    }

    async listarParametrosDestinoPorCliente(rutCliente) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.clienteDestino,
                rutCliente
            },
        });

        return res.docs
            .sort((a, b) => {
                const nA = (a.nombreDestino || a.destinoCliente || '').toLowerCase();
                const nB = (b.nombreDestino || b.destinoCliente || '').toLowerCase();
                return nA.localeCompare(nB, 'es', { sensitivity: 'base' });
            })
            .map(destinoClienteDocToDTO);
    }

    async listarParametrosCanchaPorDestino(rutCliente, destinoCliente) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.clienteDestinoCancha,
                rutCliente,
                destinoCliente
            },
        });

        return res.docs
            .sort((a, b) => {
                const nA = (a.nombreCancha || '').toLowerCase();
                const nB = (b.nombreCancha || '').toLowerCase();
                return nA.localeCompare(nB, 'es', { sensitivity: 'base' });
            })
            .map(destinoClienteCanchaDocToDTO);
    }

    async eliminarParametrosCliente() {
        await this.eliminarPorTipo(config.bd.tipoEntidad.cliente);
        await this.eliminarPorTipo(config.bd.tipoEntidad.clienteDestino);
        await this.eliminarPorTipo(config.bd.tipoEntidad.clienteDestinoCancha);
    }

    async eliminarPorTipo(tipo) {
        const docs = await getBaseDao().listarPorTipo(tipo);
        for (const item of docs) {
            await getBaseDao().eliminar(item);
        }
    }

    async insertar(doc) {
        return await getBaseDao().insertar(doc);
    }

    async insertarMasivo(docs = []) {
        if (!docs.length) return [];
        return await this.db.bulkDocs(docs);
    }
}
