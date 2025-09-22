import { Geolocation } from '@capacitor/geolocation';

export async function getLocationOnce() {
    // (Opcional) pedir permiso de forma explícita
    await Geolocation.requestPermissions(); // iOS: 'whenInUse' por defecto

    const { coords, timestamp } = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,         // ms
        maximumAge: 0,
    });

    return {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy ?? null,
        timestamp: timestamp ?? Date.now(),
    };
}
