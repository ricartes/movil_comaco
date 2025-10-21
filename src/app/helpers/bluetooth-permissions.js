import { Capacitor } from '@capacitor/core'

export async function ensureBluetoothPermissions(options = {}) {
    const needScan = !!options.needScan

    // Solo aplica a Android
    if (Capacitor.getPlatform() !== 'android') return true

    const { Device } = await import('@capacitor/device')
    const info = await Device.getInfo()
    const sdk = Number(info.androidSDKVersion || 0)

    // En Android 11 o menor, no es necesario pedir permisos
    if (sdk <= 30) return true

    const perms = window?.cordova?.plugins?.permissions
    if (!perms) {
        console.warn('[BluetoothPerms] Plugin cordova-plugin-android-permissions no disponible.')
        return false
    }

    const CONNECT = perms.BLUETOOTH_CONNECT
    const SCAN = perms.BLUETOOTH_SCAN

    const wanted = [CONNECT]
    if (needScan) wanted.push(SCAN)

    const check = (p) =>
        new Promise((resolve) =>
            perms.checkPermission(
                p,
                (r) => resolve(!!r.hasPermission),
                () => resolve(false)
            )
        )

    const request = (ps) =>
        new Promise((resolve) =>
            perms.requestPermissions(
                ps,
                (r) => resolve(!!r.hasPermission),
                () => resolve(false)
            )
        )

    // Verificar si ya están concedidos
    const checks = await Promise.all(wanted.map(check))
    if (checks.every(Boolean)) return true

    // Solicitar permisos faltantes
    const ok = await request(wanted)
    if (!ok) return false

    // Verificar nuevamente
    const after = await Promise.all(wanted.map(check))
    return after.every(Boolean)
}
