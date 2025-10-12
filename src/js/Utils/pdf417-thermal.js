// src/js/utils/pdf417-thermal.js (o donde tienes renderThermalPdf417FromTED)
import { renderPdf417FromTED } from '@/js/utils/pdf417';

export function stripDataUrl(s = '') {
    const m = String(s).match(/^data:image\/png;base64,(.*)$/i);
    return m ? m[1] : s;
}

/**
 * Genera PNG PDF417 para térmica, con fondo blanco y reescalado final.
 * @param {string} ted
 * @param {object} opts
 *  - targetWidth  px   (ej. 576 para 80mm @203dpi)
 *  - targetHeight px   (ej. 260–320 para buena altura)
 *  - fit: 'fit'|'fill' 'fit' = conserva aspecto, 'fill' = estira para llenar
 *  - columns, securitylevel, scale, height, aspectratio, quiet...
 */
export async function renderThermalPdf417FromTED(
    ted,
    {
        // 👉 Símbolo base bien ancho y con buena altura
        scale = 3,
        height = 10,
        columns = [34, 32, 30, 28, 26], // alta prioridad a ancho
        securitylevel = [5],
        includetext = false,
        aspectratio = 4,              // ↑ = más alto sin tocar columnas
        quiet = 4,

        // 👉 salida final (80mm = ~576px @203dpi)
        targetWidth = 576,
        targetHeight = 300,             // ajusta a gusto (280–340 suele ir bien)
        fit = 'fit',                    // 'fit' o 'fill'
    } = {}
) {
    const dataUrl = await renderPdf417FromTED(ted, {
        scale, height, columns, securitylevel, includetext, aspectratio,
    });

    const img = new Image();
    return new Promise((resolve, reject) => {
        img.onload = () => {
            // base con "quiet zone"
            const base = document.createElement('canvas');
            base.width = img.width + quiet * 2;
            base.height = img.height + quiet * 2;
            const bctx = base.getContext('2d');
            bctx.fillStyle = '#FFFFFF';
            bctx.fillRect(0, 0, base.width, base.height);
            bctx.imageSmoothingEnabled = false;
            bctx.drawImage(img, quiet, quiet);

            // calcular tamaño de salida
            const inW = base.width, inH = base.height;
            const inRatio = inW ? (inH / inW) : 1;
            let outW = targetWidth;
            let outH = targetHeight;

            if (fit === 'fit') {
                // conserva aspecto y cabe en el rectángulo (letterbox)
                const byW = targetWidth;
                const byH = Math.round(byW * inRatio);
                if (byH <= targetHeight) {
                    outW = byW; outH = byH;
                } else {
                    outH = targetHeight; outW = Math.round(outH / inRatio);
                }
            } else {
                // 'fill' = llena todo, aunque deforme un poco (suele scannear igual)
                outW = targetWidth;
                outH = targetHeight;
            }

            const out = document.createElement('canvas');
            out.width = outW;
            out.height = outH;
            const octx = out.getContext('2d');
            octx.imageSmoothingEnabled = false; // nítido
            octx.fillStyle = '#FFFFFF';
            octx.fillRect(0, 0, outW, outH);
            octx.drawImage(base, 0, 0, outW, outH);

            resolve(out.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}
