import { getTransportistaDao } from "@/app/services/initServices"

export async function listarTransportistas() {

    return await getTransportistaDao().listar();
}


export async function listarPatentesPorTransportista(rutTransportista) {

    return await getTransportistaDao().listarPatentesPorTransportista(rutTransportista);
}
