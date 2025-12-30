// ForestruckImportSummaryBuilder.js
import config from "@/Common/json/config.json"; 

function collectMappedTargetPaths(mapping) {
    const out = new Set();
    const origen = config.parametros.parametrosImportacion.origen;

    const blocks = mapping?.blocks || {};
    for (const [blockKey, block] of Object.entries(blocks)) {
        if (!blockKey || !block) continue;

        // ✅ combobox/static: permitir al menos el prefijo del bloque (ej: "zona", "cliente", "largoProducto")
        if (block.mode === origen.static || block.mode === origen.combobox) {
            out.add(String(blockKey));
            continue;
        }

        // ✅ json: permitir los targetPaths del map (ej: "producto.codProducto", etc)
        if (block.mode === origen.json) {
            const map = block?.map || {};
            for (const targetPath of Object.keys(map)) {
                if (targetPath) out.add(String(targetPath));
            }
        }
    }

    return out;
}


// match flexible:
// - si mapping trae "producto" -> permite "producto.codProducto", etc.
// - si mapping trae "producto.codProducto" -> solo ese, no "producto.nombreProducto"
function isAllowedPath(fieldPath, allowedSet) {
    const p = String(fieldPath || "");
    if (!p) return false;

    for (const a of allowedSet) {
        if (p === a) return true;
        if (p.startsWith(a + ".")) return true;      // mapping más general
        if (a.startsWith(p + ".")) return true;      // field más general (raro, pero útil)
    }
    return false;
}

export function buildForestruckImportSummary(mapping, baseSummary) {
    const allowed = collectMappedTargetPaths(mapping);

    const summary = Array.isArray(baseSummary) ? baseSummary : [];
    const filteredGroups = summary
        .map((g) => {
            const fields = (g?.fields || []).filter((f) =>
                isAllowedPath(f?.path, allowed)
            );
            return fields.length ? { ...g, fields } : null;
        })
        .filter(Boolean);

    return filteredGroups;
}
