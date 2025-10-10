// PrinterService.js
import { Capacitor } from '@capacitor/core';

export async function ensureBluetoothPermissions() {
    if (Capacitor.getPlatform() !== 'android') return;

    const perms = window.cordova && window.cordova.plugins && window.cordova.plugins.permissions;
    if (!perms) {
        console.warn('cordova-plugin-android-permissions no disponible; continuo sin pedir permisos explícitos');
        return;
    }

    var requested = [
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION', // muchos plugins BT clásico aún lo requieren
    ];

    await new Promise(function (resolve, reject) {
        perms.requestPermissions(requested, function () { resolve(); }, function (err) { reject(err); });
    });
}

export async function listPrinters() {
    await ensureBluetoothPermissions();

    return new Promise(function (resolve, reject) {
        if (!window.BTPrinter) {
            return reject('Plugin BTPrinter no disponible');
        }
        window.BTPrinter.list(resolve, reject);
    });
}

export async function connectPrinter(macAddress) {
    await ensureBluetoothPermissions();

    return new Promise(function (resolve, reject) {
        if (!window.BTPrinter) {
            return reject('Plugin BTPrinter no disponible');
        }
        window.BTPrinter.connect(
            macAddress,
            function (res) { resolve(res); },
            function (err) { reject(err); }
        );
    });
}

export async function printText(text) {
    return new Promise(function (resolve, reject) {
        if (!window.BTPrinter) {
            return reject('Plugin BTPrinter no disponible');
        }
        window.BTPrinter.printText(
            text,
            function (res) { resolve(res); },
            function (err) { reject(err); }
        );
    });
}

export async function disconnectPrinter() {
    return new Promise(function (resolve, reject) {
        if (!window.BTPrinter) {
            return reject('Plugin BTPrinter no disponible');
        }
        window.BTPrinter.disconnect(
            function (res) { resolve(res); },
            function (err) { reject(err); }
        );
    });
}
