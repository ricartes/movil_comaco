// src/js/services/DispositivoService.js
import { validarWs } from "../webservices/DispositivoWebService"

export async function validarDispositivo(payload) {
    try {
        const resp = await validarWs(payload)

        // backend responde { uid, estado, bloquea, message }
        if (!resp?.status) {
            const msg = resp?.message || resp?.error || "Error al validar dispositivo";
            throw new Error(msg);
        }

        // ⬅️ Devuelve el “inner data” tal como lo espera el resto del código
        return resp.data; // { uid, estado, bloquea, message }
    } catch (err) {
        console.error('Error en validarDispositivo()', err)
        throw err
    }
}
