// helpers/geo-permissions.js (opcional)
import { Geolocation } from '@capacitor/geolocation'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export async function ensureLocationPermissionOnce() {
    if (Capacitor.getPlatform() !== 'android' && Capacitor.getPlatform() !== 'ios') return true

    try {
        const perm = await Geolocation.checkPermissions()
        if (perm.location === 'granted' || perm.coarseLocation === 'granted') return true

        const req = await Geolocation.requestPermissions()
        return req.location === 'granted' || req.coarseLocation === 'granted'
    } catch {
        return false
    }
}

export async function tryGetLocation() {
    // opcional: valida también que el GPS esté encendido
    try {
        return await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
        })
    } catch {
        return null
    }
}

export async function openAppSettings() {
    try { await App.openSettings() } catch { }
}
