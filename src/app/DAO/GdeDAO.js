// src/app/dao/GdeDAO.js
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
    'zona.descripcion',
];

/** Helpers pequeños (sin lodash) **/
const MAX_RETRIES = 3;

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
        return await this.db.get(id); // doc completo
    }

    async listarPorEmpresaYRutPaginado(empId, rut, { limit = 20, skip = 0 } = {}) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.gde,
                empId: Number(empId),
                rutEmisor: String(rut),
            },
            // Asegúrate de tener un índice con estos campos si mantienes este sort
            sort: [{ type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' }, { createdAt: 'desc' }],
            limit,
            skip,
            fields: LIST_FIELDS,
            // use_index: 'idx_gde_empId_rut_createdAt'
        });
        return res.docs;
    }

    async listarPorEmpresaYRut(empId, rut) {
        return this.listarPorEmpresaYRutPaginado(empId, rut, {
            limit: Number.MAX_SAFE_INTEGER,
            skip: 0,
        });
    }

    async insertar(gde) {
        try {
            const gdeInsert = makeGdeDoc(gde);
            const res = await getBaseDao().insertar(gdeInsert);
            const doc = await this.db.get(res.id);
            return doc;
        } catch (error) {
            console.error("Error al insertar gde:", error);
            throw error;
        }
    }

    // === NUEVO: actualizar doc completo ===
    async actualizar(doc) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            try {
                return await this.db.put(doc);
            } catch (e) {
                if (e?.status === 409) {
                    // recarga y mergea; reintenta
                    const fresh = await this.db.get(doc._id);
                    doc = { ...fresh, ...doc, _rev: fresh._rev };
                    attempt++;
                    continue;
                }
                throw e;
            }
        }
        throw Object.assign(new Error('Document update conflict'), { status: 409 });
    }


    async eliminar(gde) {
        try {
            await getBaseDao().eliminar(gde);

        } catch (error) {
            console.error("Error al eliminar gde", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }


    // === NUEVO: actualizar campos superficiales (merge shallow) ===

    async updateCampos(id, patchObj) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            const doc = await this.db.get(id);
            Object.assign(doc, patchObj);
            try {
                return await this.db.put(doc);
            } catch (e) {
                if (e?.status === 409) {
                    attempt++;
                    continue;
                }
                throw e;
            }
        }
        throw Object.assign(new Error('Document update conflict'), { status: 409 });
    }
    // === NUEVO: actualizar por path "a.b.c" ===
    async updateByPath(id, path, value) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            const doc = await this.db.get(id);
            setByPath(doc, path, value);
            try {
                return await this.db.put(doc);
            } catch (e) {
                if (e?.status === 409) {
                    attempt++;
                    continue;
                }
                throw e;
            }
        }
        throw Object.assign(new Error('Document update conflict'), { status: 409 });
    }
}



function setByPath(obj, path, val) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
        cur = cur[k];
    }
    cur[keys[keys.length - 1]] = val;
}
