// src/js/services/DispositivoWebService.js
import { CapacitorHttp } from '@capacitor/core'
import Constantes from '../Common/Constantes'
import config from '../../Common/json/config.json'

const DispositivoWebService = {
    async validar(payload) {
        const url =
            Constantes.direccionServidorPredeterminado +
            Constantes.nombreWebServicePredeterminado +
            config.rutas.ValidarDispositivo

        const options = {
            url,
            headers: {
                'Content-Type': 'application/json',
            },
            data: payload, // se envía el objeto como JSON
        }

        const response = await CapacitorHttp.post(options)
        return response.data // CapacitorHttp parsea JSON automáticamente
    },
}

export default DispositivoWebService
export const validarWs = DispositivoWebService.validar
