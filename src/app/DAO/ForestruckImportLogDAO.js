import config from "@/Common/json/config.json";
import { makeId } from "../mappers/_id";

let instance = null;

export default class ForestruckImportLogDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }

    makeDocId(fileKey) {
        // ID estable por archivo
        return makeId(config.bd.tipoEntidad.forestruckImportLog, fileKey);
    }

    async upsertImportado({ fileKey, fileName, path, gdeId }) {
        const _id = this.makeDocId(fileKey);

        let prev = null;
        try {
            prev = await this.db.get(_id);
        } catch (e) {
            if (e.status !== 404) throw e;
        }

        const doc = {
            ...(prev || {}),
            _id,
            type: config.bd.tipoEntidad.forestruckImportLog,
            fileKey,
            fileName,
            path,
            status: "imported",
            importedAt: new Date().toISOString(),
            gdeId: gdeId || prev?.gdeId || null,
        };

        return await this.db.put(doc);
    }

    async marcarFallido({ fileKey, fileName, path, error }) {
        const _id = this.makeDocId(fileKey);

        let prev = null;
        try { prev = await this.db.get(_id); } catch (e) {
            if (e.status !== 404) throw e;
        }

        const doc = {
            ...(prev || {}),
            _id,
            type: config.bd.tipoEntidad.forestruckImportLog,
            fileKey,
            fileName,
            path,
            status: "failed",
            error: String(error || ""),
            updatedAt: new Date().toISOString(),
        };

        return await this.db.put(doc);
    }

    async obtenerPorFileKey(fileKey) {
        try {
            return await this.db.get(this.makeDocId(fileKey));
        } catch (e) {
            if (e.status === 404) return null;
            throw e;
        }
    }

    async listarTodos() {
        const res = await this.db.find({
            selector: { type: config.bd.tipoEntidad.forestruckImportLog },
        });
        return res?.docs || [];
    }

    // Útil: consultar SOLO los importados
    async listarImportados() {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.forestruckImportLog,
                status: "imported",
            },
        });
        return res?.docs || [];
    }
}
