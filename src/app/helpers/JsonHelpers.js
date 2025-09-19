export function sanitizeForPouch(doc) {
    // Round-trip JSON elimina funciones, prototipos, undefined, etc.
    return JSON.parse(JSON.stringify(doc, (k, v) => {
        if (v instanceof Date) return v.toISOString();        // por si hay Date
        if (v instanceof Set) return Array.from(v);
        if (v instanceof Map) return Object.fromEntries(v);
        // BigInt no es clonable ni serializable:
        if (typeof v === 'bigint') return v.toString();
        return v;
    }));
}