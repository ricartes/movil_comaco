import { CapacitorHttp } from '@capacitor/core'
import Utilidades from '@/app/Utilidades'
import { apiBase, urlJoin } from '../helpers/ApiHelpers'

const CargaParametrosWebServices = {
    async cargarParametro(empId, rut, ruta, token) {
        const uuid = await Utilidades.getUIDevice()
        const url = urlJoin(apiBase(), ruta);
        const { data } = await CapacitorHttp.get({
            url,
            params: { empId: String(empId), rut: String(rut), uuid },
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
        })



        return data // JSON parseado
    },

    /**
   * POST genérico enviando JSON al backend
   * @param {Object} body - cuerpo de la solicitud (JSON)
   * @param {string} ruta - ruta relativa del endpoint (ej: 'api/sii-usuario-rango-folio/confirmar')
   * @param {string} token - token Bearer JWT
   */
    async postJson(body, ruta, token, extraHeaders = {}, timeout = 20000) {
        const uuid = await Utilidades.getUIDevice()
        const url = urlJoin(apiBase(), ruta)

        const { data } = await CapacitorHttp.post({
            url,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                ...extraHeaders, // ej: X-Idempotency-Key
            },
            data: {
                ...body,
                uuid, // opcional: mantener trazabilidad del dispositivo
            },
            readTimeout: timeout,
            connectTimeout: timeout,
        })

        return data // JSON parseado
    },
}

export default CargaParametrosWebServices
