import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { OrdenCompraDTO } from "@/app/DTO/Parametros/OrdenCompraDTO";
let instance = null;

export default class OrdenCompraDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenCompra);
        return data.map(dato => new OrdenCompraDTO(dato.id, dato.nombre));
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.ordenCompra);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los OC:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(ordenCompra) {
        try {
            return await getBaseDao().insertar(ordenCompra);

        } catch (error) {
            console.error("Error al insertar OC:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}