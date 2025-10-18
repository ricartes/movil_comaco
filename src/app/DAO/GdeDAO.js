// src/app/dao/GdeDAO.js
import config from "@/Common/json/config.json";
import { getBaseDao } from "@/app/services/initServices";
import { gdeDocToDTO, makeGdeDoc } from '@/app/mappers/gdeMapper';

let instance = null;

const LIST_FIELDS = [
    '_id',
    'empId',
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

const RESUMEN_FIELDS = [
    '_id',
    'empId',
    'folio',
    'createdAt',
    'estado.id',
    'producto.unidadMedida',
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

    // Ej: params = {
    //   limit: 20, skip: 0,
    //   estados: ['E','M'],        // ids en mayúscula idealmente
    //   folio: '32539',            // opcional
    //   desde: '2025-01-01T00:00:00.000Z', // opcional
    //   hasta: '2025-01-31T23:59:59.999Z'  // opcional
    // }
    async listarPorEmpresaYRutPaginado(
        empId,
        rut,
        { limit = 20, skip = 0, estados, folio, desde, hasta } = {}
    ) {
        const selector = {
            type: config.bd.tipoEntidad.gde,
            empId: Number(empId),
            rutEmisor: String(rut),
        };

        const estadosArr = Array.isArray(estados) ? estados.map(s => String(s).toUpperCase()) : [];
        const filtra1Estado = estadosArr.length === 1;
        const filtraVariosEstados = estadosArr.length > 1;

        // SOLO 1 estado -> igualdad (aprovecha índice)
        if (filtra1Estado) {
            selector['estado.id'] = estadosArr[0];
        }

        if (folio != null && String(folio).trim() !== '') {
            const n = Number(folio);
            selector.folio = Number.isFinite(n) ? n : String(folio).trim();
        }

        if (desde || hasta) {
            selector.createdAt = {};
            if (desde) selector.createdAt.$gte = new Date(desde).toISOString();
            if (hasta) selector.createdAt.$lte = new Date(hasta).toISOString();
        }

        // Elegir índice/sort compatibles con el selector armado
        let use_index, sort;
        if (filtra1Estado && selector.folio != null) {
            use_index = 'idx_gde_emp_rut_estado_folio_createdAt';
            sort = [
                { type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' },
                { 'estado.id': 'asc' }, { folio: 'asc' }, { createdAt: 'desc' },
            ];
        } else if (filtra1Estado) {
            use_index = 'idx_gde_emp_rut_estado_createdAt';
            sort = [
                { type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' },
                { 'estado.id': 'asc' }, { createdAt: 'desc' },
            ];
        } else if (selector.folio != null) {
            use_index = 'idx_gde_emp_rut_folio_createdAt';
            sort = [
                { type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' },
                { folio: 'asc' }, { createdAt: 'desc' },
            ];
        } else {
            use_index = 'idx_gde_emp_rut_createdAt';
            sort = [
                { type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' }, { createdAt: 'desc' },
            ];
        }

        try {
            const res = await this.db.find({
                selector,
                sort,
                limit,
                skip,
                fields: LIST_FIELDS,
                use_index,
            });
            // OJO: si el usuario seleccionó varios estados, acá NO filtramos por estado;
            // dejamos que lo haga el cliente con applyClientFilters (OR).
            return res.docs;
        } catch (e) {
            console.warn('find con índice falló, reintento sin sort:', e?.message);
            const res = await this.db.find({
                selector,
                limit,
                skip,
                fields: LIST_FIELDS,
                use_index, // puedes omitir si sigue molestando
            });
            return (res.docs || []).sort(
                (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
            );
        }
    }


    async *iterarParaResumen(empId, rut, {
        estados,        // ['E','N'] u otros. 1 estado usa índice; varios se filtran cliente
        desde,          // ISO
        hasta,          // ISO
        pageSize = 200, // tamaño de bloque
    } = {}) {
        const selectorBase = {
            type: config.bd.tipoEntidad.gde,
            empId: Number(empId),
            rutEmisor: String(rut),
        };

        const estadosArr = Array.isArray(estados) ? estados.map(s => String(s).toUpperCase()) : [];
        const filtra1Estado = estadosArr.length === 1;

        // Fechas (rango)
        if (desde || hasta) {
            selectorBase.createdAt = {};
            if (desde) selectorBase.createdAt.$gte = new Date(desde).toISOString();
            if (hasta) selectorBase.createdAt.$lte = new Date(hasta).toISOString();
        }

        // Si hay 1 estado, index por estado+fecha
        let use_index, sort;
        if (filtra1Estado) {
            selectorBase['estado.id'] = estadosArr[0];
            use_index = 'idx_gde_emp_rut_estado_createdAt';
            sort = [
                { type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' },
                { 'estado.id': 'asc' }, { createdAt: 'desc' },
            ];
        } else {
            use_index = 'idx_gde_emp_rut_createdAt';
            sort = [
                { type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' },
                { createdAt: 'desc' },
            ];
        }

        let lastCreatedAt = null;
        while (true) {
            const selector = { ...selectorBase };
            if (lastCreatedAt) {
                // Cursor: continuar por debajo del último createdAt devuelto
                selector.createdAt = selector.createdAt || {};
                selector.createdAt.$lt = lastCreatedAt;
            }

            const res = await this.db.find({
                selector,
                sort,
                limit: pageSize,
                fields: RESUMEN_FIELDS,
                use_index,
            });

            const docs = res.docs || [];
            if (!docs.length) break;

            // Si el usuario pidió varios estados, filtramos en cliente (OR)
            const filtered = estadosArr.length > 1
                ? docs.filter(d => estadosArr.includes(String(d?.estado?.id || '').toUpperCase()))
                : docs;

            yield filtered;

            // Avanza el cursor
            lastCreatedAt = docs[docs.length - 1]?.createdAt;
            if (!lastCreatedAt) break;
        }
    }

    /**
     * Últimas N (por createdAt desc), con mínimos campos.
     */
    async listarUltimas(empId, rut, { limit = 10, estados } = {}) {
        const selector = {
            type: config.bd.tipoEntidad.gde,
            empId: Number(empId),
            rutEmisor: String(rut),
        };

        const estadosArr = Array.isArray(estados) ? estados.map(s => String(s).toUpperCase()) : [];
        const filtra1Estado = estadosArr.length === 1;
        if (filtra1Estado) selector['estado.id'] = estadosArr[0];

        const use_index = filtra1Estado
            ? 'idx_gde_emp_rut_estado_createdAt'
            : 'idx_gde_emp_rut_createdAt';

        const sort = filtra1Estado
            ? [
                { type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' },
                { 'estado.id': 'asc' }, { createdAt: 'desc' },
            ]
            : [
                { type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' },
                { createdAt: 'desc' },
            ];

        const res = await this.db.find({
            selector,
            sort,
            limit,
            fields: RESUMEN_FIELDS,
            use_index,
        });

        const docs = res.docs || [];
        const filtered = estadosArr.length > 1
            ? docs.filter(d => estadosArr.includes(String(d?.estado?.id || '').toUpperCase()))
            : docs;

        return filtered;
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
                const putResult = await this.db.put(doc);
                // Obtener doc actualizado después del put
                const updatedDoc = await this.db.get(putResult.id);
                return updatedDoc;
            } catch (e) {
                if (e?.status === 409) {
                    // Recarga y mergea; reintenta
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
