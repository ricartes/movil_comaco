import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { zonaDocToDTO } from '@/app/mappers/zonaMapper'

let instance = null;

export default class ZonaDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.zona);

        return docs
            .sort((a, b) => {
                const descA = (a.descripcion || '').toLowerCase();
                const descB = (b.descripcion || '').toLowerCase();
                return descA.localeCompare(descB);
            })
            .map(zonaDocToDTO);
    }


    async listarPorEmpresa(empId) {

        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.zona,
                empId: Number(empId)                // ⬅️ empId aquí

            },
        })
        return res.docs
            .sort((a, b) => {
                const descA = (a.descripcion || '').toLowerCase();
                const descB = (b.descripcion || '').toLowerCase();
                return descA.localeCompare(descB);
            })
            .map(zonaDocToDTO);
    }


    async obtener(codigo, empId) {

        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.zona,
                empId: Number(empId),
                codigo: String(codigo)
            },
        })
        return zonaDocToDTO(res.docs[0] || null);
    }


    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.zona);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los zonaS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(zona) {
        try {
            return await getBaseDao().insertar(zona);

        } catch (error) {
            console.error("Error al insertar zonaS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}