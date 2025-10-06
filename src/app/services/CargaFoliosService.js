import CargaParametrosWebServices from '@/app/webservices/CargaParametrosWebServices'

export function cargarFoliosDesdeWeb() {

    const token = store.state.token
    if (!token) throw new Error('Token no disponible')

    const ruta = config.rutas.RescatarUsuarioRangoFolio;
    const resp = await CargaParametrosWebServices.cargarParametro(empId, rut, ruta, token)
    if (!resp?.status) {
        throw new Error(resp?.message || `Error en servicio de ${nombre}`)
    }


}