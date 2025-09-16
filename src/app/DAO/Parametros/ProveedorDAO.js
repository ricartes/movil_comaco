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
        // (opcional pero recomendado) asegura índice para estos campos
        await this.db.createIndex({
            index: { fields: ['type', 'codEncargado', 'rutProveedor'] }
        });

        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.ordenCompra,
                codEncargado,
                // solo con rutProveedor != null y != "" (evita nulos/vacíos)
                rutProveedor: { $ne: null }
            },
            // si quieres excluir strings vacíos explícitamente:
            // use_index: 'idx-type-codEncargado-rutProveedor'
        });

        return res.docs
            .filter(d => String(d.rutProveedor || '').trim() !== '')
            .map(proveedorDocToDTO);
    }

}