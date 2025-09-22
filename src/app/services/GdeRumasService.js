import config from "@/Common/json/config.json";
import { getGdeDao } from "@/app/services/initServices";


export async function ensureDetalleMR(gdeId) {
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId); // doc completo

    if (!Array.isArray(doc.detalleMR)) {
        const detalleMR = generarDetalleMR(doc);
        doc.detalleMR = detalleMR;

        // inicializa totales MR en 0 si no existe estructura
        doc = initTotalesMRIfMissing(doc);

        // guarda inmediatamente
        // si tu DAO ya tiene `actualizar`, úsalo; si no, this.db.put(doc)
        if (typeof dao.actualizar === "function") {
            await dao.actualizar(doc);
        } else {
            await dao.db.put(doc); // según tu implementación
        }

        return { doc, detalleMR };
    }

    // ya existía
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

    // set y recalcular totales MR
    doc.detalleMR = detalleMR;

    const volumen = detalleMR.reduce((a, b) => a + Number(b.volumen || 0), 0);
    const valor = detalleMR.reduce((a, b) => a + Number(b.totalPrecio || 0), 0);

    doc = initTotalesMRIfMissing(doc);
    doc.totales.mr.volumen = volumen;
    doc.totales.mr.valor = Math.round(valor);


    if (typeof dao.actualizar === "function") {
        await dao.actualizar(doc);
    } else {
        await dao.db.put(doc);
    }
    return doc;
}

/**
 * @returns {{id:number, ancho:number, largo:number, precioUnitario:number,
 * alturaIzquierda:number, alturaDerecha:number, volumen:number, totalPrecio:number}}
 */
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
    if (!doc.totales || typeof doc.totales !== "object") {
        doc.totales = {};
    }
    // forma “escalable” por unidad
    if (!doc.totales.mr) {
        doc.totales.mr = { volumen: 0, valor: 0 };
    }
    // si mantienes también campos antiguos/planos:
    if (doc.totales.totalMr == null) doc.totales.totalMr = 0;
    if (doc.totales.volMr == null) doc.totales.volMr = 0;

    return doc;
}