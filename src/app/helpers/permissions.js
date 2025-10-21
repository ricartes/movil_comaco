import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { App } from '@capacitor/app'

export async function isNotificationGranted() {
    if (Capacitor.getPlatform() !== 'android') return true
    try {
        const perm = await PushNotifications.checkPermissions()
        return perm.receive === 'granted'
    } catch {
        return false
    }
}

export async function requestOrOpenSettings() {
    if (Capacitor.getPlatform() !== 'android') return true
    try {
        const req = await PushNotifications.requestPermissions()
        if (req.receive === 'granted') return true
        try { await App.openSettings() } catch { }
        return false
    } catch {
        return false
    }
}

/**
 * Verifica permisos de notificación y, si no están concedidos,
 * intenta solicitarlos una vez antes de redirigir a la pantalla bloqueada.
 */
export async function gateNotificationsOrBlock(router) {
    if (Capacitor.getPlatform() !== 'android') return true

    // 1️⃣ Verifica si ya está concedido
    let ok = await isNotificationGranted()
    if (ok) return true

    // 2️⃣ Si no, intenta pedirlo una vez
    try {
        const req = await PushNotifications.requestPermissions()
        if (req.receive === 'granted') {
            console.log('[Permisos] Notificaciones concedidas tras solicitud directa.')
            return true
        }
    } catch (e) {
        console.warn('[Permisos] Error al solicitar permisos:', e)
    }

    // 3️⃣ Si sigue sin permiso → redirige a pantalla bloqueada
    router?.navigate('/permisos-notificaciones/', {
        reloadAll: true,
        clearPreviousHistory: true,
    })
    return false
}
