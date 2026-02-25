// src/js/Utils/formatters.js

// ------------------------
// Internos
// ------------------------
function _parseYmd(input) {
    if (!input) return null;
    const s = String(input).trim();

    // ✅ año-only: "1995" -> 1995-01-01
    const yOnly = s.match(/^(\d{4})$/);
    if (yOnly) return { y: +yOnly[1], m: 1, d: 1 };

    // ya lo tienes:
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return { y: +m[1], m: +m[2], d: +m[3] };

    const d = new Date(s);
    if (Number.isNaN(+d)) return null;
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

// ------------------------
// Público (exportado)
// ------------------------
export function formatMoneyCLP(n) {
    const v = Number(n || 0);
    return v.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    });
}

export function formateaVolumen(v) {
    const n = Number(v) || 0;
    return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

/** dd/MM/yyyy a partir de 'YYYY-MM-DD' o ISO con hora */
export function formatFechaCorta(input) {
    const p = _parseYmd(input);
    if (!p) return '—';
    const dd = String(p.d).padStart(2, '0');
    const mm = String(p.m).padStart(2, '0');
    return `${dd}/${mm}/${p.y}`;
}

/** Alias legacy si ya usas `formatFecha` en la app */
export function formatFecha(input) {
    return formatFechaCorta(input);
}

/** dd/MM/yyyy HH:mm a partir de ISO con hora */
export function formatFechaHoraCorta(input) {
    if (!input) return '—';
    const d = new Date(input);
    if (Number.isNaN(+d)) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${HH}:${MM}`;
}

/** 'YYYY-MM-DD' → ISO al inicio del día local (00:00:00.000) */
export function dateInputToISOStart(yyyyMmDd) {
    if (!yyyyMmDd) return undefined;
    const [y, m, d] = String(yyyyMmDd).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    return Number.isNaN(+dt) ? undefined : dt.toISOString();
}

/** 'YYYY-MM-DD' → ISO al fin del día local (23:59:59.999) */
export function dateInputToISOEnd(yyyyMmDd) {
    if (!yyyyMmDd) return undefined;
    const [y, m, d] = String(yyyyMmDd).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
    return Number.isNaN(+dt) ? undefined : dt.toISOString();
}


/**
 * Indica hora actual
 * @returns 
 */
export function horaActual() {

    const ahora = new Date();
    const hh = String(ahora.getHours()).padStart(2, "0");
    const mm = String(ahora.getMinutes()).padStart(2, "0");

    return `${hh}:${mm}`;
}


export function normalizeToISODate(val) {
    if (!val) return null;
    const s = String(val).trim();

    // "1995" -> "1995-01-01"
    if (/^\d{4}$/.test(s)) return `${s}-01-01`;

    // "1995-03-10" -> "1995-03-10"
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // ISO con hora u otros parseables -> "YYYY-MM-DD"
    const d = new Date(s);
    if (Number.isNaN(+d)) return null;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}


// dateUtils.js
export function normalizeYYYYMM(val) {
    if (!val) return null;
    const s = String(val).trim();
    if (/^\d{4}$/.test(s)) return `${s}-01`;
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    return null;
}

export function formatMMYYYY(val) {
    const norm = normalizeYYYYMM(val);
    if (!norm) return "—";

    const [y, m] = norm.split("-");
    return `${m}/${y}`;
}


export function pretty(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}
