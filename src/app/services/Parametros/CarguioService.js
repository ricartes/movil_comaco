import { getCarguioDao } from "@/app/services/initServices"

export async function listarCarguios() {

    return await getCarguioDao().listar();
}

export async function listarPatentesCarguioPorRut(rutCarguio) {

    return await getCarguioDao().listarPatentesPorRut(rutCarguio);
}

