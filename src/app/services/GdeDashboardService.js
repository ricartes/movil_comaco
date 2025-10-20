// src/app/services/GdeDashboardService.js
import ResumenGdeDTO from '@/app/dto/ResumenGdeDTO';
import { getGdeDao } from "@/app/services/initServices";
import config from "@/Common/json/config.json";

export async function obtenerResumen(empId, rutEmisor, opts = {}) {
    const dao = getGdeDao();
    const {
        desde = null,
        hasta = null,
        limitLatest = 10,
        estados = null,
        pageSize = 200,
        maxDaysForSerie = 60,
        onlyUserRut = null,
    } = opts;

    const UM = (config?.parametros?.unidadesMedida) || { MR: 'MR', M3: 'M3', TON: 'TON', BDMT: 'BDMT', M3ST: 'M3ST' };
    const EG = (config?.parametros?.estadosGuia) || {};
    const ID_I = EG?.EMITIDA?.id || 'I';
    const ID_E = EG?.ENVIADA?.id || 'E';
    const ID_N = EG?.NULA?.id || 'N';
    const prio = s => (s === ID_E ? 3 : s === ID_I ? 2 : s === ID_N ? 1 : 0);

    // Acumuladores
    let emitidas = 0, anuladas = 0, totales = 0;
    const umCounts = { MR: 0, M3: 0, ASTILLAS: 0 };
    const astillasSet = new Set([UM.TON, UM.BDMT, UM.M3ST]);
    const serieMap = new Map(); // 'yyyy-mm-dd' -> count

    // Dedup al vuelo
    const byFolio = new Map(); // key -> doc mejor

    // Mantener “Últimas N” sin guardar todo (lista recortada)
    const LATEST_N = limitLatest || 10;
    const latest = [];

    const considerLatest = (d) => {
        const item = {
            empId: d?.empId,
            folio: d?.folio ?? '—',
            estado: d?.estado?.id ?? d?.estado?.texto ?? '—',
            unidadMedida: d?.producto?.unidadMedida ?? '—',
            fechaEmision: d?.createdAt ?? '',
        };
        latest.push(item);
        latest.sort((a, b) => (b.fechaEmision || '').localeCompare(a.fechaEmision || ''));
        if (latest.length > LATEST_N) latest.length = LATEST_N;
    };

    const considerarDoc = (d) => {
        // KPIs/serie/UM sobre el doc seleccionado (mejor por folio)
        totales++;
        const est = String(d?.estado?.id || '').toUpperCase();
        if (est === ID_N) anuladas++; else if (est === ID_I || est === ID_E) emitidas++;

        const um = String(d?.producto?.unidadMedida || '').toUpperCase();
        if (um === UM.MR) umCounts.MR++;
        else if (um === UM.M3) umCounts.M3++;
        else if (astillasSet.has(um)) umCounts.ASTILLAS++;

        const day = (d?.createdAt || '').slice(0, 10);
        if (day) serieMap.set(day, (serieMap.get(day) || 0) + 1);

        considerLatest(d);
    };

    for await (const chunk of dao.iterarParaResumen(empId, rutEmisor, {
        estados,
        desde: desde ? new Date(desde).toISOString() : undefined,
        hasta: hasta ? new Date(hasta).toISOString() : undefined,
        pageSize,
    })) {
        for (const d of chunk) {
            if (onlyUserRut && d?.rutEmisor && d.rutEmisor !== onlyUserRut) continue;

            const key = `${d?.empId}|${d?.folio}`;
            const cur = byFolio.get(key);

            if (!cur) {
                byFolio.set(key, d);
            } else {
                const estNew = String(d?.estado?.id || '');
                const estCur = String(cur?.estado?.id || '');
                const better =
                    prio(estNew) > prio(estCur) ||
                    (prio(estNew) === prio(estCur) && (d?.createdAt || '') > (cur?.createdAt || ''));
                if (better) byFolio.set(key, d);
            }
        }
    }

    // Ahora procesa SOLO los únicos (mejores por folio)
    for (const d of byFolio.values()) considerarDoc(d);

    // Serie ordenada/cortada
    let labels = [...serieMap.keys()].sort();
    if (maxDaysForSerie && labels.length > maxDaysForSerie) labels = labels.slice(-maxDaysForSerie);
    const values = labels.map(k => serieMap.get(k));

    const kpi = { emitidas, anuladas, totales };
    return { kpi, umCounts, serie: { labels, values }, latest, isEmpty: totales === 0 };
}

