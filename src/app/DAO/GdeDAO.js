// GdeDAO.js
import config from "@/Common/json/config.json";
import { getBaseDao } from "@/app/services/initServices";
import { gdeDocToDTO, makeGdeDoc } from '@/app/mappers/gdeMapper';

let instance = null;

const LIST_FIELDS = [
    '_id',
    'folio',
    'createdAt',
    'estado.id',
    'estado.texto',
    'producto.unidadMedida',
    'producto.nombreProducto',
    'largoProducto',
    'cliente.razonSocialCliente',
    'predio.predio',
    'destino.destinoCliente',
    'transportista.nomTransportista',
    'patenteCamion.patCamion',
    'patenteCarro',
    'totales.mr.volumen',
    'totales.m3.volumen',
    'totales.ton.volumen',
    'zona.descripcion'
];

export default class GdeDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }

    async listar() {
        const docs = await getBaseDao().listarPorTipo(config.bd.tipoEntidad.gde);
        return docs.map(gdeDocToDTO);
    }

    async obtener(id) {
        const doc = await this.db.get(id);
        return doc; // doc completo
    }

    async listarPorEmpresaYRutPaginado(empId, rut, { limit = 20, skip = 0 } = {}) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.gde,
                empId: Number(empId),
                rutEmisor: String(rut)
            },
            sort: [
                { type: 'asc' },
                { empId: 'asc' },
                { rutEmisor: 'asc' },
                { createdAt: 'desc' }
            ],
            limit,
            skip,
            fields: LIST_FIELDS
            // use_index: 'idx_gde_empId_rut_createdAt' // si lo nombraste
        });
        return res.docs;
    }

    async listarPorEmpresaYRut(empId, rut) {
        // versión NO paginada (usa el mismo método con limit grande)
        return this.listarPorEmpresaYRutPaginado(empId, rut, {
            limit: Number.MAX_SAFE_INTEGER,
            skip: 0
        });
    }

    async insertar(gde) {
        try {
            const gdeInsert = makeGdeDoc(gde);
            const res = await getBaseDao().insertar(gdeInsert); // 👈 usar gdeInsert
            const doc = await this.db.get(res.id);
            return doc; // retorna completo con _id y _rev
        } catch (error) {
            console.error("Error al insertar gde:", error);
            throw error;
        }
    }
}
