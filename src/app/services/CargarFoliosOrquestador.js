// src/app/services/CargarFoliosOrquestador.js
import { cargarFoliosDesdeWeb } from '@/app/services/CargaFoliosService'
import { cargarFoliosLiberadosDesdeWeb } from '@/app/services/CargaFoliosLiberadosService'

/**
 * Ejecuta el pipeline:
 *  1) cargar folios
 *  2) procesar liberaciones (marca L; confirma al final)
 * Devuelve un resumen uniforme.
 */
export async function cargarFoliosYLiberados(empId, rut) {
    const resumen = {
        carga: { ok: false },
        liberado: { ok: false, updated: 0, confirmed: [] },
    }

    // 1) Cargar folios
    const resCarga = await cargarFoliosDesdeWeb(empId, rut)
    resumen.carga.ok = !!resCarga?.ok

    // 2) Liberar + confirmar
    const resLib = await cargarFoliosLiberadosDesdeWeb(empId, rut)
    resumen.liberado.ok = !!resLib?.ok
    resumen.liberado.updated = Number(resLib?.updated ?? 0)
    resumen.liberado.confirmed = Array.isArray(resLib?.confirmed) ? resLib.confirmed : []

    return resumen
}
