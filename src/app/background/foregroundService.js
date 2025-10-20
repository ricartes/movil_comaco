// src/app/background/foregroundService.js
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { Capacitor } from '@capacitor/core';
import { syncPendientesStreaming } from '@/app/services/GdeEnvioService';

const CHANNEL_ID = 'gde-sync';
let intervalId = null;
let running = false; // 👈 guard local

async function ensureNotificationPermission() {
    if (Capacitor.getPlatform() !== 'android') return;
    try { await ForegroundService.requestNotificationsPermission(); } catch { }
}

function stopSyncLoop() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

export async function startGdeSyncForegroundService(empId, rutEmisor) {
    if (Capacitor.getPlatform() !== 'android') return;
    if (running) return; // 👈 evita segundo start
    running = true;

    try {
        await ensureNotificationPermission();

        await ForegroundService.createNotificationChannel({
            id: CHANNEL_ID,
            name: 'Sincronización GDE',
            description: 'Sincronización automática de guías',
            importance: 3,
        });

        await ForegroundService.startForegroundService({
            id: 1,
            title: 'Sincronizando GDE',
            body: 'Envío automático activo',
            smallIcon: 'ic_stat_gde_sync',
            notificationChannelId: CHANNEL_ID,
            buttons: [{ title: 'Detener', id: 1 }],
            silent: false,
        });

        // Loop cada 60s
        stopSyncLoop();
        intervalId = setInterval(async () => {
            try {
                console.log(empId);
                console.log(rutEmisor);
                await syncPendientesStreaming(empId, rutEmisor);
                await ForegroundService.updateForegroundService({
                    id: 1,
                    title: 'Sincronizando GDE',
                    body: 'Última sync: ' + new Date().toLocaleTimeString(),
                    smallIcon: 'ic_stat_gde_sync',
                });
            } catch (e) {
                console.log(e);
                await ForegroundService.updateForegroundService({
                    id: 1,
                    title: 'Sincronizando GDE',
                    body: 'Error de sync. Reintento en 60s…',
                    smallIcon: 'ic_stat_gde_sync',
                });
                console.warn('Sync error:', e?.message || e);
            }
        }, 60_000);
    } catch (e) {
        running = false; // libera el guard si falló
        stopSyncLoop();
        console.error('startForegroundService error:', e);
        throw e;
    }
}

export async function stopGdeSyncForegroundService() {
    stopSyncLoop();
    if (Capacitor.getPlatform() !== 'android') return;
    try { await ForegroundService.stopForegroundService(); } finally { running = false; }
}

// Botón "Detener" de la notificación
export function attachNotificationActionHandler() {
    if (Capacitor.getPlatform() !== 'android') return;
    ForegroundService.addListener('buttonPressed', async (event) => {
        if (event?.id === 1) await stopGdeSyncForegroundService();
    });
}
