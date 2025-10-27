import config from '@/Common/json/config.json'
import store from '@/js/store'
import { getGdeDao } from "@/app/services/initServices";
import CargaParametrosWebServices from '@/app/webservices/CargaParametrosWebServices'
import { makeGdeRescatadaDoc } from '@/app/mappers/gdeMapper';

export async function rescatarGuias(empId, rut) {
    const token = store.state.token;

    const gdeDao = getGdeDao();


    if (!token) throw new Error('Token no disponible');

    const folios = await gdeDao.listarFoliosPorEmpresaYRut(empId, rut);
    const respGde = await CargaParametrosWebServices.postJson(
        { empId: empId, rutEmisor: rut, folios: folios },
        config.rutas.rescatarGde,
        token
    );

    if (!respGde?.status) {
        throw new Error(respGde?.message || `No se pudo cargar gde`)
    }

    const guias = respGde?.data ?? [];
    const resultado = await rescatarMultiplesGde(guias);
    // resultado = { total, ok, fail, errores }
    return { status: true, count: resultado.total, ok: resultado.ok, fail: resultado.fail, errores: resultado.errores };
}




export async function rescatarGde(gdeServidor) {
    const dao = getGdeDao();
    // Normaliza si corresponde
    const listo = makeGdeRescatadaDoc ? makeGdeRescatadaDoc(gdeServidor) : gdeServidor;
    return await dao.upsertRescatada(listo);
}

export async function rescatarMultiplesGde(listaServidor) {
    const dao = getGdeDao();
    const normalizados = makeGdeRescatadaDoc ? listaServidor.map(makeGdeRescatadaDoc) : listaServidor;
    return await dao.upsertRescatadas(normalizados, { concurrency: 6 });
}
