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
    const cfg = config?.parametros ?? {};

    // soporta: cantidadBancos: 6 (legacy) o { camion: 4, carro: 4 }
    const cantidadCfg = cfg.cantidadBancos;

    const cantidadCamion =
        typeof cantidadCfg === "object" && cantidadCfg
            ? Number(cantidadCfg.camion || 0)
            : Number(cantidadCfg || 6);

    const cantidadCarro =
        typeof cantidadCfg === "object" && cantidadCfg
            ? Number(cantidadCfg.carro || 0)
            : 0;

    const total = cantidadCamion + cantidadCarro;

    const largo = Number(doc?.largoProducto || 0);
    const precio = Number(doc?.precioProducto?.precio || 0);

    const tipoCfg = cfg.tipoBanco || { camion: "CAMION", carro: "CARRO" };
    const TIPO_CAMION = tipoCfg.camion ?? "CAMION";
    const TIPO_CARRO = tipoCfg.carro ?? "CARRO";

    return Array.from({ length: total }, (_, i) => {
        const esCamion = i < cantidadCamion;

        return makeDetalleMRBanco(
            i + 1,
            largo,
            precio,
            esCamion ? TIPO_CAMION : TIPO_CARRO,
            esCamion ? (i + 1) : (i - cantidadCamion + 1) // correlativo dentro del tipo
        );
    });
}

export async function saveDetalleMR(gdeId, detalleMR) {
    const cantidadDecimales = config.parametros.cantidadDecimalesMr || 3;
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId);

    doc.detalleMR = detalleMR;

    const volumenReal = detalleMR.reduce(
        (a, b) => a + Number(b.volumen || 0),
        0
    );
    const volumen = Number(volumenReal.toFixed(cantidadDecimales));



    const precioUnitario = Number(doc?.precioProducto?.precio || 0);

    const valor = Math.round(volumen * precioUnitario);

    doc = initTotalesMRIfMissing(doc);
    doc.totales.mr.volumen = volumen;
    doc.totales.mr.valor = valor;
    doc.totales.volMr = doc.totales.mr.volumen;
    doc.totales.totalMr = doc.totales.mr.valor;

    const totals = computeDocTotals(doc, config?.parametros?.unidadesMedida?.MR ?? "MR", { sumAllUMs: false });

    applyTotals(doc, totals);
    doc = await dao.actualizar(doc);
    return doc;
}

/** DTO por fila/banco MR */
function makeDetalleMRBanco(id, largo, precioUnitario, tipoBanco, ordenTipo) {
    return {
        id,
        tipoBanco,   // "CAMION" | "CARRO"
        ordenTipo,   // 1..N dentro de su tipo (opcional pero útil)
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
