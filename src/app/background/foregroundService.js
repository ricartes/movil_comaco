// src/app/background/foregroundService.js
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { App } from '@capacitor/app'
import { syncPendientesStreaming } from '@/app/services/GdeEnvioService'

const CHANNEL_ID = 'gde-sync'
let intervalId = null
let running = false

// ✅ Pide/valida POST_NOTIFICATIONS en Android 13+ y devuelve true/false
async function ensureNotificationPermission() {
    if (Capacitor.getPlatform() !== 'android') return true
    try {
        const perm = await PushNotifications.checkPermissions()
        if (perm.receive === 'granted') return true

        const req = await PushNotifications.requestPermissions()
        if (req.receive === 'granted') return true

        // Denegado: ofrece abrir ajustes y no inicies el FGS
        try { await App.openSettings() } catch { }
        return false
    } catch (e) {
        console.warn('[FGS] check/request POST_NOTIFICATIONS error', e)
        return false
    }
}

function stopSyncLoop() {
    if (intervalId) { clearInterval(intervalId); intervalId = null }
}

export async function startGdeSyncForegroundService(empId, rutEmisor) {
    if (Capacitor.getPlatform() !== 'android') return
    if (running) return
    running = true

    try {
        const granted = await ensureNotificationPermission()
        if (!granted) { running = false; return } // ⛔ evita crash si no hay permiso

        // Canal de notificación (crear antes de iniciar)
        await ForegroundService.createNotificationChannel({
            id: CHANNEL_ID,
            name: 'Sincronización GDE',
            description: 'Sincronización automática de guías',
            importance: 3, // DEFAULT
        })

        // Inicia FGS con canal/ícono válidos + tipo dataSync
        await ForegroundService.startForegroundService({
            id: 1,
            title: 'Sincronizando GDE',
            body: 'Envío automático activo',
            smallIcon: 'ic_stat_gde_sync',     // debe existir en res/drawable/
            notificationChannelId: CHANNEL_ID,  // canal creado arriba
            serviceType: 'dataSync',            // Android 14/15
            buttons: [{ title: 'Detener', id: 1 }],
            silent: false,
        })

        // Loop cada 60s
        stopSyncLoop()
        intervalId = setInterval(async () => {
            try {
                await syncPendientesStreaming(empId, rutEmisor)

            } catch (e) {
                console.warn('[SYNC] error:', e?.message || e)

            }
        }, 60_000)
    } catch (e) {
        running = false
        stopSyncLoop()
        console.error('startForegroundService error:', e)
        throw e
    }
}

export async function stopGdeSyncForegroundService() {
    stopSyncLoop()
    if (Capacitor.getPlatform() !== 'android') return
    try { await ForegroundService.stopForegroundService() } finally { running = false }
}

export function attachNotificationActionHandler() {
    if (Capacitor.getPlatform() !== 'android') return
    ForegroundService.addListener('buttonPressed', async (event) => {
        if (event?.id === 1) await stopGdeSyncForegroundService()
    })
}
