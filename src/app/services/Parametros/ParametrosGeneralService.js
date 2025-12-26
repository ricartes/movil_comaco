import { getParametroGeneralDao } from "@/app/services/initServices";
import config from "@/Common/json/config.json";

export async function listarParametrosGenerales(empId) {
    return await getParametroGeneralDao().listarPorEmpresa(empId);
}

export async function generarPorcentajeIva(empresaId) {
    const ivaPorDefecto = config.parametros.ivaPorDefecto || 19;
    const idParametroIva = config.parametros.parametrosGenerales.porcentajeIva || 3;

    try {
        const parametros = await listarParametrosGenerales(empresaId);

        return obtenerParametroNumerico(parametros, empresaId, idParametroIva, {
            glosa: "IVA",
            defaultValue: ivaPorDefecto,
        });
    } catch (err) {
        console.error("Error cargando IVA:", err);
        return ivaPorDefecto;
    }
}

/** Helpers: SIEMPRE top-level (afuera de cualquier función) */

export function obtenerParametroRaw(parametros, empresaId, parametroId, { glosa } = {}) {
    const arr = Array.isArray(parametros) ? parametros : [];

    const porId = arr.find(
        (p) => Number(p.id) === Number(parametroId) && String(p.empId) === String(empresaId)
    );

    const porGlosa =
        glosa &&
        arr.find(
            (p) =>
                String(p.empId) === String(empresaId) &&
                String(p.glosa || "").toUpperCase() === glosa.toUpperCase()
        );

    return porId?.valor ?? porGlosa?.valor;
}

export function obtenerParametroNumerico(
    parametros,
    empresaId,
    parametroId,
    { glosa, defaultValue } = {}
) {
    const raw = obtenerParametroRaw(parametros, empresaId, parametroId, { glosa });
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

export function obtenerParametroJSON(
    parametros,
    empresaId,
    parametroId,
    { glosa, validate, nombre = "parámetro" } = {}
) {
    const raw = obtenerParametroRaw(parametros, empresaId, parametroId, { glosa });

    if (raw == null || raw === "") {
        return {
            ok: false,
            value: null,
            error: `Falta el ${nombre} (ID ${parametroId}). Cárgalo desde el menú principal.`,
        };
    }

    let obj = raw;
    if (typeof raw === "string") {
        try {
            obj = JSON.parse(raw);
        } catch {
            return {
                ok: false,
                value: null,
                error: `El ${nombre} (ID ${parametroId}) no es un JSON válido.`,
            };
        }
    }

    if (!obj || typeof obj !== "object") {
        return { ok: false, value: null, error: `El ${nombre} (ID ${parametroId}) es inválido.` };
    }

    if (typeof validate === "function") {
        const err = validate(obj);
        if (err) return { ok: false, value: null, error: err };
    }

    return { ok: true, value: obj, error: null };
}
