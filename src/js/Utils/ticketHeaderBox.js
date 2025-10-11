// src/js/Utils/ticketHeaderBox.js
// Genera una imagen PNG base64 con un rectángulo y 3 líneas centradas.
// Pensado para 80mm (≈576 px @203 dpi). Sirve también en 58mm bajando el width.

export function generateHeaderBoxBase64({
    rut = 'R.U.T.: 79825060-4',
    title = 'GUÍA DE DESPACHO\nELECTRÓNICA',
    folio = 'N°: 32536',
    width = 576,         // 80mm común: 576 o 640 px; ajusta si tu impresora usa otro DPR
    bgColor = '#eeeeee', // O '#ffffff' si quieres blanco puro
    strokeColor = '#000000', // O rojo (#c62828). Ojo: la mayoría de térmicas imprimen en negro.
    textColor = '#000000',
    border = 8,          // grosor del borde
    padding = 24,        // padding interior
    fontFamily = 'sans-serif'
} = {}) {
    // Altura “auto”: calculamos según líneas
    const lines = [
        String(rut || '').toUpperCase(),
        ...String(title || '').toUpperCase().split('\n'),
        String(folio || '').toUpperCase(),
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // heurística de tipografías para 80mm
    const lineHeights = [36, 44, 36]; // RUT, Título, Folio (el título se parte en 2 líneas)
    const titleIsTwoLines = lines.length === 4; // RUT + 2 del título + Folio
    const totalTextLines = titleIsTwoLines ? 4 : lines.length;

    // Altura estimada
    const baseLine = 40;
    const contentHeight =
        baseLine + // margen arriba
        (totalTextLines * 44) + // alto aproximado por línea
        baseLine; // margen abajo

    const height = border * 2 + padding * 2 + contentHeight;
    canvas.width = width;
    canvas.height = height;

    // Fondo
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Borde
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = border;
    ctx.strokeRect(border / 2, border / 2, width - border, height - border);

    // Texto
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = Math.floor(width / 2);
    let y = border + padding + 20;

    // RUT (mediano)
    ctx.font = `bold 28px ${fontFamily}`;
    ctx.fillText(lines[0], centerX, y);
    y += 44;

    // Título (más grande)
    ctx.font = `bold 32px ${fontFamily}`;
    if (titleIsTwoLines) {
        ctx.fillText(lines[1], centerX, y);
        y += 44;
        ctx.fillText(lines[2], centerX, y);
        y += 44;
    } else {
        ctx.fillText(lines[1], centerX, y);
        y += 44;
    }

    // Folio (mediano)
    ctx.font = `bold 28px ${fontFamily}`;
    ctx.fillText(lines[lines.length - 1], centerX, y);

    // Devuelve PNG base64 (sin el prefijo data:)
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1];
}
