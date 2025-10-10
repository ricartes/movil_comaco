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