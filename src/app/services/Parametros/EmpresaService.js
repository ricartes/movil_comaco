import { getEmpresaDao } from "../initServices";
export async function obtenerEmpresa(empId) {
    return await getEmpresaDao().obtener(empId);
}