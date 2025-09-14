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
}

export default CargaParametrosWebServices
