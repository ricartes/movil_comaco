import { Geolocation } from '@capacitor/geolocation';

export async function getLocationOnce() {
    try {
        await Geolocation.requestPermissions();

        const { coords, timestamp } = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
        });

        return {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy ?? null,
            timestamp: timestamp ?? Date.now(),
        };
    } catch (e) {
        console.warn("No se pudo obtener ubicación:", e.message || e);
        throw e;
    }
}
