import { Geolocation } from '@capacitor/geolocation';



export async function getLocationOnce() {
    // 1) Permisos (fine o coarse)
    const perm = await Geolocation.checkPermissions();
    const granted =
        perm.location === 'granted' || perm.coarseLocation === 'granted';

    if (!granted) {
        const req = await Geolocation.requestPermissions();
        const ok =
            req.location === 'granted' || req.coarseLocation === 'granted';
        if (!ok) throw new Error('Permiso de ubicación denegado.');
    }

    // 2) Intento A: usa caché reciente (rápido, útil offline)
    try {
        const p = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 120000, // 2 min
        });
        return normalize(p);
    } catch (_) {
        // sigue
    }

    // 3) Intento B: fix GPS real (bosque => más tiempo)
    const p2 = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 60000, // 60s
        maximumAge: 0,
    });

    return normalize(p2);
}

function normalize({ coords, timestamp }) {
    return {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy ?? null,
        timestamp: timestamp ?? Date.now(),
    };
}

