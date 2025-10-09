import config from "@/Common/json/config.json";
import { getBaseDao } from "@/app/services/initServices";
import { urfDocToDTO } from "@/app/mappers/SiiUsuarioRangoFolioMapper";
import { folioDocToDTO } from "@/app/mappers/SiiFolioMapper";

let instance = null;

export default class SiiFolioDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
            this.ensureIndexes?.();
        }
        return instance;
    }

    async ensureIndexes() {
        try {
            await this.db.createIndex({
                index: { fields: ["type", "empId", "rutUsuario"] },
            });
        } catch (_) {
            /* no-op si ya existe */
        }
    }

    async listarUsuarioRangoFolioPorRut(empId, rut) {
        const { docs } = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.siiUsuarioRangoFolio,
                empId: empId,
                rutUsuario: rut,
            },
        });

        return docs
            .sort((a, b) => Number(b.urfId) - Number(a.urfId)) // urfId desc
            .map(urfDocToDTO);
    }

    async listarFoliosPorUrf(empId, urfId) {
        try {


            const res = await this.db.find({
                selector: {
                    type: config.bd.tipoEntidad.folio,
                    empId: Number(empId),
                    urfId: Number(urfId),
                },
                // si el índice existe con 'folio', puedes pedir sort por folio:
                // sort: [{ type: "asc" }, { empId: "asc" }, { urfId: "asc" }, { folio: "asc" }],
            });



            // ordenar en memoria por si el sort no está disponible
            const docs = (res.docs || []).sort((a, b) => Number(a.folio) - Number(b.folio));

            // devolver DTOs (si prefieres docs crudos, cambia el map)
            return docs.map(folioDocToDTO);
        } catch (error) {
            console.error("Error al listar folios por URF:", error);
            throw error;
        }
    }


    /**
     * Inserta un documento de tipo USUARIO_RANGO_FOLIO
     */
    async insertarUsuarioRangoFolio(doc) {
        try {
            return await getBaseDao().insertar({ ...doc });
        } catch (error) {
            console.error("Error al crear usuario rango folio:", error);
            throw error;
        }
    }

    /**
     * Inserta un documento de tipo FOLIO
     */
    async insertarFolio(doc) {
        try {
            return await getBaseDao().insertar({ ...doc });
        } catch (error) {
            console.error("Error al crear folio:", error);
            throw error;
        }
    }

    /**
     * Inserta múltiples documentos, evitando duplicados por _id
     */
    // src/app/dao/BaseDAO.js (o SiiFolioDAO si lo tienes ahí)
    async bulkInsert(docs = []) {
        if (!Array.isArray(docs) || docs.length === 0) {
            return { ok: true, inserted: 0, conflicts: 0 };
        }
        const result = await this.db.bulkDocs(docs, { new_edits: true });

        let inserted = 0, conflicts = 0, otherErrors = 0;
        for (const r of result) {
            if (r.ok) inserted++;
            else if (r.error && r.name === 'conflict') conflicts++;
            else otherErrors++;
        }
        if (otherErrors > 0) {
            throw new Error(`Fallaron ${otherErrors} documentos en bulkInsert`);
        }
        return { ok: true, inserted, conflicts };
    }


    /**
     * Elimina todos los documentos de un batchId (rollback)
     */
    async eliminarPorBatchId(batchId) {
        try {
            const result = await this.db.find({
                selector: { batchId: { $eq: batchId } },
            });
            if (!result.docs.length) return { ok: true, deleted: 0 };

            const toDelete = result.docs.map((d) => ({ ...d, _deleted: true }));
            const resp = await this.db.bulkDocs(toDelete);
            return { ok: true, deleted: resp.length };
        } catch (e) {
            console.error("Error al eliminarPorBatchId:", e);
            throw e;
        }
    }

    /**
     * Marca un batch como confirmado (quita staging, cambia flags)
     */
    async actualizarBatch(batchId, patch) {
        try {
            const result = await this.db.find({
                selector: { batchId: { $eq: batchId } },
            });
            if (!result.docs.length) return { ok: false, updated: 0 };

            const toUpdate = result.docs.map((doc) => ({
                ...doc,
                ...patch,
                updatedAt: new Date().toISOString(),
            }));

            const resp = await this.db.bulkDocs(toUpdate);
            return { ok: true, updated: resp.length };
        } catch (e) {
            console.error("Error al actualizarBatch:", e);
            throw e;
        }
    }
}
