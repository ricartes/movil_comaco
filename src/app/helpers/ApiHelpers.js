// helpers/apiBase.js
import Constantes from '@/app/Common/Constantes'

export function apiBase() {
    // En dev el proxy de Vite se encarga
    if (import.meta.env.DEV) return '/mapi/v1'
    // En prod usas tu base real
    return (
        Constantes.direccionServidorPredeterminado +
        Constantes.nombreWebServicePredeterminado // e.g. '/mapi/v1'
    )
}

export function urlJoin(base, path) {
    const b = String(base).replace(/\/+$/, '')
    const p = String(path).replace(/^\/+/, '')
    return `${b}/${p}`
}
