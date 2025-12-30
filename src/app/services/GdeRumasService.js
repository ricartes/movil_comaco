// src/app/services/GdeRumasService.js
import { getGdeDao } from "@/app/services/initServices";
import { toNum, computeDocTotals, applyTotals } from "@/app/helpers/TotalesHelpers";
import { getAnchoCamion, getAnchoCarro, tieneCarro } from "@/app/helpers/AnchoPatentesHelper";

import config from "@/Common/json/config.json";

function isForestruckDoc(doc) {
    const ORIGEN_FORESTRUCK = config?.parametros?.origenGde?.forestruck ?? 2;
    return Number(doc?.gdeOrigen) === Number(ORIGEN_FORESTRUCK);
}


/** público: asegura que exista detalleMR en la GDE */
export async function ensureDetalleMR(gdeId) {
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId);

    if (isForestruckDoc(doc)) {
        return { doc, detalleMR: Array.isArray(doc.detalleMR) ? doc.detalleMR : [] };
    } else {
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


}

export function generarDetalleMR(doc) {
    const cfg = config?.parametros ?? {};
    const cantidadCfg = cfg.cantidadBancos;

    const cantidadCamion =
        typeof cantidadCfg === "object" && cantidadCfg
            ? Number(cantidadCfg.camion || 0)
            : Number(cantidadCfg || 6);

    const hayCarro = tieneCarro(doc);

    const cantidadCarro =
        hayCarro && typeof cantidadCfg === "object" && cantidadCfg
            ? Number(cantidadCfg.carro || 0)
            : 0;

    const total = cantidadCamion + cantidadCarro;

    const largo = Number(doc?.largoProducto || 0);
    const precio = Number(doc?.precioProducto?.precio || 0);

    const tipoCfg = cfg.tipoBanco || { camion: "CAMION", carro: "CARRO" };
    const TIPO_CAMION = tipoCfg.camion ?? "CAMION";
    const TIPO_CARRO = tipoCfg.carro ?? "CARRO";

    const anchoCamion = getAnchoCamion(doc);
    const anchoCarro = getAnchoCarro(doc);

    return Array.from({ length: total }, (_, i) => {
        const esCamion = i < cantidadCamion;

        const banco = makeDetalleMRBanco(
            i + 1,
            largo,
            precio,
            esCamion ? TIPO_CAMION : TIPO_CARRO,
            esCamion ? (i + 1) : (i - cantidadCamion + 1)
        );

        // ancho por defecto según tipo (si existe)
        banco.ancho = esCamion ? (anchoCamion ?? 0) : (anchoCarro ?? 0);

        return banco;
    });
}


export async function saveDetalleMR(gdeId, detalleMR) {
    const cantidadDecimales = config.parametros.cantidadDecimalesMr || 3;
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId);

    if (isForestruckDoc(doc)) {
        // opcional: igual puedes guardar detalleMR si algún día lo agregas,
        // pero NO tocar totales.
        doc.detalleMR = Array.isArray(detalleMR) ? detalleMR : [];
        doc = await dao.actualizar(doc);
        return doc;
    } else {
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
