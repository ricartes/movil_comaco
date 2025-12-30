import config from "@/Common/json/config.json";

function toNumberOrNull(x) {
    if (x == null || x === "") return null;
    const n = Number(String(x).replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

export function getUM(doc) {
    const um = (doc?.producto?.unidadMedida || "").toString().trim().toUpperCase();
    return um;
}

export function getVolumenByUM(doc, um) {

    const t = doc?.totales || {};
    switch (um) {
        case config.parametros.unidadesMedida.MR:
            return t?.mr?.volumen ?? t?.totalMr ?? t?.volMr ?? null;
        case config.parametros.unidadesMedida.TON:
        case config.parametros.unidadesMedida.BDMT:
        case config.parametros.unidadesMedida.M3ST:
            // ✅ Todas usan la misma fuente (totales.ton)
            return t?.ton?.volumen ?? t?.totalTon ?? t?.volTon ?? null;
        default:
            // fallback clásico (M3 normal)
            return t?.m3?.volumen ?? t?.totalM3 ?? t?.volM3 ?? null;
    }
}




export function homologarUnidadMedida(umRaw) {
    const um = String(umRaw || "").trim().toUpperCase();

    // normalizaciones típicas
    if (um === "M³") return "M3";
    if (um === "TN") return "TON";
    if (um === "TONS") return "TON";
    if (um === "M3ST" || um === "M3 ST") return "M3ST";

    const allowed = config?.parametros?.unidadesMedida || {};
    return allowed[um] ? um : null;
}

// ==============================
// ✅ NUEVOS HELPERS (NO MODIFICAN los existentes)
// ==============================

export function getTotalesBucketByUM(um) {
    const U = String(um || "").trim().toUpperCase();
    const UM = config?.parametros?.unidadesMedida || {};

    switch (U) {
        case UM.MR:
            return "mr";

        case UM.TON:
        case UM.BDMT:
        case UM.M3ST:
            return "ton";

        default:
            return "m3";
    }
}

export function ensureTotales(doc, { resetBuckets = false } = {}) {
    if (!doc) return null;

    doc.totales = doc.totales || {};
    const t = doc.totales;

    if (!t.mr) t.mr = { volumen: 0, valor: 0 };
    if (!t.m3) t.m3 = { volumen: 0, valor: 0 };
    if (!t.ton) t.ton = { volumen: 0, valor: 0 };

    if (resetBuckets) {
        t.mr.volumen = 0; t.mr.valor = 0;
        t.m3.volumen = 0; t.m3.valor = 0;
        t.ton.volumen = 0; t.ton.valor = 0;
    }

    return t;
}



/**
 * Setea volumen/valor en el bucket correcto según UM.
 * - resetBuckets=true: deja en 0 los otros buckets (MR/M3/TON) para evitar basura.
 * - syncLegacy=true: rellena volMr/totalMr etc (si aún los usas en otras pantallas).
 */
export function setTotalesByUM(doc, um, {
    volumen = null,
    valor = null,
    resetBuckets = true,
    syncLegacy = true,
} = {}) {
    if (!doc) return;

    const t = ensureTotales(doc, { resetBuckets });
    if (!t) return;

    const bucket = getTotalesBucketByUM(um);

    const vol = toNumberOrNull(volumen);
    const val = toNumberOrNull(valor);

    if (vol != null) t[bucket].volumen = vol;
    if (val != null) t[bucket].valor = val;

    if (syncLegacy) {
        if (bucket === "mr") {
            t.volMr = t.mr.volumen;
            t.totalMr = t.mr.valor;
        } else if (bucket === "ton") {
            t.volTon = t.ton.volumen;
            t.totalTon = t.ton.valor;
        } else {
            t.volM3 = t.m3.volumen;
            t.totalM3 = t.m3.valor;
        }
    }
}

/**
 * Devuelve el "valor" según UM (similar a getVolumenByUM pero para dinero).
 * NO toca getVolumenByUM.
 */
export function getValorByUM(doc, um) {
    const t = doc?.totales || {};
    const bucket = getTotalesBucketByUM(um);

    if (bucket === "mr") return t?.mr?.valor ?? t?.totalMr ?? null;
    if (bucket === "ton") return t?.ton?.valor ?? t?.totalTon ?? null;
    return t?.m3?.valor ?? t?.totalM3 ?? null;
}

/**
 * Si en tu mapping guardas un volumen genérico en totales.totalVolumen,
 * este helper lo aplica al bucket correcto según UM.
 *
 * Por defecto usa:
 * - volumen = totales.totalVolumen
 * - valor   = totales.totalVolumenValor || totales.neto || totales.total
 */
// ✅ NUEVO: simple y directo
export function applyTotalesFromTotalVolumen(doc, {
    um,               // "MR" | "M3" | "TON" | "BDMT" | "M3ST" ...
    totalVolumen,     // número/string (ej "16.105")
    monto,            // $ (si no lo pasas, usa doc.totales.neto o doc.totales.total)
    resetBuckets = true,
    syncLegacy = true,
} = {}) {
    if (!doc) return;

    // Asegura estructura base
    doc.totales = doc.totales || {};
    const t = doc.totales;

    if (!t.mr) t.mr = { volumen: 0, valor: 0 };
    if (!t.m3) t.m3 = { volumen: 0, valor: 0 };
    if (!t.ton) t.ton = { volumen: 0, valor: 0 };

    // Normaliza números
    const toNum = (x) => {
        if (x == null || x === "") return null;
        const n = Number(String(x).replace(",", "."));
        return Number.isFinite(n) ? n : null;
    };

    const U = String(um || "").trim().toUpperCase();

    // Determinar bucket por UM (misma lógica que tu switch)
    const UM = (config?.parametros?.unidadesMedida) || {};
    let bucket = "m3";
    if (U === UM.MR) bucket = "mr";
    else if (U === UM.TON || U === UM.BDMT || U === UM.M3ST) bucket = "ton";

    const vol = toNum(totalVolumen);
    const val = toNum(monto ?? t?.neto ?? t?.total ?? null);

    // Reset opcional para que no queden “basuras”
    if (resetBuckets) {
        t.mr.volumen = 0; t.mr.valor = 0;
        t.m3.volumen = 0; t.m3.valor = 0;
        t.ton.volumen = 0; t.ton.valor = 0;
    }

    // Set en el bucket correcto
    if (vol != null) t[bucket].volumen = vol;
    if (val != null) t[bucket].valor = val;

    // Compatibilidad “legacy” si la ocupas en otras pantallas
    if (syncLegacy) {
        if (bucket === "mr") {
            t.volMr = t.mr.volumen;
            t.totalMr = t.mr.valor;
        } else if (bucket === "ton") {
            t.volTon = t.ton.volumen;
            t.totalTon = t.ton.valor;
        } else {
            t.volM3 = t.m3.volumen;
            t.totalM3 = t.m3.valor;
        }
    }
}



