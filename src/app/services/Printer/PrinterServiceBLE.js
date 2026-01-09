// /app/services/Printer/PrinterServiceBLE.js
import store from '@/js/store';
import { BleClient } from '@capacitor-community/bluetooth-le';

const SCAN_MS = 4500;
const CONNECT_TIMEOUT_MS = 8000;

// ✅ Si te “pegaba” con imágenes, baja a 90 (tu prueba buena). Si no, 120 ok.
const WRITE_CHUNK = 120;
// ✅ 0 = más fluido. Si alguna impresora se pega, sube a 2..8ms.
const WRITE_DELAY_MS = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (u) => String(u || '').toLowerCase();

const FFE0 = '0000ffe0-0000-1000-8000-00805f9b34fb';
const FFE1 = '0000ffe1-0000-1000-8000-00805f9b34fb';
const FFF0 = '0000fff0-0000-1000-8000-00805f9b34fb';
const FFF1 = '0000fff1-0000-1000-8000-00805f9b34fb';

// ===== ESC/POS =====
const CODEPAGE_N = 2; // CP850

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

// ✅ “Setup” empaquetado (1 sola escritura) — evita pausas por 4 writes seguidos
const SETUP_TEXT_LEFT = new Uint8Array([
    0x1B, 0x40,        // ESC @
    0x1B, 0x52, 0x06,  // ESC R 6 (Spanish)
    0x1B, 0x74, 0x02,  // ESC t 2 (CP850)
    0x1B, 0x61, 0x00,  // ESC a 0 (left)
]);

function setupWithAlign(align /* '0'|'1'|'2' */) {
    const a = String(align) === '2'
        ? 0x02
        : String(align) === '1'
            ? 0x01
            : 0x00;

    return new Uint8Array([
        0x1B, 0x40,        // ESC @
        0x1B, 0x52, 0x06,  // ESC R 6
        0x1B, 0x74, 0x02,  // ESC t 2
        0x1B, 0x61, a,     // ESC a align
    ]);
}

// reset “texto normal” (sin sleeps grandes)
const RESET_TO_TEXT = new Uint8Array([
    0x1B, 0x40,
    0x1B, 0x52, 0x06,
    0x1B, 0x74, CODEPAGE_N,
    0x1B, 0x61, 0x00,
    0x1B, 0x21, 0x00,
]);

let _initialized = false;
let _connectedDeviceId = null;
let _cachedPick = null;

// =========================
// ENCODER (tu tabla CP850)
// =========================
function encodeEsBasic(str) {
    str = String(str ?? '').normalize('NFC');

    const map = {
        'á': 160, 'é': 130, 'í': 161, 'ó': 162, 'ú': 163,
        // OJO: mayúsculas en tu impresora están raras; dejamos lo “seguro”
        'Á': 181, 'É': 144, 'Í': 214, 'Ó': 224, 'Ú': 233,
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
            out[i] = (cc >= 0 && cc <= 127) ? cc : 63;
        }
    }
    return out;
}

// ✅ si tu impresora NO soporta bien tildes en mayúscula, activa esto
// (esto NO genera pausas, solo “arregla” el texto)
function normalizeEsText(str) {
    return String(str ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // elimina tildes
        .replace(/[¡¿]/g, m => (m === '¡' ? '!' : '?'));
}

// =========================
// BLE CORE
// =========================
async function initOnce() {
    if (_initialized) return;
    await BleClient.initialize();
    _initialized = true;
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
        if (dev.name === targetName) found = dev.deviceId;
    });

    await sleep(SCAN_MS);
    await BleClient.stopLEScan().catch(() => { });
    return found;
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
    if (!deviceId) throw new Error(`No se encontró por BLE: ${targetName}`);

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
        _cachedPick = { serviceUuid: FFE0, charUuid: FFE1 };
        return _cachedPick;
    }

    const has = (svc, ch) => {
        const s = services.find((x) => norm(x.uuid) === norm(svc));
        if (!s) return false;
        return (s.characteristics || []).some((c) => norm(c.uuid) === norm(ch));
    };

    if (has(FFE0, FFE1)) return (_cachedPick = { serviceUuid: FFE0, charUuid: FFE1 });
    if (has(FFF0, FFF1)) return (_cachedPick = { serviceUuid: FFF0, charUuid: FFF1 });

    for (const s of services) {
        for (const c of (s.characteristics || [])) {
            const props = c.properties || {};
            if (props.write || props.writeWithoutResponse) {
                return (_cachedPick = { serviceUuid: s.uuid, charUuid: c.uuid });
            }
        }
    }

    throw new Error('No encontré ninguna characteristic con WRITE.');
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

// Para “comandos críticos” (si lo necesitas), pero SIN sleeps grandes
async function writeCmd(deviceId, svc, chr, bytes) {
    await BleClient.write(deviceId, svc, chr, bytes);
}

// =========================
// IMAGEN -> ESC/POS raster
// =========================
async function loadImageFromBase64(base64String) {
    let src = String(base64String || '');
    if (!src.startsWith('data:')) src = 'data:image/png;base64,' + src;

    const img = new Image();
    img.decoding = 'async';

    await new Promise((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('No se pudo cargar imagen base64'));
        img.src = src;
    });

    return img;
}

function buildEscPosRasterFromImageData(imageData, width, height, threshold = 180) {
    const bytesPerRow = Math.ceil(width / 8);
    const data = new Uint8Array(bytesPerRow * height);

    const d = imageData.data;
    let di = 0;

    for (let y = 0; y < height; y++) {
        for (let xByte = 0; xByte < bytesPerRow; xByte++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                const x = xByte * 8 + bit;
                byte <<= 1;

                if (x < width) {
                    const idx = (y * width + x) * 4;
                    const r = d[idx], g = d[idx + 1], b = d[idx + 2], a = d[idx + 3];

                    if (a >= 32) {
                        const lum = (r * 0.299 + g * 0.587 + b * 0.114);
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

    const scale = targetWidthPx ? (targetWidthPx / w0) : 1;
    let w = Math.max(8, Math.floor(w0 * scale));
    let h = Math.max(8, Math.floor(h0 * scale));
    w = Math.ceil(w / 8) * 8;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    return buildEscPosRasterFromImageData(imageData, w, h, 180);
}

// =========================
// API
// =========================
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

export async function isConnected() {
    return !!_connectedDeviceId;
}

export async function connectByName(name) {
    if (!name) throw new Error('Nombre de impresora vacío');
    await connectByScanName(name);
    return true;
}

// ---------- TEXTO SIMPLE (SIN PAUSAS) ----------
export async function printTextSafe(text = '') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay impresora BLE configurada.');

    const deviceId = _connectedDeviceId;
    const { serviceUuid, charUuid } = await pickWriteCharacteristic(deviceId);

    let src = String(text ?? '');
    if (!src.endsWith('\n')) src += '\n';

    // ✅ Si tus mayúsculas acentuadas salen mal, deja esto ON:
    src = normalizeEsText(src);

    const body = encodeEsBasic(src);

    // ✅ 1 solo “setup” (evita 4 writes con response)
    await writeBytes(deviceId, serviceUuid, charUuid, SETUP_TEXT_LEFT);
    await writeBytes(deviceId, serviceUuid, charUuid, body);

    // ❌ Sin RESET + sin sleeps => más fluido
}

export async function printRawText(text) {
    let src = (text == null || text === '') ? '\n' : String(text);
    if (!src.endsWith('\n')) src += '\n';
    return printTextSafe(src);
}

// ---------- TEXTO CON TAMAÑO + ALINEACIÓN (SIN PAUSAS) ----------
export async function printTextSizeAlignSafe(text, size = '0', align = '0') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay impresora BLE configurada.');

    const deviceId = _connectedDeviceId;
    const { serviceUuid, charUuid } = await pickWriteCharacteristic(deviceId);

    let src = String(text ?? '');
    if (!src.endsWith('\n')) src += '\n';

    // ✅ igual que arriba
    src = normalizeEsText(src);
    const body = encodeEsBasic(src);

    const a = String(align) === '2' ? ESC_ALIGN.right : String(align) === '1' ? ESC_ALIGN.center : ESC_ALIGN.left;
    const s = String(size) === '2' ? ESC_SIZE.big : String(size) === '1' ? ESC_SIZE.tall : ESC_SIZE.normal;

    // ✅ setup empaquetado + luego tamaño/alineación (sin sleeps)
    await writeBytes(deviceId, serviceUuid, charUuid, setupWithAlign(align));
    await writeBytes(deviceId, serviceUuid, charUuid, s);
    // (a ya viene en setupWithAlign, pero si quieres forzarlo igual, deja esto)
    // await writeBytes(deviceId, serviceUuid, charUuid, a);

    await writeBytes(deviceId, serviceUuid, charUuid, body);

    // ✅ reset rápido (sin sleeps grandes)
    await writeBytes(deviceId, serviceUuid, charUuid, RESET_TO_TEXT);
}

// ---------- IMAGEN BASE64 (SIN “PAUSAS ARTIFICIALES”) ----------
export async function printBase64Safe(base64String, align = '1', paperWidth = '48') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay impresora BLE configurada.');

    const deviceId = _connectedDeviceId;
    const { serviceUuid, charUuid } = await pickWriteCharacteristic(deviceId);

    const targetWidthPx = (String(paperWidth) === '32') ? 384 : 576;
    const raster = await rasterizeBase64ToEscPos(base64String, targetWidthPx);

    // ✅ setup con align en 1 solo envío
    await writeBytes(deviceId, serviceUuid, charUuid, setupWithAlign(align));
    await writeBytes(deviceId, serviceUuid, charUuid, raster);

    // feed final (sin sleeps grandes)
    await writeBytes(deviceId, serviceUuid, charUuid, new Uint8Array([0x0A, 0x0A, 0x0A]));

    // deja la impresora lista para texto CP850 (sin sleeps)
    await writeBytes(deviceId, serviceUuid, charUuid, RESET_TO_TEXT);
}
