import { PushNotifications } from '@capacitor/push-notifications'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { Capacitor } from '@capacitor/core'
import capConfig from '../../../capacitor.config.json'
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics'

export async function getFcmTokenWithInfo() {
    try {
        let token = null

        // 1️⃣ Intentar obtener token directamente (Android no requiere permiso para token)
        if (Capacitor.isNativePlatform()) {
            try {
                const result = await FirebaseMessaging.getToken()
                token = result && result.token ? result.token : null
            } catch (e) {
                console.warn('[FCM] getToken() fallo:', e)
                await FirebaseCrashlytics.recordException({
                    message: '[FCM] getToken() fallo',
                    stack: e?.stack || String(e)
                })
            }
        }

        // 2️⃣ Verificar y solicitar permiso de notificaciones (solo para mostrar, no para token)
        try {
            const perm = await PushNotifications.checkPermissions()
            if (perm.receive === 'prompt') {
                const req = await PushNotifications.requestPermissions()
                if (req.receive === 'granted') {
                    await PushNotifications.register()
                }
            } else if (perm.receive === 'granted') {
                await PushNotifications.register()
            }
        } catch (e) {
            console.warn('[FCM] permisos/register fallo:', e)
            await FirebaseCrashlytics.recordException({
                message: '[FCM] permisos/register fallo',
                stack: e?.stack || String(e)
            })
        }

        // 3️⃣ Reintentar obtener token si no lo teníamos aún
        if (!token && Capacitor.isNativePlatform()) {
            try {
                const result2 = await FirebaseMessaging.getToken()
                token = result2 && result2.token ? result2.token : null
            } catch (e) {
                console.warn('[FCM] Segundo intento getToken() fallo:', e)
            }
        }

        if (!token) {
            console.warn('[FCM] No se obtuvo token FCM')
            return null
        }

        // 4️⃣ Adjuntar metadatos del proyecto
        const extra = capConfig?.extra || {}
        const projectId = extra.FIREBASE_PROJECT_ID || null
        const senderId = extra.FIREBASE_SENDER_ID || null

        return {
            token,
            projectId,
            senderId,
        }
    } catch (e) {
        console.warn('[FCM] getFcmTokenWithInfo error general:', e)
        await FirebaseCrashlytics.recordException({
            message: '[FCM] getFcmTokenWithInfo error general',
            stack: e?.stack || String(e)
        })
        return null
    }
}
