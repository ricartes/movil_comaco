// /app/services/Printer/index.js
import store from '@/js/store';

import * as SPP from './PrinterServiceSPP';
import * as BLE from './PrinterServiceBLE';

function getMode() {
    // default seguro
    const m = store?.state?.printer?.mode;
    return (m === 'ble' || m === 'spp') ? m : 'spp';
}

function svc() {

    console.log('[PRINTER] mode=', store?.state?.printer?.mode, 'svc=', getMode());
    console.log('[PRINTER] using=', (getMode() === 'ble' ? 'BLE' : 'SPP'));
    console.log('[PRINTER] SPP hasRaw=', !!SPP.printRawText, 'BLE hasRaw=', !!BLE.printRawText);


    return getMode() === 'ble' ? BLE : SPP;
}

/**
 * IMPORTANTE:
 * - Para "listar impresoras emparejadas", normalmente es SPP (BTPrinter).
 * - BLE listado real sería por scan, pero tú ya tienes lista emparejada (name/mac/type).
 *   Así que listPrinters lo dejamos en SPP para no cambiar UX.
 */
export async function listPrinters() {
    return SPP.listPrinters();
}

/* ======================
   Conexión
   ====================== */


export async function ensureConnected() {
    return svc().ensureConnected?.();
}

export async function disconnectPrinter() {
    // desconecta ambos por seguridad
    try { await SPP.disconnectPrinter?.(); } catch { }
    try { await BLE.disconnectPrinter?.(); } catch { }
}


export async function isConnected() {
    const fn = svc().isConnected;
    return fn ? fn() : false;
}

export async function connectByName(name) {
    const fn = svc().connectByName;
    if (!fn) throw new Error('connectByName no soportado en este modo');
    return fn(name);
}

/* ======================
   Impresión básica
   ====================== */

// Homologados (los mismos nombres que usa el resto del sistema)
export async function printTextSafe(text) {
    return svc().printTextSafe(text);
}

export async function printRawText(text) {
    return svc().printRawText?.(text) ?? svc().printTextSafe(text);
}




/* ======================
   Formato / tamaños
   ====================== */

export async function printTextSizeAlignSafe(text, size = '0', align = '0') {
    if (!svc().printTextSizeAlignSafe) {
        // BLE fallback limpio
        return svc().printTextSafe(text);
    }
    return svc().printTextSizeAlignSafe(text, size, align);
}

/* ======================
   Imágenes / códigos
   ====================== */
export async function printBase64Safe(base64, align = '1', paperWidth = '48') {
    if (!svc().printBase64Safe) throw new Error('printBase64Safe no implementado en este modo');
    return svc().printBase64Safe(base64, align, paperWidth);
}




