import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { transportistaDocToDTO, transportistaSimpleDocToDTO, patenteDocToDTO, conductorDocToDTO } from '@/app/mappers/transportistaMapper'


let instance = null;

export default class TransportistaDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.transportista);

        // Map para evitar duplicados por rutTransportista
        const map = new Map();
        for (const d of docs) {
            const rut = String(d.rutTransportista ?? '').trim();
            if (!rut) continue;
            if (!map.has(rut)) {
                map.set(rut, d);
            }
        }

        // ahora aplicas tu mapper a los docs únicos
        return Array.from(map.values()).map(transportistaSimpleDocToDTO);
    }

    async listarPatentesPorTransportista(rutTransportista) {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.transportista);

        const rutIn = String(rutTransportista ?? '').trim();

        // filtra solo por el rutTransportista recibido
        const filtrados = docs.filter(
            d => String(d.rutTransportista ?? '').trim() === rutIn
        );

        // Map para evitar duplicados por patente (ej: patCamion)
        const map = new Map();
        for (const d of filtrados) {
            const key = String(d.patCamion ?? '').trim().toUpperCase();
            if (!key) continue;
            if (!map.has(key)) {
                map.set(key, d);
            }
        }

        // aplicas tu mapper a los docs únicos
        return Array.from(map.values()).map(patenteDocToDTO);
    }




    async listarPatentesCarroPorTransportistaCamion(rutTransportista, patCamion) {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.transportista);

        const norm = v => String(v ?? '').trim().toUpperCase();

        const rutIn = String(rutTransportista ?? '').trim();
        const patCamIn = norm(patCamion);


        // filtra por rut y camión, y descarta patCarro vacío
        const filtrados = docs.filter(d =>
            String(d.rutTransportista ?? '').trim() === rutIn &&
            norm(d.patCamion) === patCamIn &&
            norm(d.patCarro) !== ''
        );

        // distinct por patCarro
        const set = new Set(filtrados.map(d => norm(d.patCarro)));

        // array de strings ordenado
        return Array.from(set).sort();
    }



    async listarConductoresPorCamionYCarro(rutTransportista, patCamion, patCarro) {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.transportista);

        const norm = v => String(v ?? '').trim().toUpperCase();

        const rutIn = String(rutTransportista ?? '').trim();
        const camIn = norm(patCamion);
        const carroIn = norm(patCarro);

        // filtra por los tres parámetros
        const filtrados = docs.filter(d =>
            String(d.rutTransportista ?? '').trim() === rutIn &&
            norm(d.patCamion) === camIn &&
            norm(d.patCarro) === carroIn
        );

        // distinct por rutChofer
        const map = new Map();
        for (const d of filtrados) {
            const key = String(d.rutChofer ?? '').trim();
            if (!key) continue;
            if (!map.has(key)) {
                map.set(key, d);
            }
        }

        return Array.from(map.values()).map(conductorDocToDTO);
    }




    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.transportista);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos los TRANSPORTISTAS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(transportista) {
        try {
            return await getBaseDao().insertar(transportista);

        } catch (error) {
            console.error("Error al insertar TRANSPORTISTAS:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}