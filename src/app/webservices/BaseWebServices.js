import { CapacitorHttp } from '@capacitor/core';
import Constantes from '../Common/Constantes';
import { getToken, getRefreshToken } from '../Seguridad';
import UsuarioService from '../services/UsuarioService';

var BaseWebServices = {

    async protectedRequest(method, endpoint, options = {}) {
        let url = `${Constantes.direccionServidorPredeterminado}${Constantes.nombreWebServicePredeterminado}${endpoint}`;

        try {
            // Obtén el Access Token actual
            let accessToken = await getToken('accessToken');

            // Configura las cabeceras de la solicitud
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };

            // Si hay parámetros y el método es GET, construye el query string
            if ((method === 'GET' || method === 'DELETE') && options.params) {
                const queryParams = new URLSearchParams(options.params).toString();
                url = `${url}?${queryParams}`;
            }

            // Construye las opciones de la solicitud
            const requestOptions = {
                method: method,
                url: url,
                headers: options.headers,
            };


            // Sólo incluye 'data' si el método no es GET o HEAD
            if (method !== 'GET' && method !== 'HEAD' && options.data) {
                requestOptions.data = options.data;
            }

            // Realiza la solicitud
            const response = await CapacitorHttp.request(requestOptions);

            // Manejo de errores HTTP
            if (response.status === 401) {
                throw new Error('Unauthorized: Access is denied due to invalid credentials.');
            }
            if (response.status === 404) {
                throw new Error('Not Found: The requested resource could not be found.');
            }

            return response.data; // Retorna los datos si todo está correcto
        } catch (error) {
            console.error('Error en la solicitud protegida:', error.message);
            throw error; // Propaga el error
        }
    }


}
export default BaseWebServices;
//import $ from 'jquery'

