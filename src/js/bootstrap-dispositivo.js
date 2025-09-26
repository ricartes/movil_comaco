// src/js/services/bootstrap-dispositivo.js

import { getFcmTokenOrNull } from '../app/services/push';
import { validarDispositivo } from '../app/services/DispositivoService';
import Utilidades from '../app/Utilidades';

export async function bootstrapValidacionDispositivo() {
    const payload = await Utilidades.buildDispositivoPayload();
    const fcmToken = await getFcmTokenOrNull();

    if (fcmToken) payload.fcmToken = fcmToken;

    return validarDispositivo(payload); // { uid, estado, bloquea, message }
}
