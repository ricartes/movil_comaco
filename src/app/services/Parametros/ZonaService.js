import { getZonaDao } from "@/app/services/initServices"

export async function listarPorEmpresa(empId) {

    return await getZonaDao().listarPorEmpresa(empId);
}

