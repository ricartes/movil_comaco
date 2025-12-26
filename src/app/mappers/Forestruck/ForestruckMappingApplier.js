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

export function buildGdeDraftFromForestruck(sourceJson, mapping) {
    const gde = createGdeDraftDefault();

    const blocks = mapping?.blocks || {};
    for (const [, block] of Object.entries(blocks)) {
        if (block?.mode !== "json") continue;

        const map = block?.map || {};
        for (const [targetPath, sourcePath] of Object.entries(map)) {
            const raw = resolveForestruckValue(sourceJson, mapping?.source, sourcePath);
            const val = raw === undefined ? null : raw;

            // casteo de números solo para totales (como definimos)
            if (String(targetPath).startsWith("totales.")) {
                setByPath(gde, targetPath, toNumberOrNull(val));
            } else {
                setByPath(gde, targetPath, val);
            }
        }
    }

    // Importante: NO meter __pendingCombos en el objeto guardado.
    // Si el mapping declara bloques combobox, solo dejamos la propiedad null en el draft.
    for (const [blockKey, block] of Object.entries(blocks)) {
        if (block?.mode === "combobox") {
            // Solo si no existe ya (por si el draft base lo trae)
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


