// src/app/dao/BaseDAO.js

let instance = null;

const MAX_RETRIES = 3;

export default class BaseDAO {
    constructor(db) {
        if (!instance) {
            if (!db) {
                throw new Error("BaseDAO requiere instancia de PouchDB");
            }
            this.db = db;
            instance = this;
        }
        return instance;
    }

    // ========= Helpers internos =========

    _setByPath(obj, path, val) {
        const keys = String(path).split(".");
        let cur = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (typeof cur[k] !== "object" || cur[k] === null) {
                cur[k] = {};
            }
            cur = cur[k];
        }
        cur[keys[keys.length - 1]] = val;
    }

    _getByPath(obj, path) {
        return String(path)
            .split(".")
            .reduce((o, k) => (o == null ? o : o[k]), obj);
    }

    // ========= CRUD base =========

    async obtener(id) {
        return await this.db.get(id);
    }

    async listarPorTipo(tipo) {
        try {
            const resultado = await this.db.find({
                selector: { type: tipo },
            });
            return resultado.docs;
        } catch (error) {
            console.error("Error al listar documentos:", error);
            throw error;
        }
    }

    async insertar(item) {
        try {
            const resultado = await this.db.post(item);
            // si quieres consistencia, puedes retornar el doc completo:
            return await this.db.get(resultado.id);
        } catch (error) {
            console.error("Error al crear documento:", error);
            throw error;
        }
    }

    async eliminar(item) {
        try {
            const currentDoc = await this.db.get(item._id);
            const documentoParaEliminar = {
                ...currentDoc,
                _deleted: true,
            };
            const respuestaEliminacion = await this.db.put(documentoParaEliminar);
            return respuestaEliminacion;
        } catch (error) {
            console.error("Error al eliminar documento:", error);
            throw error;
        }
    }

    // ========= Mutadores genéricos (devuelven doc completo) =========

    async actualizar(doc) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            try {
                const putResult = await this.db.put(doc);
                return await this.db.get(putResult.id);
            } catch (e) {
                if (e?.status === 409) {
                    const fresh = await this.db.get(doc._id);
                    doc = { ...fresh, ...doc, _rev: fresh._rev };
                    attempt++;
                    continue;
                }
                throw e;
            }
        }
        throw Object.assign(new Error("Document update conflict"), { status: 409 });
    }

    async patch(id, changes) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            try {
                const curr = await this.db.get(id);
                const next = { ...curr, ...changes, _id: curr._id, _rev: curr._rev };
                const res = await this.db.put(next);
                const updated = await this.db.get(res.id);
                return updated;
            } catch (e) {
                if (e?.status === 409) {
                    attempt++;
                    continue;
                }
                if (e?.status === 404) {
                    throw Object.assign(
                        new Error(`Documento ${id} no encontrado`),
                        { status: 404 }
                    );
                }
                throw e;
            }
        }
        throw Object.assign(new Error("Document update conflict"), { status: 409 });
    }

    async patchDeep(id, changes) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            try {
                const doc = await this.db.get(id);
                for (const [path, val] of Object.entries(changes)) {
                    this._setByPath(doc, path, val);
                }
                const res = await this.db.put(doc);
                return await this.db.get(res.id);
            } catch (e) {
                if (e?.status === 409) {
                    attempt++;
                    continue;
                }
                if (e?.status === 404) {
                    throw Object.assign(
                        new Error(`Documento ${id} no encontrado`),
                        { status: 404 }
                    );
                }
                throw e;
            }
        }
        throw Object.assign(new Error("Document update conflict"), { status: 409 });
    }

    async updateByPath(id, path, value) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            const doc = await this.db.get(id);
            this._setByPath(doc, path, value);
            try {
                const res = await this.db.put(doc);
                return await this.db.get(res.id);
            } catch (e) {
                if (e?.status === 409) {
                    attempt++;
                    continue;
                }
                throw e;
            }
        }
        throw Object.assign(new Error("Document update conflict"), { status: 409 });
    }

    async updateByPathIfNull(id, path, value) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            const doc = await this.db.get(id);
            const curr = this._getByPath(doc, path);
            if (curr != null) return doc; // ya tenía valor → no escribe
            this._setByPath(doc, path, value);
            try {
                const res = await this.db.put(doc);
                return await this.db.get(res.id);
            } catch (e) {
                if (e?.status === 409) {
                    attempt++;
                    continue;
                }
                throw e;
            }
        }
        throw Object.assign(new Error("Document update conflict"), { status: 409 });
    }
}
