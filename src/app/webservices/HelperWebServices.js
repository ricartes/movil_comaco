
//import $ from 'jquery'
import { CapacitorHttp } from '@capacitor/core';
import Constantes from '../Common/Constantes';
import config from "../../Common/json/config.json"

var HelperWebServices = {
    rutas() {
        return config.rutas;
    },
    async validarConexion() {
        try {
            const response = await CapacitorHttp.get({
                url: `${Constantes.direccionServidorPredeterminado}${Constantes.nombreWebServicePredeterminado}${this.rutas().validaConexion}`, // Cambia la URL según sea necesario
            });

            if (response.status === 200) {
                return true;
                // Manejar la respuesta exitosa aquí
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    }
}
export default HelperWebServices;

