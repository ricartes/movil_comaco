import { Capacitor, PermissionsAndroid } from '@capacitor/core';

export async function ensureBluetoothPermissions() {
    if (Capacitor.getPlatform() !== 'android') return;

    try {
        const result = await PermissionsAndroid.requestMultiple([
            'android.permission.BLUETOOTH_CONNECT',
            'android.permission.BLUETOOTH_SCAN',
            'android.permission.ACCESS_FINE_LOCATION',
        ]);

        console.log('Permisos Bluetooth:', result);
        return result;
    } catch (err) {
        console.error('Error solicitando permisos Bluetooth:', err);
        throw err;
    }
}

export async function listPrinters() {
    await ensureBluetoothPermissions();

    return new Promise((resolve, reject) => {
        if (!window.BTPrinter) {
            return reject('Plugin BTPrinter no disponible');
        }
        window.BTPrinter.list(resolve, reject);
    });
}

export async function connectPrinter(macAddress) {
    await ensureBluetoothPermissions();

    return new Promise((resolve, reject) => {
        if (!window.BTPrinter) {
            return reject('Plugin BTPrinter no disponible');
        }
        window.BTPrinter.connect(
            macAddress,
            (res) => {
                console.log('Conectado a', macAddress, res);
                resolve(res);
            },
            (err) => {
                console.error('Error al conectar:', err);
                reject(err);
            }
        );
    });
}

export async function printText(text) {
    return new Promise((resolve, reject) => {
        if (!window.BTPrinter) {
            return reject('Plugin BTPrinter no disponible');
        }
        window.BTPrinter.printText(
            text,
            (res) => {
                console.log('Impresión ok', res);
                resolve(res);
            },
            (err) => {
                console.error('Error al imprimir texto:', err);
                reject(err);
            }
        );
    });
}

export async function disconnectPrinter() {
    return new Promise((resolve, reject) => {
        if (!window.BTPrinter) {
            return reject('Plugin BTPrinter no disponible');
        }
        window.BTPrinter.disconnect(resolve, reject);
    });
}
