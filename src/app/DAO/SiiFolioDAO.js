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
            // URF por (type, empId, rutUsuario, urfId)
            await this.db.createIndex({ index: { fields: ["type", "empId", "rutUsuario", "urfId"] } });
        } catch (_) { }
        try {
            // Folios por (type, empId, urfId, estado, folio) -> para ordenar y filtrar
            await this.db.createIndex({ index: { fields: ["type", "empId", "urfId", "estado", "folio"] } });
        } catch (_) { }
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



    /**
     * Devuelve el primer folio disponible (estado 'D') para el rut y empresa dados.
     * Si no hay folios 'D', retorna null.
     * Retorna un DTO de folio.
     */
    async obtenerPrimerFolioDisponible(empId, rut) {
        // 1) Obtener los URF del usuario
        const urfs = await this.listarUsuarioRangoFolioPorRut(empId, rut);
        if (!urfs.length) return null;

        const urfIds = urfs.map((u) => Number(u.urfId));

        // 2) Buscar el primer folio 'D' dentro de esos URF, ordenado por folio asc
        // (Se apoya en el índice ["type","empId","urfId","estado","folio"])
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.folio,
                empId: Number(empId),
                estado: config.parametros.estadosFolio.disponible,
                urfId: { $in: urfIds },
            },
            sort: [
                { type: "asc" },
                { empId: "asc" },
                { urfId: "asc" },
                { estado: "asc" },
                { folio: "asc" },
            ],
            limit: 1,
        });

        const doc = (res.docs || [])[0];
        return doc ? folioDocToDTO(doc) : null;
    }

    /**
* Devuelve el URF (DTO) asociado a un urfId/empId.
* (Si quieres validar que pertenezca al rut, pasa rut y lo filtramos.)
*/
    async obtenerUrfPorId(empId, urfId, rut = null) {
        const selector = {
            type: config.bd.tipoEntidad.siiUsuarioRangoFolio,
            empId: Number(empId),
            urfId: Number(urfId),
        };
        if (rut != null) selector.rutUsuario = rut;

        const { docs } = await this.db.find({ selector, limit: 1 });
        const d = (docs || [])[0];
        return d ? urfDocToDTO(d) : null;
    }


    /**
   * Convenience: obtiene { folioDTO, urfDTO } del primer folio disponible
   * para empresa + rut. Si no hay, retorna { folioDTO: null, urfDTO: null }.
   */
    async obtenerPrimeroDisponibleConURF(empId, rut) {
        const folioDTO = await this.obtenerPrimerFolioDisponible(empId, rut);
        if (!folioDTO) return { folioDTO: null, urfDTO: null };
        const urfDTO = await this.obtenerUrfPorId(empId, folioDTO.urfId, rut);
        return { folioDTO, urfDTO };
    }




    async marcarFolioComoUsado(empId, urfId, folio) {
        const sel = {
            selector: {
                type: config.bd.tipoEntidad.folio,
                empId: Number(empId),
                urfId: Number(urfId),
                folio: Number(folio),
            },
            limit: 1,
        };
        const res = await this.db.find(sel);
        const doc = res.docs?.[0];
        if (!doc) throw new Error(`Folio ${folio} no encontrado`);
        if (doc.estado === config.parametros.estadosFolio.usado) return { ok: true, already: true };

        doc.estado = config.parametros.estadosFolio.usado;
        doc.updatedAt = new Date().toISOString();
        await this.db.put(doc);
        return { ok: true };
    }


    async recomputarURFStats(empId, urfId) {
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.folio,
                empId: Number(empId),
                urfId: Number(urfId),
            },
            fields: ['folio', 'estado'],
        });
        const folios = res.docs || [];
        const disponibles = folios.filter(f => f.estado === config.parametros.estadosFolio.disponible).map(f => Number(f.folio));
        const usados = folios.filter(f => f.estado === config.parametros.estadosFolio.usado).map(f => Number(f.folio));

        const primerDisponible = disponibles.length ? Math.min(...disponibles) : null;
        const maxOcupado = usados.length ? Math.max(...usados) : null;
        const totalDisponibles = disponibles.length;
        const totalUsados = usados.length;

        // actualiza el doc URF
        const urfRes = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.siiUsuarioRangoFolio,
                empId: Number(empId),
                urfId: Number(urfId),
            },
            limit: 1,
        });
        const urf = urfRes.docs?.[0];
        if (!urf) return { ok: true, updated: false };

        Object.assign(urf, {
            primerDisponible,
            maxOcupado,
            totalDisponibles,
            totalUsados,
            updatedAt: new Date().toISOString(),
        });
        await this.db.put(urf);
        return { ok: true, updated: true, primerDisponible, maxOcupado, totalDisponibles, totalUsados };
    }
}
