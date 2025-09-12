import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';



const TOKEN_KEY = 'user-token';
const REFRESH_TOKEN_KEY = 'user-refresh-token';
const enc = new TextEncoder()


export async function setToken(token) {
    if (Capacitor.getPlatform() === 'web') {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        await Preferences.set({
            key: TOKEN_KEY,
            value: token,
        });
    }
}

export async function setRefreshToken(token) {
    if (Capacitor.getPlatform() === 'web') {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
        await Preferences.set({
            key: REFRESH_TOKEN_KEY,
            value: token,
        });
    }
}

export async function getToken() {
    if (Capacitor.getPlatform() === 'web') {
        return localStorage.getItem(TOKEN_KEY);
    } else {
        const { value } = await Preferences.get({ key: TOKEN_KEY });
        return value;
    }
}

export async function getRefreshToken() {
    if (Capacitor.getPlatform() === 'web') {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    } else {
        const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
        return value;
    }
}

export async function removeToken() {
    if (Capacitor.getPlatform() === 'web') {
        localStorage.removeItem(TOKEN_KEY);
    } else {
        await Preferences.remove({ key: TOKEN_KEY });
    }
}


export async function removeRefreshToken() {
    if (Capacitor.getPlatform() === 'web') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
        await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    }
}

export function parseJwt(token) {
    const base64Payload = token.split('.')[1]; // Obtén el payload del token
    const payload = atob(base64Payload); // Decodifica Base64 a string
    return JSON.parse(payload); // Parsea el resultado a un objeto JSON
}


export function validateToken(token) {
    const payload = parseJwt(token);
    const expiracion = payload.exp * 1000; // Multiplica por 1000 para convertir a milisegundos

    // Obtiene la fecha actual en milisegundos
    const fechaActual = new Date().getTime();


    // Comprueba si la fecha actual es mayor que la fecha de expiración
    if (fechaActual > expiracion) {
        // Token expirado
        return false;
    }

    // Token válido
    return true;
}


export async function derivePinHash(pin, salt, iterations = 150_000) {
    const material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations },
        material,
        256
    )
    return btoa(String.fromCharCode(...new Uint8Array(bits))) // base64
}

export async function verifyPin(pin, salt, expected) {
    const h = await derivePinHash(pin, salt)
    return h === expected
}




