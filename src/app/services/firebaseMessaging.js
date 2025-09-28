// src/services/firebaseMessaging.js
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

/**
 * Escucha los mensajes push (foreground y cuando se toca la notificación)
 * @param {Function} onMessage callback para mensajes en foreground
 * @param {Function} onBackground callback para cuando se toca la notificación
 */
export function listenForFcmMessages(onMessage, onBackground) {
    try {
        // Mensajes cuando la app está en primer plano
        FirebaseMessaging.addListener('notificationReceived', (event) => {
            console.log('Push recibido (foreground):', event);
            if (onMessage) onMessage(event);
        });

        // Mensajes cuando se toca la notificación (app abierta desde background)
        FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
            console.log(' Notificación tocada (background):', event);
            if (onBackground) onBackground(event);
        });
    } catch (e) {
        console.warn('No se pudo inicializar listener de FCM:', e);
    }
}


export function extractPushData(event) {
    // Algunos entregan { notification: { title, body, data } }
    // Otros ponen data directo en event.data
    const n = event?.notification ?? {};
    const data = n?.data ?? event?.data ?? {};

    // Título/cuerpo pueden venir en:
    // - notification.title/body
    // - event.title/body (algunos plugins)
    // - data._title/_body (nuestro duplicado)
    const title = n?.title ?? event?.title ?? data?._title ?? '';
    const body = n?.body ?? event?.body ?? data?._body ?? '';

    return { data, title, body };
}