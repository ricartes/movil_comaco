// src/app/dao/ForestruckImportLogDAO.js
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

    async _getOrNull(_id) {
        try {
            return await this.db.get(_id);
        } catch (e) {
            if (e.status === 404) return null;
            throw e;
        }
    }

    /**
     * Upsert genérico por fileKey (para que el SERVICE sea el dueño del shape)
     */
    async upsertPorFileKey(doc) {
        const fileKey = doc?.fileKey;
        if (!fileKey) throw new Error("fileKey requerido");

        const _id = this.makeDocId(fileKey);
        const prev = await this._getOrNull(_id);

        const now = new Date().toISOString();

        const merged = {
            ...(prev || {}),
            ...(doc || {}),
            _id,
            type: config.bd.tipoEntidad.forestruckImportLog,
            fileKey,
            createdAt: prev?.createdAt || now,
            updatedAt: now,
        };

        return await this.db.put(merged);
    }

    async marcarFallidoPorFileKey({ fileKey, error, ...rest }) {
        return await this.upsertPorFileKey({
            ...rest,
            fileKey,
            status: "failed",
            error: String(error || ""),
            failedAt: new Date().toISOString(),
        });
    }

    // --- Wrappers (compatibilidad con tu código actual) ---
    async upsertImportado({ fileKey, fileName, uri, gdeId }) {
        return await this.upsertPorFileKey({
            fileKey,
            fileName: fileName || null,
            uri: uri || null,
            gdeId: gdeId || null,
            status: "imported",
            error: null,
            importedAt: new Date().toISOString(),
        });
    }

    async marcarFallido({ fileKey, fileName, uri, error }) {
        return await this.marcarFallidoPorFileKey({
            fileKey,
            fileName: fileName || null,
            uri: uri || null,
            error,
        });
    }

    async obtenerPorFileKey(fileKey) {
        if (!fileKey) return null;
        return await this._getOrNull(this.makeDocId(fileKey));
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
