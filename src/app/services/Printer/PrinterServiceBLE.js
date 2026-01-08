// /app/services/Printer/PrinterServiceBLE.js
import store from '@/js/store';
import { BleClient } from '@capacitor-community/bluetooth-le';

const SCAN_MS = 4500;
const CONNECT_TIMEOUT_MS = 8000;
const WRITE_CHUNK = 20;
const WRITE_DELAY_MS = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (u) => String(u || '').toLowerCase();

const FFE0 = '0000ffe0-0000-1000-8000-00805f9b34fb';
const FFE1 = '0000ffe1-0000-1000-8000-00805f9b34fb';
const FFF0 = '0000fff0-0000-1000-8000-00805f9b34fb';
const FFF1 = '0000fff1-0000-1000-8000-00805f9b34fb';

let _initialized = false;
let _connectedDeviceId = null;
let _cachedPick = null; // { serviceUuid, charUuid }



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

async function writeBytes(deviceId, serviceUuid, charUuid, bytes) {
    for (let i = 0; i < bytes.length; i += WRITE_CHUNK) {
        const chunk = bytes.slice(i, i + WRITE_CHUNK);
        try {
            await BleClient.write(deviceId, serviceUuid, charUuid, chunk);
        } catch (e1) {
            // algunas impresoras solo aceptan writeWithoutResponse
            await BleClient.writeWithoutResponse(deviceId, serviceUuid, charUuid, chunk);
        }
        await sleep(WRITE_DELAY_MS);
    }
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

export async function printTextSafe(text = 'Prueba BLE\n\n') {
    const ok = await ensureConnected();
    if (!ok) throw new Error('No hay impresora BLE configurada.');

    const deviceId = _connectedDeviceId;
    const { serviceUuid, charUuid } = await pickWriteCharacteristic(deviceId);

    const payload = new TextEncoder().encode(String(text ?? ''));
    await writeBytes(deviceId, serviceUuid, charUuid, payload);
}

export async function printRawText(text) {
    return printTextSafe(text);
}

// (Opcional) por ahora no lo implementes en BLE si no lo necesitas.
// Convertir imagen a ESC/POS por BLE requiere rasterización + comandos ESC/POS.
export async function printBase64Safe() {
    throw new Error('printBase64Safe aún no implementado en BLE (requiere raster ESC/POS).');
}


export async function connectByName(name) {
    if (!name) throw new Error('Nombre de impresora vacío');
    await connectByScanName(name);
    return true;
}

export async function isConnected() {
    return !!_connectedDeviceId;
}
