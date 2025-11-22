// src/app/dao/GdeDAO.js
import config from "@/Common/json/config.json";
import { getBaseDao } from "@/app/services/initServices";
import { gdeDocToDTO } from '@/app/mappers/gdeMapper';
import { dayRangeLocalString } from "@/app/helpers/FechasHelpers";


function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

// chequea que existan los padres de cada path (lo que suele romper "fields" en pouchdb-find)
function validateRequiredParents(doc, dottedPaths) {
    const problems = [];
    for (const p of dottedPaths) {
        const parts = p.split('.');
        if (parts.length === 1) continue; // campos planos no dan problema
        // verificar cada prefijo padre: a, a.b, ...
        for (let i = 1; i < parts.length; i++) {
            const parentPath = parts.slice(0, i).join('.');
            const v = getPath(doc, parentPath);
            if (v == null || (typeof v === 'object' && v !== null && Array.isArray(v))) {
                // v == null → no existe el objeto padre
                // (no solemos permitir array donde esperamos objeto plano)
                problems.push({ path: p, missingParent: parentPath, valueAtParent: v });
                break; // no sigas con hijos, ya falló el padre
            }
        }
    }
    return problems;
}


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

// SOLO top-level (sin “a.b.c”)
const SAFE_LIST_FIELDS = [
    '_id', 'empId', 'folio', 'createdAt',
    'estado', 'producto', 'largoProducto',
    'cliente', 'predio', 'destino',
    'transportista', 'patenteCamion', 'patenteCarro',
    'totales', 'zona',
];


const RESUMEN_FIELDS = [
    '_id',
    'type',
    'empId',
    'rutEmisor',
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
        return await getBaseDao().obtener(id);
    }


    /**
  * Lista por RANGO usando fechaEmision (strings 'YYYY-MM-DDTHH:mm:SS')
  * opts: { desde?: string|Date, hasta?: string|Date, limit?, skip? }
  */
    async listarPorRangoFechaEmision(empId, rut, { desde, hasta, limit = 1000, skip = 0 } = {}) {
        const EG = config?.parametros?.estadosGuia;
        if (!EG?.EMITIDA?.id || !EG?.NULA?.id) {
            throw new Error('Config de estadosGuia inválida o incompleta');
        }

        // normaliza a 'YYYY-MM-DDTHH:mm:SS' si te pasan Date
        const norm = (v) => {
            if (!v) return null;
            if (typeof v === 'string') return v.length === 19 ? v : new Date(v).toISOString().slice(0, 19);
            return new Date(v).toISOString().slice(0, 19);
        };

        const sel = {
            type: config.bd.tipoEntidad.gde,
            empId: Number(empId),
            rutEmisor: String(rut),
            'estado.id': { $in: [EG.EMITIDA.id, EG.NULA.id, 'E'] },
        };

        const gte = norm(desde);
        const lte = norm(hasta);


        if (gte || lte) {
            sel.fechaEmision = {};
            if (gte) sel.fechaEmision.$gte = gte;
            if (lte) sel.fechaEmision.$lte = lte;
        }

        // Regla Mango: si ordenas por fechaEmision, inclúyelo en selector:
        if (!sel.fechaEmision) sel.fechaEmision = { $gte: '' };

        const use_index = 'idx_gde_emp_rut_estado_fechaEmision_id';
        const sort = [
            { type: 'asc' },
            { empId: 'asc' },
            { rutEmisor: 'asc' },
            { 'estado.id': 'asc' },
            { fechaEmision: 'asc' },
            { _id: 'asc' },
        ];

        const res = await this.db.find({ selector: sel, sort, use_index, limit, skip });
        const docs = (res.docs || []).sort((a, b) => {
            const c = (b.fechaEmision || '').localeCompare(a.fechaEmision || '');
            return c !== 0 ? c : (b._id || '').localeCompare(a._id || '');
        });

        return docs;
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

        // ----- filtros de estado -----
        const estadosArr = Array.isArray(estados)
            ? estados.map((s) => String(s).toUpperCase())
            : [];
        const filtra1Estado = estadosArr.length === 1;

        if (filtra1Estado) {
            selector["estado.id"] = estadosArr[0];
        } else if (estadosArr.length > 1) {
            selector["estado.id"] = { $in: estadosArr };
        }

        // ----- filtro de folio -----
        const hasFolio = folio != null && String(folio).trim() !== "";
        if (hasFolio) {
            const n = Number(folio);
            selector.folio = Number.isFinite(n) ? n : String(folio).trim();
        }

        // ----- filtro de fechas (createdAt) -----
        if (desde || hasta) {
            selector.createdAt = {};
            if (desde) selector.createdAt.$gte = new Date(desde).toISOString();
            if (hasta) selector.createdAt.$lte = new Date(hasta).toISOString();
        }

        // Si no hay filtro de fechas, ancla mínima
        if (!selector.createdAt) {
            selector.createdAt = { $gte: "" };
        }

        if (hasFolio) {
            // quitamos createdAt para no interferir con el índice
            const { createdAt, ...selectorFolio } = selector;
            console.log("🔍 Búsqueda directa por folio:", selectorFolio);

            const res = await this.db.find({
                selector: selectorFolio,
                limit: 1, // siempre 1 registro esperado
            });

            const docs = res.docs || [];

            console.log(
                "🧾 Resultado por folio:",
                docs.map((d) => ({
                    _id: d._id,
                    folio: d.folio,
                    fechaEmision: d.fechaEmision,
                    createdAt: d.createdAt,
                }))
            );

            return docs;
        }

        // Orden ASC compatible con el índice (type, empId, rutEmisor, createdAt, _id)
        const sortAscBase = [
            { type: "asc" },
            { empId: "asc" },
            { rutEmisor: "asc" },
            { createdAt: "asc" },
            { _id: "asc" },
        ];

        console.log(
            "🔎 selector:",
            JSON.stringify(selector, null, 2),
            "skip:", skip,
            "limit:", limit
        );

        // 1) CONTAR documentos que matchean el selector
        const countRes = await this.db.find({
            selector,
            fields: ["_id"], // liviano
        });

        const total = (countRes.docs || []).length;
        console.log("🔢 total docs match selector:", total);

        if (total === 0) {
            return [];
        }

        // Si el front se pasa de largo, no devolvemos nada
        if (skip >= total) {
            console.log("⛔ skip >= total, no hay más páginas");
            return [];
        }

        // 2) Calcular "ventana" desde el final
        //    pageNum: 0 = última página (más nuevos), 1 = la anterior, etc.
        const pageNum = Math.floor(skip / limit);

        // endExclusive: límite superior (no incluido) de esta ventana en orden ASC
        let endExclusive = total - pageNum * limit;
        if (endExclusive < 0) endExclusive = 0;

        // startInclusive: inicio de la ventana
        const startInclusive = Math.max(endExclusive - limit, 0);

        const effectiveLimit = endExclusive - startInclusive; // puede ser < limit en la última

        console.log(
            "📐 paging calc → pageNum:", pageNum,
            "startInclusive:", startInclusive,
            "endExclusive:", endExclusive,
            "effectiveLimit:", effectiveLimit
        );

        if (effectiveLimit <= 0) {
            console.log("⛔ effectiveLimit <= 0, no hay más docs");
            return [];
        }

        // 3) Traer esa ventana ASC usando el índice
        const res = await this.db.find({
            selector,
            sort: sortAscBase,
            use_index: "idx_gde_emp_rut_createdAt_id",
            skip: startInclusive,
            limit: effectiveLimit,
        });

        let docs = res.docs || [];

        console.log(
            "🧾 Page docs ASC (raw):",
            docs.map((d) => ({
                folio: d.folio,
                fechaEmision: d.fechaEmision,
                createdAt: d.createdAt,
            }))
        );

        // 4) Invertir para que dentro de la página queden en DESC
        docs.reverse();

        console.log(
            "🧾 Page docs DESC (final):",
            docs.map((d) => ({
                folio: d.folio,
                fechaEmision: d.fechaEmision,
                createdAt: d.createdAt,
            }))
        );

        return docs;
    }



    async *iterarParaResumen(empId, rut, {
        estados,
        desde,
        hasta,
        pageSize = 200,
    } = {}) {
        const base = {
            type: config.bd.tipoEntidad.gde,
            empId: Number(empId),
            rutEmisor: String(rut),
        };
        if (desde || hasta) {
            base.createdAt = {};
            if (desde) base.createdAt.$gte = new Date(desde).toISOString();
            if (hasta) base.createdAt.$lte = new Date(hasta).toISOString();
        }

        const estadosArr = Array.isArray(estados) ? estados.map(s => String(s).toUpperCase()) : [];
        const filtra1 = estadosArr.length === 1;
        const estadoUnico = filtra1 ? estadosArr[0] : null;

        // Config índice/sort
        const use_index = filtra1
            ? 'idx_gde_emp_rut_estado_createdAt_id'   // ['type','empId','rutEmisor','estado.id','createdAt','_id']
            : 'idx_gde_emp_rut_createdAt_id';         // ['type','empId','rutEmisor','createdAt','_id']

        const sort = filtra1
            ? [{ type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' }, { 'estado.id': 'asc' }, { createdAt: 'desc' }, { _id: 'desc' }]
            : [{ type: 'asc' }, { empId: 'asc' }, { rutEmisor: 'asc' }, { createdAt: 'desc' }, { _id: 'desc' }];

        let lastCreatedAt = null;
        let lastId = null;

        while (true) {
            // ---------- Query 1: strictly older by createdAt ----------
            const sel1 = { ...base };
            if (filtra1) sel1['estado.id'] = estadoUnico;
            if (lastCreatedAt) sel1.createdAt = { ...(sel1.createdAt || {}), $lt: lastCreatedAt };

            console.debug('🔍 iterarParaResumen Q1 selector:', sel1, 'use_index:', use_index);

            let res1 = await this.db.find({
                selector: sel1,
                sort,
                limit: pageSize,
                fields: RESUMEN_FIELDS,
                use_index,
            });
            let out = res1.docs || [];

            // ---------- Si faltan para completar la página, Query 2: mismo createdAt, _id < lastId ----------
            if (out.length < pageSize && lastCreatedAt && lastId) {
                const remaining = pageSize - out.length;
                const sel2 = { ...base };
                if (filtra1) sel2['estado.id'] = estadoUnico;
                sel2.createdAt = { ...(sel2.createdAt || {}), $eq: lastCreatedAt };
                sel2._id = { $lt: lastId };

                console.debug('🔍 iterarParaResumen Q2 selector:', sel2, 'use_index:', use_index);

                const res2 = await this.db.find({
                    selector: sel2,
                    sort,
                    limit: remaining,
                    fields: RESUMEN_FIELDS,
                    use_index,
                });
                out = out.concat(res2.docs || []);
            }

            // Filtro en cliente si NO es un solo estado
            if (!filtra1 && estadosArr.length > 0) {
                const S = new Set(estadosArr);
                out = out.filter(d => S.has(String(d?.estado?.id || '').toUpperCase()));
            }

            console.debug('🔍 iterarParaResumen page docs:', out.length);
            if (!out.length) break;

            yield out;

            const last = out[out.length - 1];
            lastCreatedAt = last?.createdAt || null;
            lastId = last?._id || null;
            if (!lastCreatedAt || !lastId) break;
        }
    }

    async *iterarPendientesDeEnvio(empId, rutEmisor, { pageSize = 50 } = {}) {
        const EG = config?.parametros?.estadosGuia;
        if (!EG?.EMITIDA?.id || !EG?.NULA?.id) {
            throw new Error('Config de estadosGuia inválida o incompleta');
        }

        const selectorBase = {
            type: config.bd.tipoEntidad.gde,
            empId: Number(empId),
            rutEmisor: String(rutEmisor),
            'estado.id': { $in: [EG.EMITIDA.id, EG.NULA.id] },
            syncing: { $ne: true },
            sincronizado: { $ne: true },
        };

        // Cursores
        let lastCreatedAt = null;
        let lastId = null;

        // Orden que calza con el índice completo
        const sortStrict = [
            { type: 'asc' },
            { empId: 'asc' },
            { rutEmisor: 'asc' },
            { 'estado.id': 'asc' },
            { syncing: 'asc' },
            { sincronizado: 'asc' },
            { createdAt: 'asc' },
            { _id: 'asc' },
        ];

        const indexStrict = 'idx_gde_sync_estado_syncing_sinc_createdAt_id';

        // Índice alternativo (sin syncing/sincronizado)
        const sortAlt = [
            { type: 'asc' },
            { empId: 'asc' },
            { rutEmisor: 'asc' },
            { 'estado.id': 'asc' },
            { createdAt: 'asc' },
            { _id: 'asc' },
        ];
        const indexAlt = 'idx_gde_emp_rut_estado_createdAt_id';



        let yielded = 0;

        const runPage = async (selector, sort, use_index) => {
            return this.db.find({ selector, sort, limit: pageSize, use_index });
        };

        while (true) {
            // Selector por página
            const selector = { ...selectorBase };
            if (lastCreatedAt) {
                selector.$or = [
                    { createdAt: { $gt: lastCreatedAt } },
                    { createdAt: { $eq: lastCreatedAt }, _id: { $gt: (lastId || '') } },
                ];
            }



            let res;
            try {
                // INTENTO 1: índice completo
                res = await runPage(selector, sortStrict, indexStrict);
            } catch (e1) {
                console.warn('❌ find con índice estricto falló:', e1?.message);
                try {
                    // INTENTO 2: índice alternativo
                    res = await runPage(selector, sortAlt, indexAlt);
                } catch (e2) {
                    console.warn('❌ find con índice alternativo falló:', e2?.message);
                    // INTENTO 3: sin índice/sort, filtro en memoria
                    const resRaw = await this.db.find({
                        selector: selectorBase,
                        limit: pageSize * 3,
                    });
                    let docs = resRaw.docs || [];

                    if (lastCreatedAt) {
                        docs = docs.filter(d =>
                            (d?.createdAt || '') > lastCreatedAt ||
                            ((d?.createdAt || '') === lastCreatedAt && (d?._id || '') > (lastId || ''))
                        );
                    }

                    docs = docs.filter(d => d?.syncing !== true && d?.sincronizado !== true);

                    docs.sort((a, b) => {
                        const c = (a?.createdAt || '').localeCompare(b?.createdAt || '');
                        return c !== 0 ? c : (a?._id || '').localeCompare(b?._id || '');
                    });

                    res = { docs: docs.slice(0, pageSize) };
                }
            }

            const docs = res?.docs || [];
            if (!docs.length) break;

            yield docs;
            yielded += docs.length;

            // Avanza cursor
            const last = docs[docs.length - 1];
            lastCreatedAt = last?.createdAt || null;
            lastId = last?._id || null;

            if (!lastCreatedAt || !lastId) break;
        }

    }



    // Itera guías pendientes: estado I|N y (syncing !== true) y (sincronizado !== true)
    // Trae un batch "suficiente" y filtra en memoria; rinde si esperas <= 20 por envío.
    async *iterarPendientesDeEnvioSimple(empId, rutEmisor, { pageSize = 20 } = {}) {
        const EG = config?.parametros?.estadosGuia;
        if (!EG?.EMITIDA?.id || !EG?.NULA?.id) {
            throw new Error('Config de estadosGuia inválida o incompleta');
        }

        const indexAlt = 'idx_gde_emp_rut_estado_createdAt_id';
        const sortAlt = [
            { type: 'asc' },
            { empId: 'asc' },
            { rutEmisor: 'asc' },
            { 'estado.id': 'asc' },
            { createdAt: 'asc' },
            { _id: 'asc' },
        ];

        const selectorBase = {
            type: config.bd.tipoEntidad.gde,
            empId: Number(empId),
            rutEmisor: String(rutEmisor),
            // admite tanto N (Nula) como I (Emitida). Si dijiste "E", la agrego por si acaso:
            'estado.id': { $in: [EG.EMITIDA.id, EG.NULA.id, 'E'] },
        };

        // cursores por createdAt + _id
        let lastCreatedAt = null;
        let lastId = null;

        const cmpStr = (a = '', b = '') => (a > b) - (a < b);

        while (true) {
            const selector = { ...selectorBase };
            if (lastCreatedAt) {
                selector.$or = [
                    { createdAt: { $gt: lastCreatedAt } },
                    { createdAt: { $eq: lastCreatedAt }, _id: { $gt: (lastId || '') } },
                ];
            } else {
                // Para que Mango no se queje al ordenar por createdAt:
                selector.createdAt = { $gte: '' };
            }

            // Trae "de más" y filtramos luego
            const res = await this.db.find({
                selector,
                sort: sortAlt,
                use_index: indexAlt,
                limit: Math.max(pageSize * 3, 60),
            });

            let docs = res?.docs || [];
            if (!docs.length) break;

            // Filtro en memoria: pendientes
            docs = docs.filter(d => d?.syncing !== true && d?.sincronizado !== true);

            // Orden estable (por si el motor no respetó algo)
            docs.sort((a, b) => {
                const c = cmpStr(a?.createdAt, b?.createdAt);
                return c !== 0 ? c : cmpStr(a?._id, b?._id);
            });

            if (!docs.length) {
                // avanza cursor usando el último del batch original para evitar bucle
                const lastRaw = res.docs[res.docs.length - 1];
                lastCreatedAt = lastRaw?.createdAt || null;
                lastId = lastRaw?._id || null;
                if (!lastCreatedAt || !lastId) break;
                continue;
            }

            // pagina “real” de salida
            const page = docs.slice(0, pageSize);
            yield page;

            // avanza cursor con el último realmente entregado
            const last = page[page.length - 1];
            lastCreatedAt = last?.createdAt || null;
            lastId = last?._id || null;
            if (!lastCreatedAt || !lastId) break;

            // Si el batch traído fue más chico que el límite y ya consumimos todo, corta
            if (res.docs.length < Math.max(pageSize * 3, 60) && docs.length <= pageSize) break;
        }
    }

    /**
 * Retorna los folios existentes en PouchDB para (empId, rutEmisor).
 * Por defecto devuelve: [32601, 32602, ...]
 *
 * Opciones:
 *  - asPairs: true  => [{ empId: 1, folio: 32601 }, ...]
 *  - asKeys:  true  => ["guia:1:32601", ...]   (ignora asPairs)
 *  - pageSize: tamaño de página para find()
 */
    async listarFoliosPorEmpresaYRut(empId, rutEmisor, { asPairs = false, asKeys = false, pageSize = 1000 } = {}) {
        const emp = Number(empId);
        const rut = String(rutEmisor);

        // Índice recomendado para esta consulta
        // Si ya lo creaste en otro lado, esto no molesta; si no, lo crea.
        try {
            await this.db.createIndex({
                index: { fields: ['type', 'empId', 'rutEmisor', 'folio', '_id'] },
                name: 'idx_gde_emp_rut_folio_id'
            });
        } catch (_) { /* no-op */ }

        const selectorBase = {
            type: config.bd.tipoEntidad.gde,
            empId: emp,
            rutEmisor: rut,
            // ancla Mango: si vas a ordenar por 'folio', inclúyelo en selector
            folio: { $gte: null }, // asegura que exista folio (y permite usar el índice)
        };

        const sort = [
            { type: 'asc' },
            { empId: 'asc' },
            { rutEmisor: 'asc' },
            { folio: 'asc' },
            { _id: 'asc' },
        ];

        const folios = [];
        let skip = 0;

        // Página a página
        while (true) {
            const res = await this.db.find({
                selector: selectorBase,
                sort,
                use_index: 'idx_gde_emp_rut_folio_id',
                fields: ['folio', 'empId', '_id'], // mínimo necesario
                limit: pageSize,
                skip,
            });

            const docs = res.docs || [];
            if (!docs.length) break;

            for (const d of docs) {
                const f = d?.folio;
                if (f != null) {
                    folios.push(Number(f));
                }
            }

            if (docs.length < pageSize) break;
            skip += pageSize;
        }

        // Unicos y ordenados (por si acaso)
        const uniq = Array.from(new Set(folios)).sort((a, b) => a - b);

        if (asKeys) {
            // ejemplo de key determinística (útil si el backend la espera)
            return uniq.map(f => `guia:${emp}:${f}`);
        }
        if (asPairs) {
            return uniq.map(f => ({ empId: emp, folio: f }));
        }
        return uniq; // array de números
    }




    async listarPorEmpresaYRut(empId, rut) {
        return this.listarPorEmpresaYRutPaginado(empId, rut, {
            limit: Number.MAX_SAFE_INTEGER,
            skip: 0,
        });
    }

    async insertar(gde) {
        try {
            return await getBaseDao().insertar(gde);
        } catch (error) {
            console.error("Error al insertar gde:", error);
            throw error;
        }
    }

    // === NUEVO: actualizar doc completo ===
    async actualizar(doc) {
        return await getBaseDao().actualizar(doc);
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
        return await getBaseDao().patch(id, patchObj);
    }
    // === NUEVO: actualizar por path "a.b.c" ===
    async updateByPath(id, path, value) {
        return await getBaseDao().updateByPath(id, path, value);
    }


    async patch(id, changes) {
        return await getBaseDao().patch(id, changes);
    }

    async patchDeep(id, changes) {
        return await getBaseDao().patchDeep(id, changes);
    }


    async ensureIndiceFoliosFlexible() {
        const prefijo = ['type', 'empId', 'folio'];
        const nombreDeseado = 'idx_gde_emp_folio_id';

        // 1) Revisa índices existentes
        const idx = await this.db.getIndexes();
        const hallado = idx.indexes.find(ix => {
            const fields = ix.def?.fields ? ix.def.fields.map(o => Object.keys(o)[0]) : [];
            return fields.length >= prefijo.length && prefijo.every((k, i) => fields[i] === k);
        });

        if (hallado) return hallado.name || nombreDeseado;

        // 2) Crea índice si no existe alguno con ese prefijo
        await this.db.createIndex({
            index: { fields: ['type', 'empId', 'folio', '_id'] },
            name: nombreDeseado,
        });

        return nombreDeseado;
    }

    /**
     * Upsert de UNA guía rescatada (doc del backend).
     * - Dedup por (empId, folio)
     * - Respeta 100% el payload del servidor
     * - Solo añade/actualiza: rescatado, rescatadoAt, updatedAt
     * - Preserva flags locales si ya existía: syncing, sincronizado, ultimoErrorSync
     */
    async upsertRescatada(docServidor) {
        const empId = Number(docServidor?.empId);
        const folio = Number(docServidor?.folio);
        if (!Number.isFinite(empId) || !Number.isFinite(folio)) {
            throw new Error('empId/folio inválidos en la guía rescatada');
        }

        // Tipo para selector (si no viene, usa 'gde')
        const tipo = docServidor?.type ?? 'gde';

        // Índice (flex) y fallback
        let nombreIndice = null;
        try { nombreIndice = await this.ensureIndiceFoliosFlexible(); } catch { }

        const selector = { type: tipo, empId, folio, _id: { $gte: null } };

        let encontrados;
        try {
            encontrados = await this.db.find({
                selector,
                use_index: nombreIndice || undefined,
                fields: ['_id', '_rev', 'syncing', 'sincronizado', 'ultimoErrorSync', 'rescatado', 'rescatadoAt'],
                limit: 1,
            });
        } catch {
            // Fallback sin use_index
            encontrados = await this.db.find({
                selector,
                fields: ['_id', '_rev', 'syncing', 'sincronizado', 'ultimoErrorSync', 'rescatado', 'rescatadoAt'],
                limit: 1,
            });
        }

        // Documento base = tal cual viene del backend
        const nowIso = new Date().toISOString();
        const base = { ...docServidor };
        base.rescatado = true;
        base.rescatadoAt = base.rescatadoAt ?? nowIso; // no pisar si ya viene
        base.updatedAt = nowIso;

        // Si YA existe doc con ese (empId, folio): upsert sobre el mismo _id
        if (encontrados.docs?.length) {
            const curr = await this.db.get(encontrados.docs[0]._id);

            // Solo flags locales a preservar
            const preservarLocales = {
                syncing: curr?.syncing ?? false,
                sincronizado: curr?.sincronizado ?? base?.sincronizado ?? true,
                ultimoErrorSync: curr?.ultimoErrorSync ?? null,
            };

            const next = {
                ...base,              // payload del servidor manda
                ...preservarLocales,  // flags locales
                _id: curr._id,
                _rev: curr._rev,
            };

            let intentos = 0;
            while (intentos < MAX_RETRIES) {
                try {
                    const res = await this.db.put(next);
                    return await this.db.get(res.id);
                } catch (e) {
                    if (e?.status === 409) {
                        const fresh = await this.db.get(curr._id);
                        next._rev = fresh._rev;
                        intentos++;
                        continue;
                    }
                    throw e;
                }
            }
            throw Object.assign(new Error('Conflicto al actualizar guía rescatada'), { status: 409 });
        }

        // No existía: crear nuevo (no arrastrar _id/_rev del server si vinieran)
        const { _id, _rev, ...limpio } = base;
        const res = await this.db.post(limpio);
        return await this.db.get(res.id);
    }

    /**
     * Upsert de MUCHAS guías rescatadas (batch) con concurrencia.
     * @param {Array<object>} docsServidor
     * @param {object} opts { concurrency?: number }
     * @returns {object} { total, ok, fail, errores }
     */
    async upsertRescatadas(docsServidor, { concurrency = 4 } = {}) {
        await this.ensureIndiceFoliosFlexible();

        const items = Array.isArray(docsServidor) ? docsServidor : [];
        let ok = 0, fail = 0;
        const errores = [];

        const cola = [...items];
        const trabajadores = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
            while (cola.length) {
                const item = cola.shift();
                try {
                    await this.upsertRescatada(item);
                    ok++;
                } catch (e) {
                    fail++;
                    errores.push({ empId: item?.empId, folio: item?.folio, error: e?.message || String(e) });
                }
            }
        });

        await Promise.all(trabajadores);
        return { total: items.length, ok, fail, errores };
    }

}






