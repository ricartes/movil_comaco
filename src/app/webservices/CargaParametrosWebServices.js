var CargaParametrosWebServices = {

    async cargarOrdenCompra(empId, rut) {
        const uuid = await Utilidades.getUIDevice();
        const url = (
            Constantes.direccionServidorPredeterminado +
            Constantes.nombreWebServicePredeterminado +
            config.rutas.RescatarOrdenCompra
        );
        const params = new URLSearchParams();
        params.append('rut', rut);
        params.append('empId', empId);
        params.append('uuid', uuid);
        const options = {
            url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: params.toString()
        };

        const response = await CapacitorHttp.get(options);

        return response.data; // CapacitorHttp ya parsea JSON
    },
}

import Utilidades from '@/app/Utilidades'
import Constantes from '@/app/Common/Constantes';
import config from "@/Common/json/config.json"
export default CargaParametrosWebServices;