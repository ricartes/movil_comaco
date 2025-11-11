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

    // 1) volumen real que llega
    const volReal = Number(volumen || 0);

    const cantidadDecimales = config.parametros.cantidadDecimalesTon || 3;

    // 2) volumen "comercial" (misma lógica que MR/M3, ej: 3 decimales)
    const vol = Number(volReal.toFixed(cantidadDecimales));

    // 3) neto comercial en base a ese volumen redondeado
    const valor = toIntCLP(vol * precio);

    // Guardar en doc.totales.ton
    doc.totales.ton.volumen = vol;
    doc.totales.ton.valor = valor; // ya viene entero

    // Neto/IVA/Total sólo por TON (sin sumar otras UMs)
    const totals = computeDocTotals(
        doc,
        config?.parametros?.unidadesMedida?.TON ?? "TON",
        { sumAllUMs: false }
    );
    applyTotals(doc, totals);

    doc = await dao.actualizar(doc);
    return doc;
}

