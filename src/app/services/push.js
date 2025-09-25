// Plugins oficiales Firebase para Capacitor v7
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

export async function getFcmTokenOrNull() {
    try {
        // 1) Solicitar permiso de notificaciones (iOS). En Android casi siempre granted.
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
            const req = await PushNotifications.requestPermissions();
            if (req.receive !== 'granted') return null;
        } else if (perm.receive !== 'granted') {
            return null;
        }

        // 2) Registrar para recibir push (necesario para APNS/FCM handshake)
        await PushNotifications.register();

        // 3) Obtener token FCM
        const token = await FirebaseMessaging.getToken(); // { token: string }
        return token?.token ?? null;
    } catch (e) {
        console.warn('No se pudo obtener FCM token:', e);
        return null;
    }
}
