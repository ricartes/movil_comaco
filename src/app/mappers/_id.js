// src/app/mappers/_id.js
function sanitizePart(v) {
    return String(v ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')                 // quita acentos
        .replace(/[\u0300-\u036f]/g, '')  // …
        .replace(/[:/\\\s]+/g, '_');      // : / \ y espacios -> _
}

export function makeId(type, ...parts) {
    const t = sanitizePart(type);
    const cleaned = parts.map(p => sanitizePart(p === undefined || p === null ? '-' : p));
    // NO elimines '0': solo vacíos reales
    const valid = cleaned.filter(p => p !== '');
    if (!t || valid.length === 0) throw new Error('makeId(): argumentos inválidos');
    return `${t}:${valid.join(':')}`;
}
