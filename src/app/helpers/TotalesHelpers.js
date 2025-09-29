// src/utils/TotalesHelpers.js

// ---- Utils base ----

import config from "@/Common/json/config.json";

export const toNum = (v, d = NaN) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
};

export const getEmpresaId = (doc) =>
    String(doc?.empId ?? doc?.empresa?.id ?? "1");

// ---- IVA % desde doc/parametros ----
export function getIvaPctFromDoc(doc, fallback = 19) {
    // 1) Preferir lo que venga directo
    const direct = toNum(doc?.ivaPct ?? doc?.totales?.ivaPct);
    if (Number.isFinite(direct) && direct > 0) return direct;

    // 2) Parametría (id=3; misma empresa)
    const empresaId = getEmpresaId(doc);
    const params = Array.isArray(doc?.parametrosGenerales) ? doc.parametrosGenerales : [];
    const pById = params.find(p => String(p.empId) === empresaId && Number(p.id) === 3);
    const pByGlosa = params.find(p =>
        String(p.empId) === empresaId && String(p.glosa || "").toUpperCase() === "IVA"
    );
    const n = toNum(pById?.valor ?? pByGlosa?.valor);

    // 3) Fallback
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ---- Cálculo de totales a nivel documento ----
// Por defecto neto = totales.mr.valor (como pediste).
// Si más adelante quieres sumar todas las UMs, pasa { sumAllUMs: true }.
export function computeDocTotals(doc, unidadMedida, { sumAllUMs = false } = {}) {
    const mr = toNum(doc?.totales?.mr?.valor, 0);
    const m3 = toNum(doc?.totales?.m3?.valor, 0);
    const ton = toNum(doc?.totales?.ton?.valor, 0);

    if (sumAllUMs) {
        const neto = mr + m3 + ton;
        const ivaPct = getIvaPctFromDoc(doc);
        const ivaMonto = Math.round(neto * (ivaPct / 100));
        const total = Math.round(neto + ivaMonto);
        return { neto, ivaPct, ivaMonto, total };
    }

    // si viene string, normalizamos; si viene constante del config, la usamos tal cual
    const um = (typeof unidadMedida === "string" ? unidadMedida.toUpperCase() : unidadMedida);

    let base = ton; // default a TON
    if (um === config.parametros.unidadesMedida.MR || um === "MR") {
        base = mr;
    } else if (um === config.parametros.unidadesMedida.M3 || um === "M3" || um === "M³") {
        base = m3;
    } else if (um === config.parametros.unidadesMedida.TON || um === "TON" || um === "T") {
        base = ton;
    }

    const ivaPct = getIvaPctFromDoc(doc);
    const ivaMonto = Math.round(base * (ivaPct / 100));
    const total = Math.round(base + ivaMonto);

    return { neto: base, ivaPct, ivaMonto, total };
}


// Vuelca los totales al doc.totales (no toca otras llaves)
export function applyTotals(doc, totals) {
    doc.totales = {
        ...(doc.totales || {}),
        neto: toNum(totals?.neto, 0),
        ivaPct: toNum(totals?.ivaPct, 19),
        ivaMonto: toNum(totals?.ivaMonto, 0),
        total: toNum(totals?.total, 0),
    };
    return doc;
}

// Usa los que vengan; si faltan, calcula
export function extractTotalsOrCompute(doc, unidadMedida, opts) {
    const netoIn = toNum(doc?.totales?.neto);
    const ivaPctIn = toNum(doc?.totales?.ivaPct ?? doc?.ivaPct);
    const ivaIn = toNum(doc?.totales?.ivaMonto);
    const totalIn = toNum(doc?.totales?.total);

    const hasAll = [netoIn, ivaPctIn, ivaIn, totalIn].every(Number.isFinite);
    return hasAll
        ? { neto: netoIn, ivaPct: ivaPctIn, ivaMonto: ivaIn, total: totalIn }
        : computeDocTotals(doc, unidadMedida, opts);
}
