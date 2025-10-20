import { CapacitorHttp } from '@capacitor/core';
import Constantes from '../Common/Constantes';
import config from "../../Common/json/config.json";

var HelperWebServices = {

    rutas() {
        return config.rutas;
    },

    /**
     * Verifica si hay conexión con el backend (ping real a la API).
     * Se recomienda tener un endpoint público `/mapi/v1/ping`
     * que devuelva un 200 rápido y sin autenticación.
     */
    async pingApi(timeoutMs = 3000) {
        const url = `${Constantes.direccionServidorPredeterminado}${Constantes.nombreWebServicePredeterminado}ping`;

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            const response = await CapacitorHttp.get({
                url,
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timer);

            if (response.status === 200) {
                console.log(`[PING] ✅ API disponible (${url})`);
                return true;
            }

            console.warn(`[PING] ⚠️ API respondió con estado ${response.status}`);
            return false;

        } catch (error) {
            console.warn('[PING] ❌ No hay conexión real con la API:', error?.message || error);
            return false;
        }
    },

    /**
     * Método legacy: valida conectividad (a mantener por compatibilidad)
     * Usa la ruta definida en config.rutas.validaConexion
     */
    async validarConexion() {
        try {
            const response = await CapacitorHttp.get({
                url: `${Constantes.direccionServidorPredeterminado}${Constantes.nombreWebServicePredeterminado}${this.rutas().validaConexion}`,
            });
            return response.status === 200;
        } catch (error) {
            console.error('Error en validarConexion:', error);
            return false;
        }
    }
};

export default HelperWebServices;
