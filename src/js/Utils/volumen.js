import config from "@/Common/json/config.json";



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
