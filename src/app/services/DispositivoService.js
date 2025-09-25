// src/js/services/DispositivoService.js
import { validarWs } from "../webservices/DispositivoWebService"

export async function validarDispositivo(payload) {
    try {
        const data = await validarWs(payload)
        // backend responde { uid, estado, bloquea, message }
        return data
    } catch (err) {
        console.error('Error en validarDispositivo()', err)
        throw err
    }
}
