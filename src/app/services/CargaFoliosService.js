import CargaParametrosWebServices from '@/app/webservices/CargaParametrosWebServices'
import config from '@/Common/json/config.json'
import store from '@/js/store'
import { getSiiFolioDao } from '@/app/services/initServices';
import { folioDocId, buildFoliosDocsFromURF } from '@/app/mappers/SiiFolioMapper';
import { mapServerURFToDoc } from '@/app/mappers/SiiUsuarioRangoFolioMapper';
import { v4 as uuidv4 } from 'uuid';


const newBatchId = () =>
(crypto?.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2))

export async function cargarFoliosDesdeWeb(empId, rut) {
    const token = store.state.token;
    if (!token) throw new Error('Token no disponible');

    const ruta = config.rutas.RescatarUsuarioRangoFolio;
    const resp = await CargaParametrosWebServices.cargarParametro(empId, rut, ruta, token);
    if (!resp?.status) throw new Error(resp?.message || `Error en servicio ${ruta}`);

    const lista = Array.isArray(resp.data) ? resp.data : [];
    if (lista.length === 0) return { ok: true, inserted: 0, confirmed: [] };

    const dao = getSiiFolioDao();
    const batchId = newBatchId();

    // 1️⃣ Armar documentos determinísticos
    const stagingDocs = [];
    for (const item of lista) {
        stagingDocs.push(mapServerURFToDoc(item, { batchId, staging: true }));
        stagingDocs.push(...buildFoliosDocsFromURF(item, { batchId, staging: true }));
    }

    // 2️⃣ Intentar insertar solo los nuevos (bulkInsert ignora duplicados)
    const { inserted, conflicts } = await dao.bulkInsert(stagingDocs);

    // 3️⃣ Confirmar los nuevos URF en el backend
    const confirmados = [];
    try {
        for (const item of lista) {
            const payload = { empId: item.empId, urfId: item.urfId };
            const confirmResp = await CargaParametrosWebServices.postJson(
                payload,
                config.rutas.ConfirmarUsuarioRangoFolio,
                token
            );

            if (!confirmResp?.status) {
                throw new Error(confirmResp?.message || `No se pudo confirmar URF ${item.urfId}`);
            }
            confirmados.push(item.urfId);
        }
    } catch (err) {
        // 4️⃣ Rollback del batch si algo falla
        await dao.eliminarPorBatchId(batchId);
        throw err;
    }

    // 5️⃣ Actualizar batch como confirmado
    await dao.actualizarBatch(batchId, {
        staging: false,
        verificado: 2,
        updatedAt: new Date().toISOString(),
    });

    return {
        ok: true,
        inserted,
        conflicts,
        confirmed: confirmados,
    };
}
