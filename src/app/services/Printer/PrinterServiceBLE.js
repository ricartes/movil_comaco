// /app/services/Printer/PrinterServiceBLE.js
import store from '@/js/store';
import { BleClient } from '@capacitor-community/bluetooth-le';

const SCAN_MS = 4500;
const CONNECT_TIMEOUT_MS = 8000;
const WRITE_CHUNK = 120;
const WRITE_DELAY_MS = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (u) => String(u || '').toLowerCase();

const FFE0 = '0000ffe0-0000-1000-8000-00805f9b34fb';
const FFE1 = '0000ffe1-0000-1000-8000-00805f9b34fb';
const FFF0 = '0000fff0-0000-1000-8000-00805f9b34fb';
const FFF1 = '0000fff1-0000-1000-8000-00805f9b34fb';


const ESC_POS_LATIN = '\x1C\x2E\x1B\x74\x10'; // Latin / CP1252


const PREFIX = new Uint8Array([
    0x1B, 0x40,       // ESC @ (init)
    0x1B, 0x74, 0x10, // ESC t 16 (CP1252 en muchas térmicas)
    0x1B, 0x61, 0x00, // ESC a 0 (left)
]);


const CODEPAGE_N = 2; // CP850 (tu caso)
const ESC_INIT = new Uint8Array([0x1B, 0x40]);                 // ESC @
const ESC_CP = new Uint8Array([0x1B, 0x74, CODEPAGE_N]);       // ESC t n
const ESC_ALIGN = {
    left: new Uint8Array([0x1B, 0x61, 0x00]),
    center: new Uint8Array([0x1B, 0x61, 0x01]),
    right: new Uint8Array([0x1B, 0x61, 0x02]),
};
const ESC_SIZE = {
    normal: new Uint8Array([0x1B, 0x21, 0x00]),
    tall: new Uint8Array([0x1B, 0x21, 0x10]),
    big: new Uint8Array([0x1B, 0x21, 0x30]),
};

// reset completo a “texto normal”
const RESET_TO_TEXT = new Uint8Array([
    0x1B, 0x40,              // ESC @
    0x1B, 0x74, CODEPAGE_N,   // ESC t n
    0x1B, 0x61, 0x00,         // ESC a 0
    0x1B, 0x21, 0x00,         // ESC ! 0
]);


let _initialized = false;
let _connectedDeviceId = null;
let _cachedPick = null; // { serviceUuid, charUuid }


async function runWithReconnect(jobFn) {
    try {
        return await jobFn();
    } catch (e) {
        if (!isNotConnectedError(e)) throw e;

        // reconectar “limpio” y reintentar TODO
        await forceResetConnection();
        await ensureConnectedHard();
        return await jobFn();
    }
}


function encodeLatin1(str) {
    str = String(str ?? '').normalize('NFC');
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        out[i] = str.charCodeAt(i) & 0xFF; // áéíóúñ están dentro de 0..255
    }
    return out;
}

async function writeCmd(deviceId, serviceUuid, charUuid, bytes) {
    // comandos críticos: con response para asegurar orden
    await BleClient.write(deviceId, serviceUuid, charUuid, bytes);
    //await sleep(30);
}


function encodeEsBasic(str) {
    str = String(str ?? '').normalize('NFC');

    const map = {
        'á': 160, 'é': 130, 'í': 161, 'ó': 162, 'ú': 163,
        'Á': 180, 'É': 144, 'Í': 213, 'Ó': 224, 'Ú': 232,
        'ñ': 164, 'Ñ': 165,
        'ü': 129, 'Ü': 154,
        'º': 167, 'ª': 166,
    };


    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (map[ch] != null) out[i] = map[ch];
        else {
            const cc = ch.charCodeAt(0);
            out[i] = (cc >= 0 && cc <= 127) ? cc : 63; // 63='?' si no mapeado
        }
    }
    return out;
}

function prefix(codepageN = 2) {
    return new Uint8Array([
        0x1B, 0x40,          // ESC @ init
        0x1B, 0x74, codepageN, // ESC t n
        0x1B, 0x61, 0x00,    // ESC a 0 left
    ]);
}


async function initOnce() {
    if (_initialized) return;
    await BleClient.initialize();
    _initialized = true;

    // permisos scan (si falla, seguimos: a veces ya están concedidos)
    try { await BleClient.requestLEScanPermissions(); } catch { }
}

function getPreferredName() {
    return store?.state?.printer?.name || null;
}

async function scanFindDeviceIdByName(targetName) {
    let found = null;

    await BleClient.requestLEScan({ allowDuplicates: false }, (result) => {
        const dev = result?.device;
        if (!dev) return;
        const name = dev.name || '';
        const id = dev.deviceId || '';
        if (name && name === targetName) {
            found = { name, deviceId: id };
        }
    });

    await sleep(SCAN_MS);
    await BleClient.stopLEScan().catch(() => { });

    return found?.deviceId || null;
}

async function withTimeout(promise, ms, tag) {
    let t;
    const timeout = new Promise((_, rej) => {
        t = setTimeout(() => rej(new Error(`${tag} timeout`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

async function connectByScanName(targetName) {
    await initOnce();

    const deviceId = await scanFindDeviceIdByName(targetName);
    if (!deviceId) {
        throw new Error(`No se encontró por BLE: ${targetName}. Acércate, reinicia impresora y reintenta.`);
    }

    await withTimeout(BleClient.connect(deviceId), CONNECT_TIMEOUT_MS, 'BLE connect');
    _connectedDeviceId = deviceId;
    _cachedPick = null;
    return deviceId;
}

async function pickWriteCharacteristic(deviceId) {
    if (_cachedPick) return _cachedPick;

    let services = [];
    try {
        services = await BleClient.getServices(deviceId);
    } catch {
        // si getServices no está disponible en tu build, probamos fallback FFE0/FFE1
        _cachedPick = { serviceUuid: FFE0, charUuid: FFE1 };
        return _cachedPick;
    }

    const has = (svc, ch) => {
        const s = services.find((x) => norm(x.uuid) === norm(svc));
        if (!s) return false;
        return (s.characteristics || []).some((c) => norm(c.uuid) === norm(ch));
    };

    if (has(FFE0, FFE1)) {
        _cachedPick = { serviceUuid: FFE0, charUuid: FFE1 };
        return _cachedPick;
    }
    if (has(FFF0, FFF1)) {
        _cachedPick = { serviceUuid: FFF0, charUuid: FFF1 };
        return _cachedPick;
    }

    // genérico: primera con write / writeWithoutResponse
    for (const s of services) {
        for (const c of (s.characteristics || [])) {
            const props = c.properties || {};
            if (props.write || props.writeWithoutResponse) {
                _cachedPick = { serviceUuid: s.uuid, charUuid: c.uuid };
                return _cachedPick;
            }
        }
    }

    throw new Error('No encontré ninguna characteristic con WRITE en services BLE.');
}

async function writeBytes(deviceId, svc, chr, bytes) {
    for (let i = 0; i < bytes.length; i += WRITE_CHUNK) {
        const chunk = bytes.slice(i, i + WRITE_CHUNK);
        try {
            await BleClient.writeWithoutResponse(deviceId, svc, chr, chunk);
        } catch {
            await BleClient.write(deviceId, svc, chr, chunk);
        }
        if (WRITE_DELAY_MS) await sleep(WRITE_DELAY_MS);
    }
}




// --- helpers imagen -> ESC/POS raster (GS v 0) ---

function isDataUrl(s) {
    return typeof s === 'string' && s.startsWith('data:');
}

function stripDataUrlToBase64(s) {
    if (!isDataUrl(s)) return s;
    const i = s.indexOf('base64,');
    return i >= 0 ? s.slice(i + 7) : s;
}

function b64ToBlobUrl(base64, mime = 'image/png') {
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
}

async function loadImageFromBase64(base64String) {
    // Asegura DataURL
    let src = String(base64String || '');
    if (!src.startsWith('data:')) {
        // asume PNG si viene pelado
        src = 'data:image/png;base64,' + src;
    }

    // usar Image() (evita CSP blob:)
    const img = new Image();
    img.decoding = 'async';

    await new Promise((res, rej) => {
        img.onload = () => res();
        img.onerror = (e) => rej(new Error('No se pudo cargar imagen base64'));
        img.src = src;
    });

    return img; // tiene width/height
}


function buildEscPosRasterFromImageData(imageData, width, height, threshold = 180) {
    // ESC/POS GS v 0  m  xL xH  yL yH  [data]
    // m=0 (normal), data = 1bit per pixel, rows packed in bytes (MSB first)
    const bytesPerRow = Math.ceil(width / 8);
    const data = new Uint8Array(bytesPerRow * height);

    const d = imageData.data; // RGBA
    let di = 0;

    for (let y = 0; y < height; y++) {
        for (let xByte = 0; xByte < bytesPerRow; xByte++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                const x = xByte * 8 + bit;
                byte <<= 1;

                if (x < width) {
                    const idx = (y * width + x) * 4;
                    const r = d[idx];
                    const g = d[idx + 1];
                    const b = d[idx + 2];
                    const a = d[idx + 3];

                    // blanco si transparente
                    if (a < 32) {
                        // bit 0 = blanco
                    } else {
                        // luminancia simple
                        const lum = (r * 0.299 + g * 0.587 + b * 0.114);
                        // en ESC/POS: 1 = negro, 0 = blanco
                        if (lum < threshold) byte |= 1;
                    }
                }
            }
            data[di++] = byte;
        }
    }

    const xL = bytesPerRow & 0xff;
    const xH = (bytesPerRow >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;

    const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
    const out = new Uint8Array(header.length + data.length);
    out.set(header, 0);
    out.set(data, header.length);
    return out;
}

async function rasterizeBase64ToEscPos(base64String, targetWidthPx) {
    const img = await loadImageFromBase64(base64String);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) throw new Error('No pude leer dimensiones de la imagen');

    // Escalar a targetWidthPx manteniendo ratio
    const scale = targetWidthPx ? (targetWidthPx / w0) : 1;
    let w = Math.max(8, Math.floor(w0 * scale));
    let h = Math.max(8, Math.floor(h0 * scale));

    // width debe ser múltiplo de 8 para packing
    w = Math.ceil(w / 8) * 8;

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Draw
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    return buildEscPosRasterFromImageData(imageData, w, h, 180);
}


// === API homologada ===

export async function disconnectPrinter() {
    try {
        if (_connectedDeviceId) await BleClient.disconnect(_connectedDeviceId);
    } catch { }
    _connectedDeviceId = null;
    _cachedPick = null;
}

export async function ensureConnected() {
    const name = getPreferredName();
    if (!name) return false;

    if (_connectedDeviceId) return true;

    await connectByScanName(name);
    return true;
}

export async function printTextSafe(text = '') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay impresora BLE configurada.');

    const deviceId = _connectedDeviceId;
    const { serviceUuid, charUuid } = await pickWriteCharacteristic(deviceId);

    let src = String(text ?? '');
    if (!src.endsWith('\n')) src += '\n';

    const body = encodeEsBasic(src);

    // 👈 AGREGADO: codepage CP850 + left align (igual que printTextSizeAlignSafe)
    await writeCmd(deviceId, serviceUuid, charUuid, ESC_INIT);
    await writeCmd(deviceId, serviceUuid, charUuid, ESC_CP);
    await writeCmd(deviceId, serviceUuid, charUuid, ESC_ALIGN.left);

    await writeBytes(deviceId, serviceUuid, charUuid, body);

    // 👈 AGREGADO: reset para consistencia
    await writeCmd(deviceId, serviceUuid, charUuid, RESET_TO_TEXT);
    //await sleep(80);
}



export async function printRawText(text) {
    // Igual que SPP: garantiza fin de línea
    let src = (text == null || text === '') ? '\n' : String(text);
    if (!src.endsWith('\n')) src += '\n';

    return printTextSafe(src);
}


// (Opcional) por ahora no lo implementes en BLE si no lo necesitas.
// Convertir imagen a ESC/POS por BLE requiere rasterización + comandos ESC/POS.
export async function printBase64Safe(base64String, align = '1', paperWidth = '48') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay impresora BLE configurada.');

    const deviceId = _connectedDeviceId;
    const { serviceUuid, charUuid } = await pickWriteCharacteristic(deviceId);

    const targetWidthPx = (String(paperWidth) === '32') ? 384 : 576;

    const alignCmd =
        String(align) === '0' ? new Uint8Array([0x1B, 0x61, 0x00]) :
            String(align) === '2' ? new Uint8Array([0x1B, 0x61, 0x02]) :
                new Uint8Array([0x1B, 0x61, 0x01]);

    const raster = await rasterizeBase64ToEscPos(base64String, targetWidthPx);

    // imprime imagen
    await writeBytes(deviceId, serviceUuid, charUuid, alignCmd);
    await writeBytes(deviceId, serviceUuid, charUuid, raster);

    // feed + "flush"
    // al final de printBase64Safe, reemplaza tu bloque final por:
    await writeCmd(deviceId, serviceUuid, charUuid, RESET_TO_TEXT);
    await sleep(80);

    // ✅ deja explícitamente CP850 listo para lo que venga
    await writeCmd(deviceId, serviceUuid, charUuid, prefix(2));
    await sleep(40);

}

export async function printTextSizeAlignSafe(text, size = '0', align = '0') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay impresora BLE configurada.');

    const deviceId = _connectedDeviceId;
    const { serviceUuid, charUuid } = await pickWriteCharacteristic(deviceId);

    const a =
        String(align) === '2' ? ESC_ALIGN.right :
            String(align) === '1' ? ESC_ALIGN.center :
                ESC_ALIGN.left;

    const s =
        String(size) === '2' ? ESC_SIZE.big :
            String(size) === '1' ? ESC_SIZE.tall :
                ESC_SIZE.normal;

    let src = String(text ?? '');
    if (!src.endsWith('\n')) src += '\n';

    const body = encodeEsBasic(src);

    // ✅ orden garantizado (writeCmd)
    await writeCmd(deviceId, serviceUuid, charUuid, ESC_INIT);
    await writeCmd(deviceId, serviceUuid, charUuid, ESC_CP);
    await writeCmd(deviceId, serviceUuid, charUuid, a);
    await writeCmd(deviceId, serviceUuid, charUuid, s);

    // ✅ texto (rápido)
    await writeBytes(deviceId, serviceUuid, charUuid, body);

    // ✅ importante: darle un mini tiempo para que el buffer aplique
    await sleep(40);

    // ✅ reset final con response (evita “pegues”)
    await writeCmd(deviceId, serviceUuid, charUuid, RESET_TO_TEXT);
    await sleep(80);
}






export async function connectByName(name) {
    if (!name) throw new Error('Nombre de impresora vacío');
    await connectByScanName(name);
    return true;
}

export async function isConnected() {
    return !!_connectedDeviceId;
}
