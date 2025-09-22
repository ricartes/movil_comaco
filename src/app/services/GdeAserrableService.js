// src/app/services/GdeAserrableService.js
import { getGdeDao } from "@/app/services/initServices";
import config from "@/Common/json/config.json";
function toIntCLP(n) {
    const v = Number(n || 0);
    return Math.round(v);
}

// Fórmula que usabas: área = (diam/100)^2  (sin π), vol = área * largo * trozos
export function calcVolumenM3(diametro, largo, trozos) {
    const d = Number(diametro) || 0;
    const L = Number(largo) || 0;
    const t = Number(trozos) || 0;
    const area = (d / 100) * (d / 100);
    return area * L * t;
}

function makeDetalleM3Fila(diametro, largo, precioUnitario) {
    return {
        diametro,                 // (int)
        trozos: 0,               // (int >= 0)
        largo,                   // (num)
        precioUnitario,          // (num)
        volumen: 0,              // (num)
        totalPrecio: 0,          // (int CLP)
    };
}

export function generarDetalleM3(doc) {
    const largo = Number(doc?.largoProducto || 0);
    const precio = Number(doc?.precioProducto?.precio || 0);
    const diametroDesde = config.parametros.diametroDesde;
    const diametroHasta = config.parametros.diametroHasta;
    const filas = [];
    for (let d = diametroDesde; d <= diametroHasta; d += 2) {
        filas.push(makeDetalleM3Fila(d, largo, precio));
    }
    return filas;
}

function ensureTotalesM3Object(doc) {
    if (!doc.totales || typeof doc.totales !== "object") doc.totales = {};
    if (!doc.totales.m3) doc.totales.m3 = { volumen: 0, valor: 0 };
    // compat opcional:
    if (doc.totales.totalM3 == null) doc.totales.totalM3 = 0;
    if (doc.totales.volM3 == null) doc.totales.volM3 = 0;
    return doc;
}

/**
 * Carga el doc y garantiza que tenga detalleM3 y totales.m3.
 * Si no existe, genera y guarda.
 * Retorna { doc, detalleM3 }
 */
export async function ensureDetalleM3(gdeId) {
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId);

    if (!Array.isArray(doc.detalleM3)) {
        const detalleM3 = generarDetalleM3(doc);
        doc.detalleM3 = detalleM3;

        // recalcular totales (0 al inicio)
        doc = ensureTotalesM3Object(doc);
        doc.totales.m3.volumen = 0;
        doc.totales.m3.valor = 0;
        doc.totales.volM3 = 0;
        doc.totales.totalM3 = 0;

        if (typeof dao.actualizar === "function") {
            await dao.actualizar(doc);
        } else {
            await dao.db.put(doc);
        }
        return { doc, detalleM3 };
    }

    // ya existía
    return { doc, detalleM3: doc.detalleM3 };
}

/**
 * Persiste el arreglo completo y recalcula totales.m3 (valor entero CLP).
 */
export async function saveDetalleM3(gdeId, detalleM3, precioUnitarioFallback) {
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId);

    // Asegurar precio/largo por si cambian en el doc
    const largo = Number(doc?.largoProducto || 0);
    const precioBase = Number(doc?.precioProducto?.precio ?? precioUnitarioFallback ?? 0);

    // Normalizamos, recalculamos fila a fila
    const filas = detalleM3.map((f) => {
        const trozos = Number(f.trozos || 0);
        const diametro = Number(f.diametro || 0);
        const precioUnitario = Number(f.precioUnitario ?? precioBase);
        const vol = calcVolumenM3(diametro, largo, trozos);
        const totalPrecio = toIntCLP(vol * precioUnitario);

        return {
            diametro,
            trozos,
            largo, // sincronizamos largo actual
            precioUnitario,
            volumen: vol,
            totalPrecio,
        };
    });

    // Totales
    const volTotal = filas.reduce((a, b) => a + (Number(b.volumen) || 0), 0);
    const valorTotal = filas.reduce((a, b) => a + (Number(b.totalPrecio) || 0), 0);

    // Guardar en doc
    doc.detalleM3 = filas;
    doc = ensureTotalesM3Object(doc);
    doc.totales.m3.volumen = volTotal;
    doc.totales.m3.valor = toIntCLP(valorTotal);
    // compat opcional
    doc.totales.volM3 = volTotal;
    doc.totales.totalM3 = toIntCLP(valorTotal);

    if (typeof dao.actualizar === "function") {
        await dao.actualizar(doc);
    } else {
        await dao.db.put(doc);
    }

    return { doc, detalleM3: filas, totales: { volumen: volTotal, valor: toIntCLP(valorTotal) } };
}

/**
 * Actualiza SOLO una fila (un diámetro) y guarda.
 * Útil cuando cambias un trozo desde la UI.
 */
export async function updateM3Item(gdeId, diametro, trozos) {
    const dao = getGdeDao();
    let doc = await dao.obtener(gdeId);

    if (!Array.isArray(doc.detalleM3)) {
        // si no existe lo generamos
        const init = await ensureDetalleM3(gdeId);
        doc = init.doc;
    }

    const idx = doc.detalleM3.findIndex((f) => Number(f.diametro) === Number(diametro));
    const largo = Number(doc?.largoProducto || 0);
    const precioUnit = Number(doc?.precioProducto?.precio || doc.detalleM3[idx]?.precioUnitario || 0);

    if (idx >= 0) {
        const vol = calcVolumenM3(diametro, largo, Number(trozos || 0));
        doc.detalleM3[idx] = {
            ...doc.detalleM3[idx],
            trozos: Number(trozos || 0),
            largo,
            precioUnitario: precioUnit,
            volumen: vol,
            totalPrecio: toIntCLP(vol * precioUnit),
        };
    } else {
        // si no estaba, la creamos
        const vol = calcVolumenM3(diametro, largo, Number(trozos || 0));
        doc.detalleM3.push({
            diametro: Number(diametro),
            trozos: Number(trozos || 0),
            largo,
            precioUnitario: precioUnit,
            volumen: vol,
            totalPrecio: toIntCLP(vol * precioUnit),
        });
    }

    // Recalcular totales
    const volTotal = doc.detalleM3.reduce((a, b) => a + (Number(b.volumen) || 0), 0);
    const valorTotal = doc.detalleM3.reduce((a, b) => a + (Number(b.totalPrecio) || 0), 0);

    doc = ensureTotalesM3Object(doc);
    doc.totales.m3.volumen = volTotal;
    doc.totales.m3.valor = toIntCLP(valorTotal);
    doc.totales.volM3 = volTotal;
    doc.totales.totalM3 = toIntCLP(valorTotal);

    if (typeof dao.actualizar === "function") {
        await dao.actualizar(doc);
    } else {
        await dao.db.put(doc);
    }

    return { doc, detalleM3: doc.detalleM3, totales: { volumen: volTotal, valor: toIntCLP(valorTotal) } };
}
