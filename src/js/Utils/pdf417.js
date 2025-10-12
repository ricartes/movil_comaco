// src/js/utils/pdf417.js
import bwipjs from 'bwip-js';

// Normaliza TED (sin CR/LF raros, sin espacios finales)
function normalizeTed(ted) {
    return String(ted ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+$/g, '');
}

/**
 * Genera un DataURL PNG con el PDF417 del TED (exigencia SII).
 * Retorna Promise<string> con "data:image/png;base64,..."
 * Intenta combinaciones de columns/securitylevel hasta que quepa.
 */
export async function renderPdf417FromTED(
    ted,
    {
        // valores “objetivo” iniciales; luego el algoritmo los ajusta si no caben
        scale = 2,         // densidad (2–3 suele bastar)
        height = 8,        // alto de fila en px
        columns,           // si lo pasas null/undefined, deja que el algoritmo escoja
        securitylevel,     // idem; 5 es buen equilibrio
        includetext = false,
        aspectratio,
    } = {}
) {
    const text = normalizeTed(ted);
    if (!text) throw new Error('TED vacío para PDF417');


    // Orden de prueba: columnas más anchas primero y luego bajamos el securitylevel si aún no cabe.
    const columnsCandidates = Array.isArray(columns)
        ? columns
        : (columns != null ? [Number(columns)] : [20, 22, 25, 30]); // 20+ suele ser seguro para TED del SII

    const secLevelCandidates = Array.isArray(securitylevel)
        ? securitylevel
        : (securitylevel != null ? [Number(securitylevel)] : [5, 4, 3, 2, 1, 0]);

    // Canvas de destino
    const canvas = document.createElement('canvas');

    // Intentamos combinaciones hasta que alguna funcione
    let lastErr = null;
    for (const col of columnsCandidates) {
        for (const sl of secLevelCandidates) {
            try {
                await bwipjs.toCanvas(canvas, {
                    bcid: 'pdf417',
                    text,
                    scale,
                    height,
                    columns: col,         // 1..30
                    securitylevel: sl,    // 0..8 (redundancia)
                    includetext,
                    ...(aspectratio != null ? { aspectratio } : {}),
                    // Sugerencias adicionales que suelen ir bien con TED:
                    // aspectratio: 3,     // opcional (alto/anchura del símbolo)
                    // readerinit: false,  // dejar en false para TED
                });
                // ¡Listo!
                return canvas.toDataURL('image/png');
            } catch (e) {
                // Guardamos el último error y seguimos probando
                lastErr = e;
                // Si el error NO es de capacidad, paramos y reportamos
                const msg = String(e?.message || e);
                if (!/insufficient capacity|capacity/i.test(msg)) {
                    throw new Error(`Error al generar PDF417: ${msg}`);
                }
            }
        }
    }

    // Si llegamos acá, ninguna combinación cupo
    const dbgCols = columnsCandidates.join(',');
    const dbgSec = secLevelCandidates.join(',');
    throw new Error(
        `El TED no cabe en PDF417 con las combinaciones probadas (columns=[${dbgCols}], securitylevel=[${dbgSec}]). ` +
        `Prueba aumentar columnas o reducir securitylevel. Detalle: ${lastErr?.message || lastErr}`
    );
}
