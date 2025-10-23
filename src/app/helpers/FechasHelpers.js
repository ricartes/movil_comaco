export function nowLocalIso() {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    const local = new Date(d - tzOffset);
    return local.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
}

export function nowLocalIsoWithOffset() {
    const d = new Date();
    const tz = -d.getTimezoneOffset(); // minutos desde UTC (Chile: +180 o +240)
    const sign = tz >= 0 ? '+' : '-';
    const abs = Math.abs(tz);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');

    const tzOffset = d.getTimezoneOffset() * 60000;
    const local = new Date(d - tzOffset);
    return `${local.toISOString().slice(0, 19)}${sign}${hh}:${mm}`; // "YYYY-MM-DDTHH:mm:ss-03:00"
}

// --- helper: arma el rango (00:00:00 a 23:59:59) en el MISMO formato sin Z ni ms ---
export function dayRangeLocalString(fecha) {
    const d = new Date(fecha);
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const start = `${y}-${m}-${day}T00:00:00`;
    const end = `${y}-${m}-${day}T23:59:59`;
    return { desde: start, hasta: end };
}

// helpers/FechasHelpers.js
export function fechaLocalDesdeISOdia(fechaISO /* "YYYY-MM-DD" */) {
    // Fuerza medianoche local para evitar drift por timezone
    const [y, m, d] = fechaISO.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// Fecha: "2025-10-23T00:38:31" -> { ddmmyyyy:"23 - 10 - 2025", larga:"Miércoles 23/10/25" }
export function formatearFechasConNombreDia(fechaISO) {
    const dt = fechaLocalDesdeISOdia(fechaISO);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    const corta = `${dd} - ${mm} - ${yyyy}`;

    const opts = { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' };
    const larga = dt.toLocaleDateString('es-CL', opts)
        .replace(',', '')           // ej. "miércoles, 22-10-25" -> "miércoles 22-10-25"
        .replace(/^\w/, c => c.toUpperCase()); // capitaliza inicial

    return { ddmmyyyy: corta, larga };
}
