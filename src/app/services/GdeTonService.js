// src/app/services/GdeTonService.js
import { getGdeDao } from "@/app/services/initServices";

function toIntCLP(n) {
    // si es NaN => 0; si es decimal => entero CLP
    const v = Number(n || 0);
    return Math.round(v);
}

export async function ensureTotalesInit(id) {
    const dao = getGdeDao();
    const doc = await dao.obtener(id);

    if (!doc.totales || typeof doc.totales !== 'object') {
        await dao.updateCampos(id, {
            totales: { ton: { volumen: 0, valor: 0 }, m3: { volumen: 0, valor: 0 }, mr: { volumen: 0, valor: 0 } }
        });
        return { volumen: 0, valor: 0, docId: id };
    }

    if (!doc.totales.ton) {
        await dao.updateByPath(id, "totales.ton", { volumen: 0, valor: 0 });
        return { volumen: 0, valor: 0, docId: id };
    }

    return { volumen: Number(doc.totales.ton.volumen) || 0, valor: toIntCLP(doc.totales.ton.valor), docId: id };
}

/**
 * Actualiza TON (volumen y valor) en doc.totales.ton
 * - volumen: decimal
 * - valor: entero CLP (volumen * precioProducto.precio)
 */
export async function actualizarTotalesTon(id, volumen, precioUnitario) {
    const dao = getGdeDao();
    const doc = await dao.obtener(id);

    const precio = Number(precioUnitario ?? doc?.precioProducto?.precio ?? 0);
    const vol = Number(volumen || 0);
    const valor = toIntCLP(vol * precio);

    await dao.updateByPath(id, "totales.ton", { volumen: vol, valor });

    return { volumen: vol, valor };
}
