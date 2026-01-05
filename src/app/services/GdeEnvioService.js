
import config from "@/Common/json/config.json";
import store from '@/js/store'
import Utilidades from "@/app/Utilidades";
import { getGdeDao } from "@/app/services/initServices";
import CargaParametrosWebServices from "@/app/webservices/CargaParametrosWebServices";
import { bootstrapValidacionDispositivo } from "@/js/bootstrap-dispositivo";
import { usuarioLogeadoNoCorresponde } from "@/js/Utils/Seguridad.js";
import HelperWebServices from "@/app/Webservices/HelperWebServices";


export async function enviarGde(gde, ping = false) {
    const token = store.state.token;
    if (!token) throw new Error('Token no disponible');

    const gdeDao = getGdeDao();
    const { ENVIADA, EMITIDA } = config.parametros.estadosGuia;

    const ahoraISO = new Date().toISOString();
    const idempotencyKey = gde?._id || `${gde.empId}-${gde.folio}`;
    const ruta = config.rutas.guardarGde;

    // OJO: deja un flag para saber si terminó OK
    let ok = false;

    try {
        // Marcar inicio dentro del try
        await gdeDao.patch(gde._id, {
            syncing: true,
            ultimoErrorSync: null,
            ultimoIntentoSyncAt: ahoraISO, // útil para “stuck TTL”
        });

        if (ping) {
            const online = await HelperWebServices.pingApi(10000);
            if (!online) throw new Error('No hay conexión real con la API');
        }

        const payloadBase = stripLocalFields(gde);

        if (gde.estado?.id === EMITIDA.id) {
            payloadBase.estado = { ...ENVIADA };
        }
        payloadBase.sentAt = ahoraISO;
        payloadBase.tzOffsetMin = new Date().getTimezoneOffset() * -1;

        const resp = await CargaParametrosWebServices.postJson(
            payloadBase,
            ruta,
            token,
            { 'X-Idempotency-Key': String(idempotencyKey) }
        );

        if (!resp?.status) {
            throw new Error(resp?.message || `No se pudo enviar la guía N° ${gde.folio}`);
        }

        ok = true;

        // Éxito
        return await gdeDao.patch(gde._id, {
            estado: (gde.estado?.id === EMITIDA.id ? { ...ENVIADA } : gde.estado),
            sincronizado: true,
            sincronizadoAt: ahoraISO,
            serverResponse: resp,
            syncing: false,
            ultimoErrorSync: null,
        });

    } catch (e) {
        // Fallo
        await gdeDao.patch(gde._id, {
            sincronizado: false,
            ultimoErrorSync: e?.message || String(e),
            ultimoIntentoSyncAt: new Date().toISOString(),
            syncing: false,
        });
        throw e;

    } finally {
        // Blindaje extra: si algo rarísimo pasó y no quedó ok, asegúrate de bajar syncing
        if (!ok) {
            try { await gdeDao.patch(gde._id, { syncing: false }); } catch { }
        }
    }
}





/**
 * Sincroniza las GDE pendientes de envío, usando un iterador para no cargar todo en memoria.
 * @param {*} empId 
 * @param {*} rutEmisor 
 */
export async function syncPendientesStreaming(empId, rutEmisor) {
    const dao = getGdeDao();
    const conexion = await Utilidades.verificarConexion(); // <-- tu helper
    if (!conexion?.connected) {
        console.warn('[SYNC] Sin conexión: se omite sincronización.');
        return;
    }
    const online = await HelperWebServices.pingApi(10000);
    if (!online) {
        console.warn('[SYNC] Sin conexión al API : se omite sincronización.');
        return;
    }

    const res = await bootstrapValidacionDispositivo();
    if (res.bloquea) {
        console.warn('[SYNC] Dispositivo bloqueado : se omite sincronización.');
        return;
    }

    const rutAsignado = res.rut;
    const autenticado = !!localStorage.getItem("auth_token");

    const usuarioNoCorrespondido =
        autenticado &&
        usuarioLogeadoNoCorresponde(rutEmisor, rutAsignado);

    if (autenticado && usuarioNoCorrespondido) {
        console.warn('[SYNC] Usuario en sesión no corresponde al dispositivo : se omite sincronización.');
        return;
    }

    const pendientes = await dao.listarPendientesDeEnvio(empId, rutEmisor, {
        incluirStuck: true,
        stuckMinutes: 10,
        cooldownSeconds: 60,
        limit: 500,
    });

    console.info("[SYNC] pendientes a enviar:", pendientes.length, pendientes.map(x => x._id));

    for (const gde of pendientes) {
        try {
            await enviarGde(gde, false);
        } catch (e) {
            console.warn("[SYNC] Fallo enviar", gde._id, e?.message || e);
        }
    }

    console.debug('[SYNC] Inicio de sincronización GDE pendientes...');
    /*for await (const bloque of dao.iterarPendientesDeEnvio(empId, rutEmisor, { pageSize: 50 })) {
        console.log(bloque);
        for (const gde of bloque) {
            console.log(gde);
            try { await enviarGde(gde); } catch (e) { console.warn('Fallo enviar', gde._id, e?.message); }
        }
    }*/
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


