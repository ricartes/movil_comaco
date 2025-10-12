// /app/services/PrinterService.js
import store from '@/js/store';




function hasPlugin() {
    return typeof window !== 'undefined' && window.BTPrinter && typeof window.BTPrinter === 'object';
}

// === ESC/POS: habilitar tildes/ñ en la impresora ===
//  \x1C\x2E  -> FS .  (fin/salida de Kanji en algunas firmwares; seguro)
//  \x1B\x74\x10 -> ESC t 16  (selecciona codepage 16; depende del firmware.
//                              en muchas térmicas = CP1252/Latin1, corrige tildes/ñ)
const ESC_POS_LATIN = '\x1C\x2E\x1B\x74\x10';

// Utilidad interna: invocar método del plugin Cordova
function callPlugin(fn, ...args) {
    return new Promise((resolve, reject) => {
        if (!hasPlugin()) return reject('Plugin BTPrinter no disponible');
        try {
            window.BTPrinter[fn](
                (res) => resolve(res),
                (err) => reject(err || 'Error en BTPrinter.'),
                ...args
            );
        } catch (e) {
            reject(e?.message || e);
        }
    });
}

// API cruda del plugin (ppicapietra)
export async function listPrinters() {
    const res = await callPlugin('list');            // suele devolver array de nombres (strings)
    return Array.isArray(res) ? res : [];
}

export async function connectByName(name) {
    if (!name) throw new Error('Nombre de impresora vacío');
    return callPlugin('connect', name);              // ⚠️ este plugin conecta por NOMBRE
}

export async function isConnected() {
    try {
        const res = await callPlugin('connected');     // suele devolver true/false o "true"/"false"
        return String(res) === 'true' || res === true;
    } catch {
        return false;
    }
}

export async function disconnectPrinter() {
    try {
        await callPlugin('disconnect');
    } catch (_) { }
}


function withEscPosPrefixOnce(text) {
    // Garantiza string y agrega el prefijo para codepage/acentos
    const payload = (text == null || text === '') ? '\n' : String(text);
    return ESC_POS_LATIN + payload;
}
function addPrefixToFirstChunk(chunks) {
    if (!chunks.length) return chunks;
    const [first, ...rest] = chunks;
    return [ESC_POS_LATIN + first, ...rest];
}
// -----------------------------------------------------------

export async function printRawText(text) {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay conexión con la impresora. Verifica la configuración.');

    const src = (text == null || text === '') ? '\n' : String(text);
    const chunkSize = 2000;

    const chunks = [];
    for (let i = 0; i < src.length; i += chunkSize) {
        chunks.push(src.substring(i, i + chunkSize));
    }

    // Prefijo ESC/POS solo en el primer chunk
    const chunksWithPrefix = addPrefixToFirstChunk(chunks);

    for (const ch of chunksWithPrefix) {
        await callPlugin('printText', ch);
    }
}

/* ==========================
   Helpers con store
   ========================== */

async function getPreferredPrinterName() {
    // Usamos el NOMBRE guardado (este plugin no usa MAC)
    const name = store?.state?.printer?.name || null;
    return name || null;
}

/** Conecta si no está conectado. Devuelve true si hay conexión al final. */
export async function ensureConnected() {
    // 1) ¿ya conectado?
    if (await isConnected()) return true;

    // 2) buscar nombre guardado
    const name = await getPreferredPrinterName();
    if (!name) return false;

    // 3) intentar conectar
    try {
        await connectByName(name);
        return await isConnected();
    } catch {
        return false;
    }
}

/** Flujo completo: asegura conexión y manda el texto */
export async function printTextSafe(text = 'Prueba de impresión\n\n') {
    const ok = await ensureConnected();
    if (!ok) {
        throw new Error('No hay conexión con la impresora. Selecciona una impresora y/o vuelve a intentar conectar.');
    }
    return printRawText(text);
}


// ==========================
// Añadidos seguros (NO rompen lo existente)
// ==========================

/**
 * Imprime texto con tamaño y alineación (si tu fork lo soporta).
 * size: '0' (normal), '1' (grande), '2' (muy grande)  [depende del firmware]
 * align: '0' izq, '1' centro, '2' der
 */
export async function printTextSizeAlignSafe(text, size = '0', align = '0') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay conexión con la impresora. Verifica la configuración.');
    const payload = withEscPosPrefixOnce(text); // ← prefijo aquí también
    return callPlugin('printTextSizeAlign', payload, String(size), String(align));
}
/**
 * Alias más semántico para títulos (usa printTextSizeAlignSafe por debajo).
 * Por defecto centrado y tamaño 1.
 */
export async function printTitleSafe(text, size = '1', align = '1') {
    return printTextSizeAlignSafe(text, size, align);
}

/**
 * Imprime una imagen base64 (PNG/JPG) centrada por defecto.
 * align: '0' izq, '1' centro, '2' der
 * paperWidth: 32 para 58mm (algunos forks piden 48 para 80mm). Ajusta si tu impresora lo requiere.
 *
 * Nota: no reemplaza tu printBase64Image existente si ya lo tienes;
 * si ya lo tienes, puedes usar este como "alias" más explícito.
 */
export async function printBase64Safe(base64String, align = '1', paperWidth = '48') {
    console.log(paperWidth);
    if (!base64String) throw new Error('Falta cadena base64');
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay conexión con la impresora. Verifica la configuración.');
    return callPlugin('printBase64', base64String, String(align), paperWidth);
}

/**
 * Envía varias líneas de texto de forma segura (con corte en bloques).
 * Útil para textos largos (boletas extensas).
 */
export async function printLinesSafe(lines = []) {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay conexión con la impresora. Verifica la configuración.');

    const norm = (s) => (s == null || s === '') ? '\n' : String(s);

    const chunkSize = 2000;
    let firstChunkPrinted = false;

    for (const line of lines) {
        const s = norm(line);
        for (let i = 0; i < s.length; i += chunkSize) {
            let chunk = s.substring(i, i + chunkSize);
            if (!firstChunkPrinted) {
                chunk = ESC_POS_LATIN + chunk;    // prefijo en la primera línea/chunk
                firstChunkPrinted = true;
            }
            await callPlugin('printText', chunk);
        }
    }
}

/**
 * Wrappers opcionales si tu fork expone estos métodos:
 */
export async function printQRCodeSafe(data, align = '1', model = '2', size = '6', ecLevel = 'M') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay conexión con la impresora. Verifica la configuración.');
    // Firma típica: printQRCode(success, error, data, align, model, size, eclevel)
    return callPlugin('printQRCode', String(data || ''), String(align), String(model), String(size), String(ecLevel));
}

export async function printBarcodeSafe(system, data, align = '1', position = '2', font = '0', height = '100') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay conexión con la impresora. Verifica la configuración.');
    // Firma típica: printBarcode(success, error, system, data, align, position, font, height)
    return callPlugin('printBarcode', String(system || ''), String(data || ''), String(align), String(position), String(font), String(height));
}
