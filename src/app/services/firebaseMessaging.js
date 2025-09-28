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
