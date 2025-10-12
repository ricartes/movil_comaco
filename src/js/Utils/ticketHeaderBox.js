// src/js/Utils/ticketHeaderBox.js
export function generateHeaderBoxBase64({
    rut = 'R.U.T.: 79825060-4',
    title = 'GUÍA DE DESPACHO\nELECTRÓNICA',
    folio = 'N°: 32536',
    width = 576,
    bgColor = '#eeeeee',
    strokeColor = '#000000',
    textColor = '#000000',
    border = 8,
    padding = 24,
    fontFamily = 'sans-serif',
    // 👇 nuevos controles
    topGap = 20,
    bottomGap = 10,   // ← baja este valor para quitar margen inferior
    lineGap = 44      // espacio entre líneas
} = {}) {
    const lines = [
        String(rut || '').toUpperCase(),
        ...String(title || '').toUpperCase().split('\n'),
        String(folio || '').toUpperCase(),
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Tipos y tamaños
    const FONT_RUT = `bold 28px ${fontFamily}`;
    const FONT_TITLE = `bold 32px ${fontFamily}`;
    const FONT_FOLIO = `bold 28px ${fontFamily}`;

    // Calcular altura estimada según cantidad de líneas
    const totalTextLines = lines.length; // RUT + (1 o 2 del título) + Folio
    const contentHeight = topGap + (totalTextLines - 1) * lineGap + bottomGap;

    const height = border * 2 + padding * 2 + contentHeight;
    canvas.width = width;
    canvas.height = height;

    // Fondo y borde
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = border;
    ctx.strokeRect(border / 2, border / 2, width - border, height - border);

    // Texto
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = Math.floor(width / 2);
    let y = border + padding + topGap;

    // RUT
    ctx.font = FONT_RUT;
    ctx.fillText(lines[0], centerX, y);
    y += lineGap;

    // Título (puede ser 1 o 2 líneas)
    ctx.font = FONT_TITLE;
    if (lines.length === 4) {
        ctx.fillText(lines[1], centerX, y); y += lineGap;
        ctx.fillText(lines[2], centerX, y); y += lineGap;
    } else {
        ctx.fillText(lines[1], centerX, y); y += lineGap;
    }

    // Folio
    ctx.font = FONT_FOLIO;
    ctx.fillText(lines[lines.length - 1], centerX, y);
    // (no sumamos más; bottomGap ya está contemplado en la altura)

    return canvas.toDataURL('image/png').split(',')[1];
}
