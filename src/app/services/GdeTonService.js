// src/app/services/GdeTonService.js
import { getGdeDao } from "@/app/services/initServices";

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
    const doc = await dao.obtener(id);

    const precio = Number(
        precioUnitario ?? doc?.precioProducto?.precio ?? 0
    );
    const vol = Number(volumen || 0);
    const valor = toIntCLP(vol * precio);

    await dao.updateByPath(id, "totales.ton", { volumen: vol, valor });
    return { volumen: vol, valor };
}
