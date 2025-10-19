// src/app/services/GdeDashboardService.js
import ResumenGdeDTO from '@/app/dto/ResumenGdeDTO';
import { getGdeDao } from "@/app/services/initServices";
import config from "@/Common/json/config.json";

export async function obtenerResumen(empId, rutEmisor, opts = {}) {


    const dao = getGdeDao();
    const lista = dao.listar();
    console.log(lista);
    const {
        desde = null,
        hasta = null,
        limitLatest = 10,
        estados = null,
        pageSize = 200,
        maxDaysForSerie = 60,
        onlyUserRut = null, // 👈 opcional: filtrar “solo mis guías”
    } = opts;

    // ---- defensivo por si config cambia/varía ----
    const UM = (config?.parametros?.unidadesMedida) || { MR: 'MR', M3: 'M3', TON: 'TON', BDMT: 'BDMT', M3ST: 'M3ST' };
    const EG = (config?.parametros?.estadosGuia) || {};
    const ID_EMITIDA = EG?.EMITIDA?.id || 'I';
    const ID_ENVIADA = EG?.ENVIADA?.id || 'E';
    const ID_NULA = EG?.NULA?.id || 'N';

    let emitidas = 0, anuladas = 0, totales = 0;

    const umCounts = { MR: 0, M3: 0, ASTILLAS: 0 };
    const astillasSet = new Set([UM.TON, UM.BDMT, UM.M3ST]);
    const EMITIDAS_SET = new Set([ID_EMITIDA, ID_ENVIADA]);

    const serieMap = new Map();         // yyyy-mm-dd -> count
    const latestArr = [];               // últimas N del criterio activo
    const LATEST_N = limitLatest || 10;

    function pushLatest(d) {
        const item = {
            empId: d?.empId,
            folio: d?.folio ?? '—',
            estado: d?.estado?.id ?? d?.estado?.texto ?? '—',
            unidadMedida: d?.producto?.unidadMedida ?? '—',
            fechaEmision: d?.createdAt ?? '',
        };
        latestArr.push(item);
        // ordena desc por fecha y recorta a N
        latestArr.sort((a, b) => (b.fechaEmision || '').localeCompare(a.fechaEmision || ''));
        if (latestArr.length > LATEST_N) latestArr.length = LATEST_N;
    }

    // ---- iteración por bloques (respeta filtros) ----
    for await (const chunk of dao.iterarParaResumen(empId, rutEmisor, {
        estados,
        desde: desde ? new Date(desde).toISOString() : undefined,
        hasta: hasta ? new Date(hasta).toISOString() : undefined,
        pageSize,
    })) {
        for (const d of chunk) {

            if (!d?.folio && !d?.idGuia) {
                console.warn("⚠️ Guía sin folio detectada:", d);
            } else {
                console.log("🧾 Guía:", {
                    folio: d?.folio,
                    estado: d?.estado?.id,
                    fecha: d?.createdAt,
                    producto: d?.producto?.unidadMedida,
                    usuario: d?.usuarioRut,
                });
            }


            // filtro opcional por usuario (solo si lo piden)
            if (onlyUserRut && d?.usuarioRut && d.usuarioRut !== onlyUserRut) continue;

            totales++;

            // estado
            const est = String(d?.estado?.id || '').toUpperCase();
            if (EMITIDAS_SET.has(est)) emitidas++;
            else if (est === ID_NULA) anuladas++;

            // UM
            const um = String(d?.producto?.unidadMedida || '').toUpperCase();
            if (um === UM.MR) umCounts.MR++;
            else if (um === UM.M3) umCounts.M3++;
            else if (astillasSet.has(um)) umCounts.ASTILLAS++;

            // serie por fecha (createdAt)
            const day = (d?.createdAt || '').slice(0, 10);
            if (day) serieMap.set(day, (serieMap.get(day) || 0) + 1);

            // últimas N (consistentes con el criterio)
            pushLatest(d);
        }
    }

    // Serie ordenada y (opcional) recortada
    let labels = [...serieMap.keys()].sort();
    if (maxDaysForSerie && labels.length > maxDaysForSerie) {
        labels = labels.slice(-maxDaysForSerie);
    }
    const values = labels.map(k => serieMap.get(k));
    const serie = { labels, values };

    // últimas (ya calculadas con el criterio)
    const latest = latestArr;

    const kpi = { emitidas, anuladas, totales };
    const payload = { kpi, umCounts, serie, latest, isEmpty: totales === 0 };

    // si usas DTO, lo envolvemos; si no, devuelve POJO (recomendado)
    return new ResumenGdeDTO(payload);
    // return payload; // <- alternativa recomendada para evitar issues de reactividad
}
