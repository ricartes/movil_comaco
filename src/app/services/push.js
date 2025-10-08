// Plugins oficiales Firebase para Capacitor v7
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';

export async function getFcmTokenWithInfo() {
    try {
        // 1️⃣ Permisos
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
            const req = await PushNotifications.requestPermissions();
            if (req.receive !== 'granted') return null;
        } else if (perm.receive !== 'granted') {
            return null;
        }

        // 2️⃣ Registro (Android casi siempre automático)
        await PushNotifications.register();

        // 3️⃣ Obtener token
        const tokenResp = await FirebaseMessaging.getToken(); // { token: string }
        const token = tokenResp?.token ?? null;
        if (!token) return null;

        // 4️⃣ Obtener projectId / senderId desde google-services.json
        // ⚠️ En Capacitor no hay API directa, así que lo extraemos del entorno
        // o lo defines en tu .env (más limpio)
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? null;
        const senderId = import.meta.env.VITE_FIREBASE_SENDER_ID ?? null;

        return {
            token,
            projectId,
            senderId,
        };
    } catch (e) {
        console.warn('No se pudo obtener FCM token o info:', e);
        return null;
    }
}