// src/app/services/HelperService.js
import HelperWebServices from "../Webservices/HelperWebServices";

const HelperService = {
    /**
     * Verifica si hay conexión real con la API.
     * Devuelve true o false directamente.
     */
    async validarConexion(timeoutMs = 3000) {
        try {
            const ok = await HelperWebServices.pingApi(timeoutMs);
            return !!ok; // fuerza boolean
        } catch (error) {
            console.warn('[HelperService] Error al validar conexión:', error?.message || error);
            return false;
        }
    },
};

export default HelperService;
