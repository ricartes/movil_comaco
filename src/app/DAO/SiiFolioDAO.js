import { getBaseDao } from "@/app/services/initServices";

let instance = null;

export default class SiiFolioDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
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
    async bulkInsert(docs = []) {
        if (!Array.isArray(docs) || docs.length === 0) {
            return { ok: true, inserted: 0, conflicts: 0 };
        }

        try {
            const baseDao = getBaseDao();
            const result = await baseDao.db.bulkDocs(docs, { new_edits: true });

            // Detectar conflictos o errores
            let inserted = 0;
            let conflicts = 0;

            for (const r of result) {
                if (r.ok) inserted++;
                else if (r.error && r.name === "conflict") conflicts++;
            }

            return { ok: true, inserted, conflicts };
        } catch (error) {
            console.error("Error en bulkInsert:", error);
            throw error;
        }
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
