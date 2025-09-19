import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { proveedorDocToDTO } from '@/app/mappers/proveedorMapper'

let instance = null;

export default class proveedorDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenCompra)
        return docs.map(proveedorDocToDTO)
    }


    // ProveedorService.js
    async listarPorZona(codEncargado) {
        // índice opcional pero recomendado
        await this.db.createIndex({
            index: { fields: ['type', 'codEncargado', 'rutProveedor'] }
        });

        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                rutProveedor: { $ne: null }
            }
        });

        // distinct por rutProveedor
        const map = new Map();
        for (const d of res.docs) {
            const rut = String(d.rutProveedor ?? '').trim();
            if (!rut) continue;              // evita vacíos
            if (!map.has(rut)) {
                map.set(rut, d);               // guarda el primer doc de ese rut
            }
        }

        return Array.from(map.values()).map(proveedorDocToDTO);
    }


}