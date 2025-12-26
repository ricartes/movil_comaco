// MappingUtils.js
export function getByPath(obj, path) {
    if (obj == null || !path) return undefined;

    const parts = String(path).split(".").filter(Boolean);
    let cur = obj;

    for (const p of parts) {
        if (cur == null) return undefined;

        const m = String(p).match(/^([^\[\]]+)\[(\d+)\]$/);
        if (m) {
            const key = m[1];
            const idx = Number(m[2]);
            cur = cur?.[key]?.[idx];
        } else {
            cur = cur?.[p];
        }
    }
    return cur;
}

export function setByPath(obj, path, value) {
    if (obj == null || !path) return;

    const parts = String(path).split(".").filter(Boolean);
    let cur = obj;

    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const isLast = i === parts.length - 1;

        const m = String(p).match(/^([^\[\]]+)\[(\d+)\]$/);
        if (m) {
            const key = m[1];
            const idx = Number(m[2]);

            if (!Array.isArray(cur[key])) cur[key] = [];
            if (cur[key][idx] == null || typeof cur[key][idx] !== "object") cur[key][idx] = {};

            if (isLast) {
                cur[key][idx] = value;
                return;
            }

            cur = cur[key][idx];
            continue;
        }

        if (isLast) {
            cur[p] = value;
            return;
        }

        if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
        cur = cur[p];
    }
}
