
import config from "@/Common/json/config.json";
import store from '@/js/store'

import { getGdeDao } from "@/app/services/initServices";
import CargaParametrosWebServices from "@/app/webservices/CargaParametrosWebServices";

export async function enviarGde(gde) {
    const token = store.state.token;
    if (!token) throw new Error('Token no disponible');

    const gdeDao = getGdeDao();
    const { ENVIADA, EMITIDA } = config.parametros.estadosGuia;

    const ahoraISO = new Date().toISOString();
    const idempotencyKey = gde._id || `${gde.empId}-${gde.folio}`;
    const ruta = config.rutas.guardarGde;

    console.debug(`[SYNC] start ${gde._id} folio=${gde.folio} idem=${idempotencyKey}`);


    // Evitar dobles envíos concurrentes
    await gdeDao.patch(gde._id, {
        syncing: true,
        ultimoErrorSync: null,
    });

    // 1) documento completo pero sin campos locales
    const payloadBase = stripLocalFields(gde);

    // 2) forzar estado y metadatos de envío
    if (gde.estado?.id === EMITIDA.id) {
        payloadBase.estado = { ...ENVIADA };
    }
    payloadBase.sentAt = ahoraISO;
    payloadBase.tzOffsetMin = new Date().getTimezoneOffset() * -1;

    try {
        const resp = await CargaParametrosWebServices.postJson(
            payloadBase,
            ruta,
            token,
            { 'X-Idempotency-Key': String(idempotencyKey) }
        );

        

        if (!resp?.status) {
            throw new Error(resp?.message || `No se pudo enviar la guía N° ${gde.folio}`);
        }

        // OK → marcar sincronizado y limpiar flags locales
        const actualizado = await gdeDao.patch(gde._id, {
            estado: (gde.estado?.id === EMITIDA.id ? { ...ENVIADA } : gde.estado),
            sincronizado: true,
            sincronizadoAt: ahoraISO,
            serverResponse: resp,
            syncing: false,
            ultimoErrorSync: null,
        });

        console.debug(`[SYNC] ok ${gde._id} in ${Date.now() - t0}ms`);


        return actualizado;
    } catch (e) {
        // Error → dejar listo para reintento
        await gdeDao.patch(gde._id, {
            sincronizado: false,
            ultimoErrorSync: e?.message || String(e),
            ultimoIntentoSyncAt: new Date().toISOString(),
            syncing: false,
        });
        throw e;
    }
}


/**
 * Sincroniza las GDE pendientes de envío, usando un iterador para no cargar todo en memoria.
 * @param {*} empId 
 * @param {*} rutEmisor 
 */
export async function syncPendientesStreaming(empId, rutEmisor) {
    const dao = getGdeDao();
    console.log("pasa");
    for await (const bloque of dao.iterarPendientesDeEnvio(empId, rutEmisor, { pageSize: 50 })) {
        for (const gde of bloque) {
            try { await enviarGde(gde); } catch (e) { console.warn('Fallo enviar', gde._id, e?.message); }
        }
    }
}


// helpers/enviar-utils.js (o en el mismo archivo)
// helpers/enviar-utils.js
export function stripLocalFields(doc) {
    const clone = JSON.parse(JSON.stringify(doc));
    const blacklist = [
        '_rev',                // nunca al backend
        'sincronizado', 'sincronizadoAt',
        'syncing',
        'serverResponse',
        'ultimoErrorSync', 'ultimoIntentoSyncAt',
    ];
    for (const k of blacklist) delete clone[k];
    return clone; // conserva _id (tu id móvil)
}


