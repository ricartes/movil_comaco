// src/app/services/GdeRumasService.js
import { getGdeDao } from "@/app/services/initServices";
import { toNum, computeDocTotals, applyTotals } from "@/app/helpers/TotalesHelpers";

import config from "@/Common/json/config.json";




/** público: asegura que exista detalleMR en la GDE */
export async function ensureDetalleMR(gdeId) {
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId);

    if (!Array.isArray(doc.detalleMR)) {
        const detalleMR = generarDetalleMR(doc);
        doc.detalleMR = detalleMR;

        // totales MR en 0 si faltan
        doc = initTotalesMRIfMissing(doc);

        // GUARDAR por el DAO
        doc = await dao.actualizar(doc);
        return { doc, detalleMR };
    }

    return { doc, detalleMR: doc.detalleMR };
}

export function generarDetalleMR(doc) {
    const cantidad = Number(config.parametros.cantidadBancos || 6);
    const largo = Number(doc?.largoProducto || 0);
    const precio = Number(doc?.precioProducto?.precio || 0);

    return Array.from({ length: cantidad }, (_, i) =>
        makeDetalleMRBanco(i + 1, largo, precio)
    );
}

export async function saveDetalleMR(gdeId, detalleMR) {
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId);

    doc.detalleMR = detalleMR;

    const volumen = detalleMR.reduce((a, b) => a + Number(b.volumen || 0), 0);
    const valor = detalleMR.reduce((a, b) => a + Number(b.totalPrecio || 0), 0);

    doc = initTotalesMRIfMissing(doc);
    doc.totales.mr.volumen = volumen;
    doc.totales.mr.valor = Math.round(valor); // CLP entero

    const totals = computeDocTotals(doc, config?.parametros?.unidadesMedida?.MR ?? "MR", { sumAllUMs: false });

    console.log(totals);
    applyTotals(doc, totals);

    doc = await dao.actualizar(doc);
    return doc;
}

/** DTO por fila/banco MR */
function makeDetalleMRBanco(id, largo, precioUnitario) {
    return {
        id,
        ancho: 0,
        largo,
        precioUnitario,
        alturaIzquierda: 0,
        alturaDerecha: 0,
        volumen: 0,
        totalPrecio: 0,
    };
}

function initTotalesMRIfMissing(doc) {
    if (!doc.totales || typeof doc.totales !== "object") doc.totales = {};
    if (!doc.totales.mr) doc.totales.mr = { volumen: 0, valor: 0 };
    // si mantienes alias legacy:
    if (doc.totales.totalMr == null) doc.totales.totalMr = 0;
    if (doc.totales.volMr == null) doc.totales.volMr = 0;
    return doc;
}
