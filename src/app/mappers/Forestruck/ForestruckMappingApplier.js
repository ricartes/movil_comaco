// /app/mappers/Forestruck/ForestruckMappingApplier.js
import { createGdeDraftDefault } from "@/app/factory/GdeDraftFactory";
import { getByPath, setByPath } from "@/app/mappers/MappingUtils";

function buildIndexByInfoType(sourceDocArray) {
    const idx = {};
    for (const row of Array.isArray(sourceDocArray) ? sourceDocArray : []) {
        const k = row?.InfoType;
        if (k != null) idx[String(k)] = row;
    }
    return idx;
}



function resolveValueOrStatic(sourceJson, mapping, sourcePath) {
    if (typeof sourcePath !== "string") return null;

    // $static:...
    if (sourcePath.startsWith("$static:")) {
        const raw = sourcePath.slice("$static:".length);

        // caster simple
        if (raw === "null") return null;
        if (raw === "true") return true;
        if (raw === "false") return false;

        const n = Number(raw);
        if (Number.isFinite(n) && raw.trim() !== "") return n;

        return raw; // string
    }

    // $ref:...
    if (sourcePath.startsWith("$ref:")) {
        const ref = sourcePath.slice("$ref:".length);
        const v = getByPath(config, ref);
        return v === undefined ? null : v;
    }

    // normal Forestruck
    const v = resolveForestruckValue(sourceJson, mapping?.source, sourcePath);
    return v === undefined ? null : v;
}


/**
 * Resuelve rutas tipo "Item.ItemCode" donde:
 * - "Item" es el InfoType dentro de Document[]
 * - "ItemCode" es la propiedad dentro de ese bloque (plano)
 *
 * También soporta anidado si algún día viniera así.
 */
function resolveForestruckValue(sourceJson, mappingSource, sourcePath) {
    if (!sourcePath) return undefined;

    const indexBy = mappingSource?.indexBy;
    const doc = sourceJson?.Document;

    // Si no hay indexBy, intenta directo sobre el JSON completo
    if (indexBy !== "InfoType") {
        return getByPath(sourceJson, sourcePath);
    }

    const idx = buildIndexByInfoType(doc);

    const parts = String(sourcePath).split(".").filter(Boolean);
    const head = parts[0];
    const rest = parts.slice(1).join(".");

    const base = idx[head];
    if (!base) return undefined;

    // 1) Intento "tal cual" por si un día viene anidado bajo la misma estructura
    // (normalmente dará undefined en tu caso)
    const v1 = getByPath(base, sourcePath);
    if (v1 !== undefined) return v1;

    // 2) Caso real: propiedades planas dentro del bloque InfoType
    // Ej: base.ItemCode / base.DriverName / base.TaxableAmount
    if (!rest) return undefined;
    return getByPath(base, rest);
}

function toNumberOrNull(v) {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
}


function cloneValue(v) {
    // structuredClone no está siempre en todos los WebViews antiguos
    try {
        if (typeof structuredClone === "function") return structuredClone(v);
    } catch { }
    try {
        return JSON.parse(JSON.stringify(v));
    } catch {
        return v; // último recurso (referencia)
    }
}

function applyStaticBlock(gde, blockKey, block) {
    // Por defecto setea en la key del bloque (zona, etc.)
    const targetPath = block?.targetPath || blockKey;

    if (block?.mode === "static") {
        setByPath(gde, targetPath, cloneValue(block?.value));
        return true;
    }

    if (block?.mode === "staticRef") {
        // ref: "parametros.forestruckDefaults.zona" (por ejemplo)
        const ref = block?.ref;
        const val = ref ? getByPath(config, ref) : undefined;
        setByPath(gde, targetPath, cloneValue(val ?? null));
        return true;
    }

    return false;
}


export function buildGdeDraftFromForestruck(sourceJson, mapping) {
    const gde = createGdeDraftDefault();
    const blocks = mapping?.blocks || {};

    // 1) Primero aplica static/staticRef (si existen)
    for (const [blockKey, block] of Object.entries(blocks)) {
        applyStaticBlock(gde, blockKey, block);
    }

    // 2) Luego aplica los bloques JSON (como ya lo tienes)
    for (const [, block] of Object.entries(blocks)) {
        if (block?.mode !== "json") continue;

        const map = block?.map || {};
        for (const [targetPath, sourcePath] of Object.entries(map)) {
            const val = resolveValueOrStatic(sourceJson, mapping, sourcePath);

            if (String(targetPath).startsWith("totales.")) {
                setByPath(gde, targetPath, toNumberOrNull(val));
            } else {
                setByPath(gde, targetPath, val);
            }
        }
    }

    // 3) Finalmente, para combobox deja null (UI resolverá después)
    for (const [blockKey, block] of Object.entries(blocks)) {
        if (block?.mode === "combobox") {
            gde[blockKey] = null;
        }
    }

    return gde;
}

export function getComboPlan(mapping) {
    const blocks = mapping?.blocks || {};
    return Object.entries(blocks)
        .filter(([, b]) => b?.mode === "combobox")
        .map(([key, b]) => ({ key, entity: b.entity }));
}




