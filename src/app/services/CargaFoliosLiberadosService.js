import CargaParametrosWebServices from '@/app/webservices/CargaParametrosWebServices'
import config from '@/Common/json/config.json'
import store from '@/js/store'
import { getSiiFolioDao } from '@/app/services/initServices'

const estados = config.parametros.estadosFolio // { D, A, U, L }

export async function cargarFoliosLiberadosDesdeWeb(empId, rut) {
    const token = store.state.token
    if (!token) throw new Error('Token no disponible')

    // 1) Rescatar liberaciones (URFL) – SIN urflId, vienen empId + folioInicial/final
    const ruta = config.rutas.RescatarUsuarioRangoFolioLiberado
    const resp = await CargaParametrosWebServices.cargarParametro(empId, rut, ruta, token)
    if (!resp?.status) throw new Error(resp?.message || `Error en servicio ${ruta}`)

    const lista = Array.isArray(resp.data) ? resp.data : []
    if (lista.length === 0) return { ok: true, updated: 0, confirmed: [] }

    const dao = getSiiFolioDao()
    let totalUpdated = 0
    const urfsParaConfirmar = []

    // 2) Liberar localmente por rango (respeta 'U', omite inexistentes)
    for (const urf of lista) {
        const eId = Number(urf.empId)
        const fini = Number(urf.folioInicial)
        const ffin = Number(urf.folioFinal)
        if (!Number.isFinite(fini) || !Number.isFinite(ffin) || fini > ffin) continue

        const { updated } = await dao.marcarRangoComoLiberadoPorEmpresa(eId, fini, ffin)

        totalUpdated += updated

        // guardamos URFL (id de liberación) para confirmarlo al final
        urfsParaConfirmar.push({ empId: eId, urflId: Number(urf.urflId) })
    }

    // 3) Confirmar cada URFL en backend (solo después de procesar local)
    const confirmados = []
    for (const it of urfsParaConfirmar) {
        const confirmResp = await CargaParametrosWebServices.postJson(
            { empId: it.empId, urflId: it.urflId }, // urflId = URFL_ID (registro de liberación)
            config.rutas.ConfirmarUsuarioRangoFolioLiberado,
            token
        )
        if (!confirmResp?.status)
            throw new Error(confirmResp?.message || `No se pudo confirmar URFL ${it.urflId}`)
        confirmados.push(it.urflId)
    }

    return { ok: true, updated: totalUpdated, confirmed: confirmados }
}
