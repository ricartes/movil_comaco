// /app/services/PrinterLayout.js
import store from '@/js/store';

export function refreshPrinterLayout() {
    const w = Number(store.state?.printer?.paperWidth);

    const paperWidth = !Number.isNaN(w) && w > 0 ? w : 48; // default 80mm
    const cols = paperWidth === 48 ? 48 : 32;
    const pixels = paperWidth === 48 ? 576 : 384;

    // si quieres seguir usando variables globales opcionalmente
    globalThis.PAPER_WIDTH = paperWidth;
    globalThis.COLS = cols;
    globalThis.PIXELS = pixels;

    return { paperWidth, cols, pixels };
}
