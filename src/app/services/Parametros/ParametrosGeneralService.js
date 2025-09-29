import { getParametroGeneralDao } from "@/app/services/initServices"

export async function listarParametrosGenerales(empId) {

    return await getParametroGeneralDao().listarPorEmpresa(empId);
}

