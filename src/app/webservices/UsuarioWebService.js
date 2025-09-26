import { CapacitorHttp } from '@capacitor/core'
import Constantes from '../Common/Constantes'
import config from '../../Common/json/config.json'
import Utilidades from '../Utilidades'

var UsuarioWebService = {


    async loginWs(rut, password, location) {
        const uuid = await Utilidades.getUIDevice();
        const url = (
            Constantes.direccionServidorPredeterminado +
            Constantes.nombreWebServicePredeterminado +
            config.rutas.Login_Movil
        );
        const params = new URLSearchParams();
        params.append('rut', rut);
        params.append('password', password);
        params.append('uuid', uuid);
        params.append('location', JSON.stringify(location));
        const options = {
            url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: params.toString()
        };

        const response = await CapacitorHttp.post(options);

        return response.data; // CapacitorHttp ya parsea JSON
    },
};

export default UsuarioWebService;
export const loginWs = UsuarioWebService.loginWs;
