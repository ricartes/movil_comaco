import { getGdeDao } from "@/app/services/initServices"
import { sanitizeForPouch } from "@/app/helpers/JsonHelpers";

export async function listarPorEmpresaYRutPaginado(empId, rut) {

    return await getGdeDao().listarPorEmpresaYRut(empId, rut);
}

export async function listarPorEmpresaYRut(empId, rut) {

    return await getGdeDao().listarPorEmpresaYRut(empId, rut);
}


export async function ingresarGde(gde) {

    return await getGdeDao().insertar(gde);
}