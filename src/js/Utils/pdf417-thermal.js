import { renderPdf417FromTED } from '@/js/utils/pdf417';

export function stripDataUrl(dataUrlOrBase64) {
    const s = String(dataUrlOrBase64 || '');
    const m = s.match(/^data:image\/png;base64,(.*)$/i);
    return m ? m[1] : s;
}

export async function renderThermalPdf417FromTED(ted) {
    // Genera el PDF417
    const dataUrl = await renderPdf417FromTED(ted, {
        scale: 1,
        height: 8,
        columns: [22, 25, 28],
        securitylevel: [5, 4, 3],
        includetext: false,
    });

    // 🌟 Aquí normalizamos el fondo (blanco sólido)
    const img = new Image();
    return new Promise((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            // fondo blanco
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // sobreescribir código PDF417 (negro)
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}
