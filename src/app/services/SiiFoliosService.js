import { getSiiFolioDao } from "@/app/services/initServices";


export async function listarUsuarioRangoFolio(empId, rut) {
    return getSiiFolioDao().listarUsuarioRangoFolioPorRut(empId, rut);
}

export async function listarFoliosPorUrf(empId, urfId) {
    return await getSiiFolioDao().listarFoliosPorUrf(Number(empId), Number(urfId));
}