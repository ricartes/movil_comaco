// src/app/services/GdeComentarioService.js
import { getGdeDao } from "@/app/services/initServices";
import { numOrNull } from "@/app/helpers/NumHelpers";
import { horaActual } from "@/js/Utils/formatters";
import config from "@/Common/json/config.json";

const PATH = "comentarios";

export async function ensureComentariosInit(id) {
    const dao = getGdeDao();
    const doc = await dao.obtener(id);

    // semillas desde rodal (solo si existen) ()

    const origenForestruck = Number(config?.parametros?.origenGde?.forestruck ?? 2);
    const isForestruck = Number(doc?.gdeOrigen) === origenForestruck;

    //si viene desde forestruck se asigna
    /*const seedFecha = isForestruck
        ? (doc?.comentarios?.fechaPlantacion ?? null)
        : (doc?.rodal?.fechaPlantacion ?? null);*/

    const seedFecha = doc?.rodal?.fechaPlantacion ?? null;


    const seedPlan = doc?.rodal?.planManejo || "";
    const seedX = numOrNull(doc?.ordenCompra?.coordenadaX);
    const seedY = numOrNull(doc?.ordenCompra?.coordenadaY);
    const sedHoraAgendamiento = horaActual();


    // estructura base de comentarios
    const base = {
        cosechaPagada: false,
        maderaPagada: false,
        horaLlegada: null,
        horaSalida: null,
        sectorOrigen: "",
        destino: "",
        guiaProveedor: "",
        volumenProveedor: null,
        anioCosecha: null,
        numeroGuiaAnterior: null,
        horaAgendamiento: horaActual(),
        numeroAgendamiento: null,

        // estos dos se siembran desde rodal si es posible:
        fechaPlantacion: seedFecha,
        planManejo: seedPlan,
        puntoX: seedX,
        puntoY: seedY,
        comentarios: "",
    };

    if (!doc[PATH]) {
        await dao.updateByPath(id, PATH, base);
        return base;
    }

    // ya existe comentarios: completar faltantes con semillas una sola vez
    const curr = doc[PATH] || {};
    const next = { ...curr };
    let needsWrite = false;

    if (next.fechaPlantacion == null && seedFecha != null) {
        next.fechaPlantacion = seedFecha; needsWrite = true;
    }
    if ((next.planManejo == null || next.planManejo === "") && seedPlan) {
        next.planManejo = seedPlan; needsWrite = true;
    }
    if (next.puntoX == null && seedX != null) {
        next.puntoX = seedX; needsWrite = true;
    }
    if (next.puntoY == null && seedY != null) {
        next.puntoY = seedY; needsWrite = true;
    }

    if (next.horaAgendamiento == null && sedHoraAgendamiento != null) {
        next.horaAgendamiento = sedHoraAgendamiento; needsWrite = true;
    }

    if (needsWrite) {
        await dao.updateByPath(id, PATH, next);
    }

    return next;
}

export async function updateComentarios(id, patch) {
    const dao = getGdeDao();
    const doc = await dao.obtener(id);
    const curr = doc[PATH] || {};
    const next = { ...curr, ...patch };

    if ('puntoX' in next) next.puntoX = numOrNull(next.puntoX);
    if ('puntoY' in next) next.puntoY = numOrNull(next.puntoY);

    await dao.updateByPath(id, PATH, next);
    return next;
}

// Por si querés reutilizar en el componente para no permitir edición
export const COMENTARIOS_READONLY_KEYS = ["fechaPlantacion", "planManejo"];
