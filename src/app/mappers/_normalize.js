// src/app/mappers/_normalize.js
export const normalizeRut = (r) =>
    String(r ?? '').toUpperCase().replace(/[.\s]/g, '');

export const normalizePlate = (p) =>
    String(p ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const normalizeName = (n) =>
    String(n ?? '').trim().replace(/\s+/g, ' ').toUpperCase();


export const normalizeText = (t) =>
    String(t ?? '').trim().replace(/\s+/g, ' ').toUpperCase();