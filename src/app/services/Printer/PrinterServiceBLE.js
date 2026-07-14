// /app/services/Printer/PrinterServiceBLE.js
import store from '@/js/store';
import { BleClient } from '@capacitor-community/bluetooth-le';

const SCAN_MS = 8000;
const CONNECT_TIMEOUT_MS = 8000;

const WRITE_CHUNK = 120;
const WRITE_DELAY_MS = 0;

// Las imágenes son mucho más grandes que el texto. Se envían con un perfil
// conservador para no llenar el pequeño buffer de las impresoras térmicas BLE.
const IMAGE_WRITE_PROFILE = Object.freeze({
    chunkSize: 90,
    delayMs: 6,
});
const IMAGE_BAND_HEIGHT = 24;
const IMAGE_BAND_PAUSE_MS = 100;
const IMAGE_FINAL_DRAIN_MS = 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (u) => String(u || '').trim().toLowerCase();
const normDeviceId = (u) => String(u || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();

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
let _connectingPromise = null;

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
    await BleClient.initialize({ androidNeverForLocation: true });
    _initialized = true;
}

function getPreferredName() {
    return store?.state?.printer?.name || null;
}

function getPreferredAddress() {
    return store?.state?.printer?.address || null;
}

function bleLog(level, message, details = null) {
    const suffix = details ? ` ${JSON.stringify(details)}` : '';
    const fn = console[level] || console.log;
    fn.call(console, `[BLE] ${message}${suffix}`);
}

function matchesPrinter(device, targetName, targetAddress) {
    if (!device?.deviceId) return false;
    const wantedAddress = normDeviceId(targetAddress);
    const matchesAddress = !!wantedAddress && normDeviceId(device.deviceId) === wantedAddress;
    const matchesName = !!targetName && norm(device.name) === norm(targetName);
    return matchesAddress || matchesName;
}

async function scanFindDeviceId({ targetName, targetAddress }) {
    const wantedName = norm(targetName);
    const wantedAddress = normDeviceId(targetAddress);
    const seen = new Map();
    let finish;
    let timer;

    const matchPromise = new Promise((resolve) => {
        finish = resolve;
        timer = setTimeout(() => resolve(null), SCAN_MS);
    });

    bleLog('info', 'Iniciando escaneo.', {
        targetName,
        hasTargetAddress: !!wantedAddress,
        scanMs: SCAN_MS,
    });

    try {
        await BleClient.requestLEScan({ allowDuplicates: false }, (result) => {
            const dev = result?.device;
            if (!dev?.deviceId) return;

            const advertisedName = dev.name || result?.localName || '';
            const deviceId = dev.deviceId;
            const key = normDeviceId(deviceId) || String(deviceId);

            if (!seen.has(key)) {
                seen.set(key, advertisedName || '(sin nombre)');
                bleLog('info', 'Dispositivo detectado.', {
                    name: advertisedName || null,
                    deviceId,
                    rssi: result?.rssi ?? null,
                });
            }

            const matchesAddress = !!wantedAddress && normDeviceId(deviceId) === wantedAddress;
            const matchesName = !!wantedName && norm(advertisedName) === wantedName;

            if (matchesAddress || matchesName) {
                bleLog('info', 'Impresora encontrada.', {
                    name: advertisedName || null,
                    deviceId,
                    matchedBy: matchesAddress ? 'address' : 'name',
                });
                finish(deviceId);
            }
        });

        const deviceId = await matchPromise;
        if (!deviceId) {
            bleLog('warn', 'Escaneo finalizado sin coincidencia.', {
                targetName,
                devicesSeen: seen.size,
                namesSeen: [...new Set(seen.values())],
            });
        }
        return deviceId;
    } finally {
        clearTimeout(timer);
        await BleClient.stopLEScan().catch((e) => {
            bleLog('warn', 'No fue posible detener el escaneo.', {
                error: String(e?.message || e),
            });
        });
    }
}

async function connectDevice(deviceId, source) {
    bleLog('info', 'Conectando impresora.', { deviceId, source });
    await BleClient.connect(
        deviceId,
        (disconnectedDeviceId) => {
            if (normDeviceId(disconnectedDeviceId) !== normDeviceId(_connectedDeviceId)) return;
            bleLog('warn', 'Impresora desconectada.', { deviceId: disconnectedDeviceId });
            _connectedDeviceId = null;
            _cachedPick = null;
        },
        { timeout: CONNECT_TIMEOUT_MS }
    );
    _connectedDeviceId = deviceId;
    _cachedPick = null;
    bleLog('info', 'Impresora conectada.', { deviceId, source });
    return deviceId;
}

async function tryConnectDevice(deviceId, source) {
    if (!deviceId) return false;
    try {
        await connectDevice(deviceId, source);
        return true;
    } catch (e) {
        bleLog('warn', 'Falló intento de conexión.', {
            deviceId,
            source,
            error: String(e?.message || e),
        });
        await BleClient.disconnect(deviceId).catch(() => { });
        return false;
    }
}

async function findBondedPrinter(targetName, targetAddress) {
    try {
        const devices = await BleClient.getBondedDevices();
        const bonded = Array.isArray(devices) ? devices : [];
        bleLog('info', 'Dispositivos vinculados consultados.', {
            count: bonded.length,
            devices: bonded.map((device) => ({
                name: device?.name || null,
                deviceId: device?.deviceId || null,
            })),
        });
        return bonded.find((device) => matchesPrinter(device, targetName, targetAddress)) || null;
    } catch (e) {
        bleLog('warn', 'No fue posible consultar dispositivos vinculados.', {
            error: String(e?.message || e),
        });
        return null;
    }
}

async function connectPreferredPrinter(targetName, targetAddress = null) {
    await initOnce();

    const attemptedDeviceIds = new Set();
    const tryOnce = async (deviceId, source) => {
        const key = normDeviceId(deviceId) || String(deviceId || '');
        if (!key || attemptedDeviceIds.has(key)) return false;
        attemptedDeviceIds.add(key);
        return tryConnectDevice(deviceId, source);
    };

    const bonded = await findBondedPrinter(targetName, targetAddress);
    if (bonded?.deviceId) {
        const connected = await tryOnce(bonded.deviceId, 'bonded-device');
        if (connected) return _connectedDeviceId;
    }

    const normalizedAddress = normDeviceId(targetAddress);
    if (normalizedAddress.length === 12) {
        const connected = await tryOnce(targetAddress, 'saved-address');
        if (connected) return _connectedDeviceId;
    }

    const scannedDeviceId = await scanFindDeviceId({ targetName, targetAddress });
    if (!scannedDeviceId) {
        throw new Error(`No se encontró por BLE: ${targetName}. Verifica que esté encendida y en modo BLE.`);
    }

    const connected = await tryOnce(scannedDeviceId, 'scan');
    if (!connected) {
        throw new Error(`Se encontró ${targetName}, pero no fue posible conectar por BLE.`);
    }
    return _connectedDeviceId;
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

async function writeBytes(deviceId, svc, chr, bytes, options = {}) {
    const chunkSize = Math.max(20, Number(options.chunkSize) || WRITE_CHUNK);
    const delayMs = Math.max(0, Number(options.delayMs) || WRITE_DELAY_MS);

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        try {
            await BleClient.writeWithoutResponse(deviceId, svc, chr, chunk);
        } catch {
            await BleClient.write(deviceId, svc, chr, chunk);
        }

        const hasMore = i + chunk.length < bytes.length;
        if (hasMore && delayMs) await sleep(delayMs);
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

function buildEscPosRasterBand(imageData, width, startY, bandHeight, threshold = 180) {
    const bytesPerRow = Math.ceil(width / 8);
    const data = new Uint8Array(bytesPerRow * bandHeight);

    const d = imageData.data;
    let di = 0;

    for (let y = 0; y < bandHeight; y++) {
        const sourceY = startY + y;
        for (let xByte = 0; xByte < bytesPerRow; xByte++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                const x = xByte * 8 + bit;
                byte <<= 1;

                if (x < width) {
                    const idx = (sourceY * width + x) * 4;
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
    const yL = bandHeight & 0xff;
    const yH = (bandHeight >> 8) & 0xff;

    const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
    const out = new Uint8Array(header.length + data.length);
    out.set(header, 0);
    out.set(data, header.length);
    return out;
}

async function rasterizeBase64ToEscPosBands(base64String, targetWidthPx) {
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
    const bands = [];
    let totalBytes = 0;

    for (let startY = 0; startY < h; startY += IMAGE_BAND_HEIGHT) {
        const bandHeight = Math.min(IMAGE_BAND_HEIGHT, h - startY);
        const band = buildEscPosRasterBand(imageData, w, startY, bandHeight, 180);
        bands.push(band);
        totalBytes += band.length;
    }

    return { bands, width: w, height: h, totalBytes };
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
    if (!_connectingPromise) {
        _connectingPromise = connectPreferredPrinter(name, getPreferredAddress())
            .finally(() => {
                _connectingPromise = null;
            });
    }
    await _connectingPromise;
    return !!_connectedDeviceId;
}

export async function isConnected() {
    return !!_connectedDeviceId;
}

export async function connectByName(name) {
    if (!name) throw new Error('Nombre de impresora vacío');
    await connectPreferredPrinter(name, getPreferredAddress());
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

// ---------- IMAGEN BASE64 ----------
export async function printBase64Safe(base64String, align = '1', paperWidth = '48') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay impresora BLE configurada.');

    const deviceId = _connectedDeviceId;
    const { serviceUuid, charUuid } = await pickWriteCharacteristic(deviceId);

    const targetWidthPx = (String(paperWidth) === '32') ? 384 : 576;
    const raster = await rasterizeBase64ToEscPosBands(base64String, targetWidthPx);
    const startedAt = Date.now();

    bleLog('info', 'Enviando imagen por bandas.', {
        bytes: raster.totalBytes,
        width: raster.width,
        height: raster.height,
        bands: raster.bands.length,
        bandHeight: IMAGE_BAND_HEIGHT,
        bandPauseMs: IMAGE_BAND_PAUSE_MS,
        finalDrainMs: IMAGE_FINAL_DRAIN_MS,
        ...IMAGE_WRITE_PROFILE,
    });

    // El setup y los comandos pequeños siguen saliendo sin pausas.
    await writeBytes(deviceId, serviceUuid, charUuid, setupWithAlign(align));

    for (let index = 0; index < raster.bands.length; index++) {
        try {
            await writeBytes(
                deviceId,
                serviceUuid,
                charUuid,
                raster.bands[index],
                IMAGE_WRITE_PROFILE
            );
        } catch (e) {
            bleLog('error', 'Falló el envío de una banda de imagen.', {
                band: index + 1,
                bands: raster.bands.length,
                error: String(e?.message || e),
            });
            throw e;
        }

        if (index + 1 < raster.bands.length) await sleep(IMAGE_BAND_PAUSE_MS);
    }

    // Da tiempo al cabezal para terminar la última banda antes del feed,
    // reset y texto que continúan después de la imagen.
    await sleep(IMAGE_FINAL_DRAIN_MS);

    bleLog('info', 'Imagen enviada completamente.', {
        bytes: raster.totalBytes,
        bands: raster.bands.length,
        durationMs: Date.now() - startedAt,
    });

    await writeBytes(deviceId, serviceUuid, charUuid, new Uint8Array([0x0A, 0x0A, 0x0A]));

    await writeBytes(deviceId, serviceUuid, charUuid, RESET_TO_TEXT);
}
