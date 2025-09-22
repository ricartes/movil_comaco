import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { precioDocToDTO } from '@/app/mappers/PrecioProductoMapper'

let instance = null;

export default class PrecioProductoDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.precio)
        return docs.map(precioDocToDTO)
    }



    async obtenerPorProductoVigente(empId, codProducto, rutCliente) {
        const hoy = new Date().toISOString().slice(0, 10); // Formato 'YYYY-MM-DD'
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.precio,
                empresaId: empId,
                "cliente.rut": rutCliente,
                codigoProducto: codProducto,
                fechaInicial: { "$lte": hoy }, //preguntar si se incluyenb las fechas
                fechaFinal: { "$gte": hoy }
            },
            limit: 1
        });

        if (docs.length === 0) {
            return null; // No se encontró ningún precio vigente
        }
        return precioDocToDTO(docs[0]); // Retorna el primer documento mapeado a DTO
    }


    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.precio);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los precioS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(precio) {
        try {
            return await getBaseDao().insertar(precio);

        } catch (error) {
            console.error("Error al insertar precio:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}