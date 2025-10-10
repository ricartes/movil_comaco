import { createStore } from 'framework7/lite-bundle'
import { Preferences } from '@capacitor/preferences'
import { getUsuarioDao } from '@/app/services/initServices'

const TOKEN_KEY = 'auth_token'
const RUT_KEY = 'auth_rut'
const EMPRESA_KEY = 'auth_empresa'

// NUEVAS claves para dispositivo
const DISPO_UID_KEY = 'dispo_uid'
const DISPO_ESTADO_KEY = 'dispo_estado'     // p.ej. 'EN_SOLICITUD' | 'VIGENTE' | 'BLOQUEADO'
const DISPO_BLOQUEA_KEY = 'dispo_bloquea'    // 'true' | 'false'
const DISPO_LASTCHECK_KEY = 'dispo_lastcheck'  // epoch (string)
const PRN_NAME_KEY = 'printer_name';   // opcional: guarda también address si tu fork lo entrega
const PRN_ADDR_KEY = 'printer_addr';

const store = createStore({
    state: {
        user: null, token: null, offline: false, ready: false,
        dispositivo: {
            bloqueado: false,
            estado: null,
            uid: null,
            lastCheck: null,
        },
    },
    getters: {
        isAuth({ state }) { return !!state.user },
        user({ state }) { return state.user },
        token({ state }) { return state.token },
        offline({ state }) { return state.offline },
        ready({ state }) { return state.ready },
        isBloqueado({ state }) { return !!state.dispositivo.bloqueado },
        estadoDispositivo({ state }) { return state.dispositivo.estado },
        dispositivoUid({ state }) { return state.dispositivo.uid },
    },
    actions: {
        async hydrate({ state }) {
            try {
                // lee Preferences pero no revientes si falla en web
                const [{ value: token } = {}, { value: rut } = {}, { value: empresa } = {}] = await Promise.all([
                    Preferences.get({ key: TOKEN_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: RUT_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: EMPRESA_KEY }).catch(() => ({})),
                ])
                state.token = token || null

                // intenta cargar el user del DAO, pero no falles si aún no está listo
                if (rut) {
                    try {
                        const dao = getUsuarioDao?.()
                        if (dao && typeof dao.obtenerPorRut === 'function') {
                            state.user = await dao.obtenerPorRut(rut)
                        } else {
                            state.user = null
                        }
                    } catch (e) {
                        console.warn('hydrate(): no se pudo obtener usuario', e)
                        state.user = null
                    }
                } else {
                    state.user = null
                }

                state.offline = !state.token && !!state.user

                // ====== Dispositivo (persistido)
                const [
                    { value: dUid } = {},
                    { value: dEstado } = {},
                    { value: dBloquea } = {},
                    { value: dLast } = {},
                ] = await Promise.all([
                    Preferences.get({ key: DISPO_UID_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: DISPO_ESTADO_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: DISPO_BLOQUEA_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: DISPO_LASTCHECK_KEY }).catch(() => ({ value: null })),
                ])

                state.dispositivo.uid = dUid || null
                state.dispositivo.estado = dEstado || null
                state.dispositivo.bloqueado = (dBloquea === 'true')
                state.dispositivo.lastCheck = dLast ? Number(dLast) : null
            } finally {
                // ✅ garantizado: evita quedarse en “Cargando…”
                state.ready = true
            }
        },

        async setSessionOnline({ state }, { user, token }) {
            state.user = user
            state.token = token
            state.offline = false
            await Preferences.set({ key: TOKEN_KEY, value: token })
            await Preferences.set({ key: RUT_KEY, value: String(user.rut) })
            await Preferences.set({ key: EMPRESA_KEY, value: String(user.empresa ?? '') })
            window.dispatchEvent(new CustomEvent('auth:login'))
        },

        async setSessionOffline({ state }, { user }) {
            state.user = user
            state.offline = true

            // 👇 asegura que el token esté en memoria (sin tocar Preferences)
            const { value: persistedToken } = await Preferences.get({ key: TOKEN_KEY }).catch(() => ({ value: null }))
            if (persistedToken) state.token = persistedToken

            await Preferences.set({ key: RUT_KEY, value: String(user.rut) })
            await Preferences.set({ key: EMPRESA_KEY, value: String(user.empresa ?? '') })
            window.dispatchEvent(new CustomEvent('auth:login'))
        },


        async clearSession({ state }) {
            state.user = null
            state.offline = false
            await Preferences.remove({ key: RUT_KEY })
            await Preferences.remove({ key: EMPRESA_KEY })
            window.dispatchEvent(new CustomEvent('auth:logout'))
        },

        async setDispositivoResult({ state }, { uid, estado, bloquea, message }) {
            state.dispositivo.uid = uid ?? null
            state.dispositivo.estado = estado ?? null
            state.dispositivo.bloqueado = !!bloquea
            state.dispositivo.lastCheck = Date.now()

            await Preferences.set({ key: DISPO_UID_KEY, value: String(state.dispositivo.uid ?? '') })
            await Preferences.set({ key: DISPO_ESTADO_KEY, value: String(state.dispositivo.estado ?? '') })
            await Preferences.set({ key: DISPO_BLOQUEA_KEY, value: state.dispositivo.bloqueado ? 'true' : 'false' })
            await Preferences.set({ key: DISPO_LASTCHECK_KEY, value: String(state.dispositivo.lastCheck) })

            // opcional: emite un evento global
            window.dispatchEvent(new CustomEvent('device:validated', { detail: { uid, estado, bloquea, message } }))
        },

        async clearDispositivo({ state }) {
            state.dispositivo = { bloqueado: false, estado: null, uid: null, lastCheck: null }
            await Preferences.remove({ key: DISPO_UID_KEY })
            await Preferences.remove({ key: DISPO_ESTADO_KEY })
            await Preferences.remove({ key: DISPO_BLOQUEA_KEY })
            await Preferences.remove({ key: DISPO_LASTCHECK_KEY })
        },
    },
})

export default store
