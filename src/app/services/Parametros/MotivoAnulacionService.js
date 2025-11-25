import { getMotivoAnulacionDao } from "@/app/services/initServices"

export async function listarMotivosAnulacion(empId) {
    return await getMotivoAnulacionDao().listarPorEmpresa(empId);
}

