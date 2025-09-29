// src/app/services/GdeTonService.js
import { getGdeDao } from "@/app/services/initServices";
import { toNum, computeDocTotals, applyTotals } from "@/app/helpers/TotalesHelpers";
import config from "@/Common/json/config.json";
function toIntCLP(n) {
    const v = Number(n || 0);
    return Math.round(v);
}

export async function ensureTotalesInit(id) {
    const dao = getGdeDao();
    const doc = await dao.obtener(id);

    // Estructura base de totales (escalable)
    if (!doc.totales || typeof doc.totales !== 'object') {
        const nuevo = {
            ton: { volumen: 0, valor: 0 },
            m3: { volumen: 0, valor: 0 },
            mr: { volumen: 0, valor: 0 },
        };
        await dao.updateCampos(id, { totales: nuevo });
        return { volumen: 0, valor: 0, docId: id };
    }

    // Asegura el subobjeto TON
    if (!doc.totales.ton) {
        await dao.updateByPath(id, "totales.ton", { volumen: 0, valor: 0 });
        return { volumen: 0, valor: 0, docId: id };
    }

    // Retorna lo existente (normalizado)
    return {
        volumen: Number(doc.totales.ton.volumen) || 0,
        valor: toIntCLP(doc.totales.ton.valor),
        docId: id,
    };
}

/**
 * Actualiza TON (volumen y valor) en doc.totales.ton
 * - volumen: decimal
 * - valor: entero CLP (volumen * precioUnitario)
 * - si precioUnitario no se envía, se usa doc.precioProducto.precio
 */
export async function actualizarTotalesTon(id, volumen, precioUnitario) {
    const dao = getGdeDao();
    let doc = await dao.obtener(id);

    const precio = Number(
        precioUnitario ?? doc?.precioProducto?.precio ?? 0
    );
    const vol = Number(volumen || 0);
    const valor = toIntCLP(vol * precio);

    doc.totales.ton.volumen = volumen;
    doc.totales.ton.valor = Math.round(valor); // CLP entero

    // Neto/IVA/Total sólo por TON (sin sumar otras UMs)
    const totals = computeDocTotals(doc, config?.parametros?.unidadesMedida?.TON ?? "TON", { sumAllUMs: false });
    applyTotals(doc, totals); // deja neto, ivaPct, ivaMonto, total en doc.totales

    doc = await dao.actualizar(doc);
    return doc;
}
