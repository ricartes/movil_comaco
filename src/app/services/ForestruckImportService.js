// src/app/services/ForestruckImportService.js
import { StorageAccess } from "@/app/plugins/StorageAccess";
import { getForestruckImportLogDao, getZonaDao, getRodalDao } from "@/app/services/initServices";
import ProductoDTO from '@/app/DTO/Parametros/ProductoDTO'
import ClienteDTO from '@/app/DTO/Parametros/ClienteDTO'
import ClienteDestinoDTO from '@/app/DTO/Parametros/ClienteDestinoDTO'
import ZonaDTO from '@/app/DTO/Parametros/ZonaDTO'
import ProveedorDTO from '@/app/DTO/Parametros/ProveedorDTO'
import PredioDTO from '@/app/DTO/Parametros/PredioDTO'
import config from "@/Common/json/config.json";

// --------------------
// Errores de dominio
// --------------------
export class ForestruckImportError extends Error {
    constructor(code, message, cause = null) {
        super(message);
        this.name = "ForestruckImportError";
        this.code = code;       // e.g. "FOLDER_NOT_CONFIGURED", "LIST_FAILED", ...
        this.cause = cause;
    }
}

// --------------------
// Helpers
// --------------------
export function buildFileKey(f) {
    // key estable + detecta regeneración del JSON
    return `${f.name}|${Number(f.size || 0)}|${Number(f.lastModified || 0)}`;
}

function ensureArray(x) {
    return Array.isArray(x) ? x : [];
}

function normalizeFile(f) {
    // Capacitor suele entregar objetos planos desde JSArray => normalizamos campos
    return {
        name: f?.name || "",
        uri: f?.uri || "",
        size: Number(f?.size || 0),
        lastModified: Number(f?.lastModified || 0),
    };
}

function validateTreeUri(treeUri) {
    if (!treeUri) {
        throw new ForestruckImportError(
            "FOLDER_NOT_CONFIGURED",
            "Carpeta de intercambio no configurada."
        );
    }
}

// --------------------
// API del servicio
// --------------------
export async function listarImportablesForestruck(treeUri) {
    validateTreeUri(treeUri);

    const estadoImportado = config.parametros.estadoIntegracionForestruck.importado || "imported";
    const estadoFallido = config.parametros.estadoIntegracionForestruck.fallido || "failed";
    try {
        const logDao = getForestruckImportLogDao();

        // 1) listar JSON desde plugin
        const res = await StorageAccess.listJson({ treeUri });
        const rawFiles = ensureArray(res?.files);
        const files = rawFiles.map(normalizeFile).filter((f) => f.name && f.uri);

        // 2) logs importados desde Pouch (DAO)
        const logs = await logDao.listarTodos(); // debe retornar array de docs
        const logByKey = new Map(ensureArray(logs).map((d) => [d.fileKey, d]));

        return files
            .map((f) => {
                const fileKey = buildFileKey(f);
                const log = logByKey.get(fileKey) || null;

                return {
                    file: f,
                    fileKey,
                    imported: log?.status === estadoImportado,
                    failed: log?.status === estadoFallido,
                    status: log?.status || null,
                    error: log?.error || null,
                };
            })
            .sort((a, b) => (b.file.lastModified || 0) - (a.file.lastModified || 0));



    } catch (e) {
        throw new ForestruckImportError(
            "LIST_FAILED",
            "No se pudo listar los JSON de Forestruck.",
            e
        );
    }
}

export async function leerJsonForestruckParaPreview(item) {
    const uri = item?.file?.uri;
    if (!uri) {
        throw new ForestruckImportError("INVALID_FILE", "Archivo inválido.");
    }


    try {
        const r = await StorageAccess.readText({ uri }); // <-- requiere el método readText en el plugin
        const raw = String(r?.text || "");

        let json = null;
        try {
            json = JSON.parse(raw);
        } catch (parseErr) {
            throw new ForestruckImportError(
                "INVALID_JSON",
                "El archivo no contiene un JSON válido.",
                parseErr
            );
        }

        return {
            json,
            file: item.file,
            fileKey: item.fileKey,
            imported: !!item.imported,
        };
    } catch (e) {

        // si ya es ForestruckImportError, lo propagamos tal cual
        if (e instanceof ForestruckImportError) throw e;

        throw new ForestruckImportError(
            "READ_FAILED",
            "No se pudo leer el archivo seleccionado.",
            e
        );
    }
}

/**
 * Llamar DESPUÉS de importar exitosamente (cuando guardas la GDE en Pouch)
 */
export async function registrarImportacionExitosa({ fileKey, file, meta = {} }) {
    if (!fileKey) {
        throw new ForestruckImportError("INVALID_FILEKEY", "fileKey es requerido.");
    }

    try {
        const logDao = getForestruckImportLogDao();

        const doc = {
            fileKey,
            fileName: file?.name || null,
            uri: file?.uri || null,
            size: Number(file?.size || 0),
            lastModified: Number(file?.lastModified || 0),

            status: "imported",
            error: null,
            importedAt: new Date().toISOString(),

            // trazabilidad extra (opcional)
            ...meta,

            // si quieres fijar el type acá, puedes, pero el DAO ya lo asegura igual
            // type: config.bd.tipoEntidad.forestruckImportLog,
        };

        return await logDao.upsertPorFileKey(doc);
    } catch (e) {
        throw new ForestruckImportError(
            "LOG_WRITE_FAILED",
            "No se pudo registrar el log de importación.",
            e
        );
    }
}

export async function registrarImportacionFallida({ fileKey, file, error, meta = {} }) {
    if (!fileKey) {
        throw new ForestruckImportError("INVALID_FILEKEY", "fileKey es requerido.");
    }

    try {
        const logDao = getForestruckImportLogDao();

        return await logDao.marcarFallidoPorFileKey({
            fileKey,
            fileName: file?.name || null,
            uri: file?.uri || null,
            size: Number(file?.size || 0),
            lastModified: Number(file?.lastModified || 0),

            error: error?.message || String(error || ""),

            ...meta,
        });
    } catch (e) {
        throw new ForestruckImportError(
            "LOG_WRITE_FAILED",
            "No se pudo registrar el log de importación fallida.",
            e
        );
    }
}

export async function asignarZonaDesdeOc(oc = {}, empId = 1) {

    return await getZonaDao().obtener(oc.codEncargado, empId);
}


export function asignarPredioDesdeOc(oc = {}) {

    return new PredioDTO({
        rolPredio: oc.rolPredio,
        rolComuna: oc.rolComuna,
        predio: oc.predio,
        codProyecto: oc.codProyecto,
    })
}

export function asignarProveedorDesdeOc(oc = {}) {

    return new ProveedorDTO({
        rutProveedor: oc.rutProveedor,
        nomProveedor: oc.nomProveedor,
        codEncargado: oc.codEncargado,
    })
}


export function asignarClienteDesdeOc(oc = {}) {
    return new ClienteDTO({
        codCliente: oc.codCliente,
        rutCliente: oc.rutCliente,
        razonSocialCliente: oc.razonSocialCliente,
        direccionCliente: oc.direccionCliente,
        comunaCliente: oc.comunaCliente,
        ciudadCliente: oc.ciudadCliente,
        giroCliente: oc.giroCliente,
        telefonoCliente: oc.telefonoCliente,
    })
}



export function asignarProductoDesdeOc(oc = {}) {
    return new ProductoDTO({
        codProducto: oc.codProducto,
        nombreProducto: oc.nombreProducto,
        unidadMedida: oc.unidadMedida,
        fsc: oc.fsc,
        categoria: oc.categoria,
        sag: oc.sag,
        flagCambioGde: oc.flagCambioGde,
        tipoCertificacion: oc.tipoCertificacion,
        codigoCertificacion: oc.codigoCertificacion,
    })
}

export function asignarClienteDestinoDesdeOc(oc = {}) {
    return new ClienteDestinoDTO({
        destinoCliente: oc.destinoCliente,
        direccionCliente: oc.direccionCliente,
        direccionDestinoCliente: oc.direccionDestinoCliente,
        comunaDestinoCliente: oc.comunaDestinoCliente,
        ciudadDestinoCliente: oc.ciudadDestinoCliente,
        nombreDestino: oc.nombreDestino,
        rolDestino: oc.rolDestino,
        coordenadasDestino: oc.coordenadasDestino,
        latitudDestino: oc.latitudDestino,
        longitudDestino: oc.longitudDestino,
    })
}

export async function asignarRodalDesdeOc(oc = {}) {

    return await getRodalDao().obtenerPorOrigen(oc.rolPredio);

}


