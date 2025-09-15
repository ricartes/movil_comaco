import { getGdeDao } from "@/app/services/initServices"

export async function listarPorEmpresaYRutPaginado(empId, rut) {

    return await getGdeDao().listarPorEmpresaYRut(empId, rut);
}

export async function listarPorEmpresaYRut(empId, rut) {

    return await getGdeDao().listarPorEmpresaYRut(empId, rut);
}