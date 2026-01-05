import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export async function getLocationOnce() {
    // 1) Ver permisos
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
            throw new Error('Permiso de ubicación denegado.');
        }
    }

    // 2) Intento 1 (rápido pero no tanto)
    try {
        const { coords, timestamp } = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 30000,   // 👈 sube a 20-30s
            maximumAge: 0,
        });

        return {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy ?? null,
            timestamp: timestamp ?? Date.now(),
        };
    } catch (e) {
        // 3) Fallback: si falló por timeout, reintenta con menor precisión
        const msg = String(e?.message || e);
        const isTimeout =
            msg.includes('timeout') ||
            msg.includes('timed out') ||
            msg.includes('Could not obtain location in time');

        if (!isTimeout) throw e;

        const { coords, timestamp } = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,  // 👈 ayuda si el GPS no fija rápido
            timeout: 30000,
            maximumAge: 60000,          // permite caché de 1 min
        });

        return {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy ?? null,
            timestamp: timestamp ?? Date.now(),
        };
    }
}
