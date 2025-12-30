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

// Alineación ESC/POS
const ESC_ALIGN_LEFT = '\x1B\x61\x00'; // ESC a 0
const ESC_ALIGN_CENTER = '\x1B\x61\x01'; // por si lo necesitas
const ESC_ALIGN_RIGHT = '\x1B\x61\x02';

// === Errores BT transitorios típicos ===
const TRANSIENT_BT_ERR = /broken pipe|socket.*closed|device.*disconnected|connection.*(lost|reset)|write.*failed/i;

const OP_TIMEOUT_MS = 4000; // ajusta 3–6s según tu impresora
function withTimeout(promise, ms = OP_TIMEOUT_MS, tag = 'BT op') {
    let t;
    const timeout = new Promise((_, rej) => {
        t = setTimeout(() => rej(new Error(`${tag} timeout`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}


// Pequeño sleep
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function callWithReconnect(method, args = [], { retries = 1, reconnect = true, waitMs = 250 } = {}) {
    try {
        return await callPlugin(method, ...args);
    } catch (e) {
        const msg = String(e?.message || e || '');
        const transient = TRANSIENT_BT_ERR.test(msg);
        if (!transient || !reconnect || retries <= 0) throw e;

        // limpiar socket y reconectar
        try { await disconnectPrinter(); } catch (_) { }
        const name = await getPreferredPrinterName();
        if (!name) throw new Error('Impresora no configurada');
        await delay(waitMs);
        await connectByName(name);
        await delay(150);

        return callWithReconnect(method, args, { retries: retries - 1, reconnect, waitMs: waitMs * 2 });
    }
}


// Utilidad interna: invocar método del plugin Cordova
function callPlugin(fn, ...args) {
    return withTimeout(new Promise((resolve, reject) => {
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
    }), OP_TIMEOUT_MS, `BTPrinter.${fn}`);
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
    // Normaliza texto sin añadir saltos automáticos
    let payload = String(text ?? '');
    // Elimina saltos finales redundantes (\n o \r\n)
    payload = payload.replace(/[\r\n]+$/g, '');
    // Si de verdad quieres forzar un salto, hazlo fuera de esta función
    return ESC_POS_LATIN + payload;
}

function addPrefixToFirstChunk(chunks) {
    if (!chunks.length) return chunks;
    const [first, ...rest] = chunks;
    // Agregar codepage + alineación izquierda siempre que uses printText
    return [ESC_POS_LATIN + ESC_ALIGN_LEFT + first, ...rest];
}
// -----------------------------------------------------------

export async function printRawText(text) {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay conexión con la impresora. Verifica la configuración.');

    const src = (text == null || text === '') ? '\n' : String(text);
    const chunkSize = 1024;

    const chunks = [];
    for (let i = 0; i < src.length; i += chunkSize) {
        chunks.push(src.substring(i, i + chunkSize));
    }

    // Prefijo ESC/POS solo en el primer chunk
    const chunksWithPrefix = addPrefixToFirstChunk(chunks);

    for (const ch of chunksWithPrefix) {
        await callWithReconnect('printText', [ch], { retries: 1 });
        await delay(10); // da respiro al buffer BT
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
async function pingPrinter() {
    try {
        // Solo comandos invisibles: init + feed
        await callWithReconnect('printText', [
            ESC_POS_LATIN +
            String.fromCharCode(27, 64) +  // ESC @ (init)
            String.fromCharCode(12)        // Form feed
        ], { retries: 0, reconnect: false });
        return true;
    } catch {
        return false;
    }
}


export async function ensureConnected() {
    if (await isConnected() && await pingPrinter()) return true;
    const name = await getPreferredPrinterName();
    if (!name) return false;
    try {
        await connectByName(name);
        return await pingPrinter();
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
    if (!base64String) throw new Error('Falta cadena base64');
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay conexión con la impresora. Verifica la configuración.');
    return callWithReconnect('printBase64', [base64String, String(align), paperWidth], { retries: 1 });

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
            await callWithReconnect('printText', [chunk], { retries: 1 });

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
