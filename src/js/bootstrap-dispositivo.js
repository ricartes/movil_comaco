// src/js/services/bootstrap-dispositivo.js

import { getFcmTokenWithInfo } from '../app/services/push';
import { validarDispositivo } from '../app/services/DispositivoService';
import Utilidades from '../app/Utilidades';

export async function bootstrapValidacionDispositivo() {
    const payload = await Utilidades.buildDispositivoPayload();

    // 🔹 Obtener token + datos de proyecto Firebase
    const fcmData = await getFcmTokenWithInfo();
    if (fcmData) {
        payload.fcmToken = fcmData.token;
        payload.proyectoClienteId = fcmData.projectId;
        payload.remitenteClienteId = fcmData.senderId;
    }
    return validarDispositivo(payload); // { uid, estado, bloquea, message }
}
