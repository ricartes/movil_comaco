import config from "@/Common/json/config.json"
import { getBaseDao } from "@/app/services/initServices";
import { empresaContratistaDocToDTO, empresaContratistaSimpleDocToDTO, lineaContratistaDocToDTO } from '@/app/mappers/empresaContratistaMapper'

let instance = null;

export default class EmpresaContratistaDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.empresaContratista)
        return docs.map(empresaContratistaDocToDTO)
    }


    async listarPorOrigen(rolPredio) {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.empresaContratista);

        // filtra solo por codOrigen
        const filtrados = docs.filter(d => String(d.rolPredio ?? '').trim() === String(rolPredio ?? '').trim());


        const map = new Map();
        for (const d of docs) { //TODO: CAMBIAR A filtrados
            const key = String(d.rutContratista ?? '').trim();
            if (!key) continue;
            if (!map.has(key)) map.set(key, d);
        }
        return Array.from(map.values()).map(empresaContratistaSimpleDocToDTO);
    }


    async listarLineasPorOrigenYEmpresaContratista(rolPredio, rutContratista) {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.empresaContratista);

        const rolIn = String(rolPredio ?? '').trim();
        const rutIn = String(rutContratista ?? '').trim();

        // filtrar por rolPredio y rutContratista
        const filtrados = docs.filter(
            d =>
                String(d.rolPredio ?? '').trim() === rolIn &&
                String(d.rutContratista ?? '').trim() === rutIn
        );

        // distinct por codLinea
        const map = new Map();
        for (const d of docs) {
            const key = String(d.codLinea ?? '').trim();
            if (!key) continue;
            if (!map.has(key)) map.set(key, d);
        }

        return Array.from(map.values()).map(lineaContratistaDocToDTO);
    }



    async eliminarTodos() {
        try {
            const data = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.empresaContratista);
            for (const item of data) {
                await getBaseDao().eliminar(item);
            }

        } catch (error) {
            console.error("Error al eliminar todos las empresaContratistas:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    async insertar(empresaContratista) {
        try {
            return await getBaseDao().insertar(empresaContratista);

        } catch (error) {
            console.error("Error al insertar empresaContratista:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }
}