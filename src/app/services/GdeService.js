// GdeService.js
import { getGdeDao } from "@/app/services/initServices";

export async function listarPorEmpresaYRutPaginado(empId, rut, opts) {
    return await getGdeDao().listarPorEmpresaYRutPaginado(empId, rut, opts);
}

export async function listarPorEmpresaYRut(empId, rut) {
    return await getGdeDao().listarPorEmpresaYRut(empId, rut);
}

export async function obtenerGde(id) {
    return await getGdeDao().obtener(id);
}

export async function ingresarGde(gde) {
    return await getGdeDao().insertar(gde); // devuelve doc completo
}
