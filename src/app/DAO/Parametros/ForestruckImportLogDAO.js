import config from "@/Common/json/config.json";
import { makeId } from "../../mappers/_id";

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
        return makeId(config.bd.tipoEntidad.forestruckImportLog, fileKey);
    }

    async upsertImportado({ fileKey, fileName, uri, gdeId }) {
        if (!fileKey) throw new Error("fileKey requerido");
        const _id = this.makeDocId(fileKey);

        let prev = null;
        try {
            prev = await this.db.get(_id);
        } catch (e) {
            if (e.status !== 404) throw e;
        }

        const now = new Date().toISOString();

        const doc = {
            ...(prev || {}),
            _id,
            type: config.bd.tipoEntidad.forestruckImportLog,
            fileKey,
            fileName: fileName || prev?.fileName || null,
            uri: uri || prev?.uri || null,
            status: "imported",
            error: null,
            importedAt: now,
            createdAt: prev?.createdAt || now,
            updatedAt: now,
            gdeId: gdeId || prev?.gdeId || null,
        };

        return await this.db.put(doc);
    }

    async marcarFallido({ fileKey, fileName, uri, error }) {
        if (!fileKey) throw new Error("fileKey requerido");
        const _id = this.makeDocId(fileKey);

        let prev = null;
        try {
            prev = await this.db.get(_id);
        } catch (e) {
            if (e.status !== 404) throw e;
        }

        const now = new Date().toISOString();

        const doc = {
            ...(prev || {}),
            _id,
            type: config.bd.tipoEntidad.forestruckImportLog,
            fileKey,
            fileName: fileName || prev?.fileName || null,
            uri: uri || prev?.uri || null,
            status: "failed",
            error: String(error || ""),
            createdAt: prev?.createdAt || now,
            updatedAt: now,
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
