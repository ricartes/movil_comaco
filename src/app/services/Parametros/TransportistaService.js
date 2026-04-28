import { getTransportistaDao } from "@/app/services/initServices"

export async function listarTransportistas() {

    return await getTransportistaDao().listar();
}


export async function listarPatentesPorTransportista(rutTransportista) {

    return await getTransportistaDao().listarPatentesPorTransportista(rutTransportista);
}

export async function listarPatentesCamion() {

    return await getTransportistaDao().listarPatentesCamion();
}

export async function obtenerTransportistaPorPatenteCamion(patCamion) {

    return await getTransportistaDao().obtenerTransportistaPorPatenteCamion(patCamion);
}


export async function listarPatentesCarroPorTransportistaCamion(rutTransportista, patCamion) {

    return await getTransportistaDao().listarPatentesCarroPorTransportistaCamion(rutTransportista, patCamion);
}

export async function listarConductoresPorCamionYCarro(rutTransportista, patCamion, patCarro) {

    return await getTransportistaDao().listarConductoresPorCamionYCarro(rutTransportista, patCamion, patCarro);
}
