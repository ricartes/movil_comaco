
import config from "@/Common/json/config.json";
import store from '@/js/store'

import { getGdeDao } from "@/app/services/initServices";
import CargaParametrosWebServices from "@/app/webservices/CargaParametrosWebServices";

export async function enviarGde(gde) {

    const token = store.state.token;
    if (!token) throw new Error('Token no disponible');
    const gdeDao = getGdeDao();
    const estadoEnviada = config.parametros.estadosGuia.ENVIADA
    const idempotencyKey = gde._id || `${gde.empId}-${gde.folio}`
    const ahoraISO = new Date().toISOString()
    const ruta = config.rutas.guardarGde;

    const payload = {
        ...gde,
        estado: estadoEnviada,
        sentAt: ahoraISO,
        //appVersion: (config.app && config.app.version) || '1.0.0',
        tzOffsetMin: new Date().getTimezoneOffset() * -1,
    }

    try {
        const resp = await CargaParametrosWebServices.postJson(
            payload,
            ruta,
            token,
            { 'X-Idempotency-Key': String(idempotencyKey) }
        )

        if (!resp?.status) {
            throw new Error(resp?.message || `No se pudo enviar la guía N° ${gde.folio}`)
        }

        // guarda estado local como sincronizado
        const actualizado = {
            ...gde,
            estado: estadoEnviada,
            sincronizado: true,
            sincronizadoAt: ahoraISO,
            serverResponse: resp, // opcional
        }
        await gdeDao.actualizar(actualizado)
        return actualizado
    } catch (e) {
        // marca para reintento
        const conError = {
            ...gde,
            estado: estadoEnviada, // ya salió de la app
            sincronizado: false,
            ultimoErrorSync: String((e && e.message) || e),
            ultimoIntentoSyncAt: ahoraISO,
        }
        await gdeDao.actualizar(conError)
        throw e
    }
}