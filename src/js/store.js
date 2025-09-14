import { createStore } from 'framework7/lite-bundle'
import { Preferences } from '@capacitor/preferences'
import { getUsuarioDao } from '@/app/services/initServices'

const TOKEN_KEY = 'auth_token'
const RUT_KEY = 'auth_rut'
const EMPRESA_KEY = 'auth_empresa'

const store = createStore({
    state: { user: null, token: null, offline: false, ready: false },
    getters: {
        isAuth({ state }) { return !!state.user },
        user({ state }) { return state.user },
        token({ state }) { return state.token },
        offline({ state }) { return state.offline },
        ready({ state }) { return state.ready },
    },
    actions: {
        async hydrate({ state }) {
            try {
                // lee Preferences pero no revientes si falla en web
                const [{ value: token } = {}, { value: rut } = {}] = await Promise.all([
                    Preferences.get({ key: TOKEN_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: RUT_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: EMPRESA_KEY }).catch(() => ({})),
                ])
                state.token = token || null

                // intenta cargar el user del DAO, pero no falles si aún no está listo
                if (rut && empresa) {
                    try {
                        const dao = getUsuarioDao?.()
                        if (dao && typeof dao.obtener === 'function') {
                            state.user = await dao.obtener(rut, empresa)
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
            state.token = null
            state.offline = true
            await Preferences.remove({ key: TOKEN_KEY })
            await Preferences.set({ key: RUT_KEY, value: String(user.rut) })
            await Preferences.set({ key: EMPRESA_KEY, value: String(user.empresa ?? '') })
            window.dispatchEvent(new CustomEvent('auth:login'))
        },

        async clearSession({ state }) {
            state.user = null
            state.token = null
            state.offline = false
            await Preferences.remove({ key: TOKEN_KEY })
            await Preferences.remove({ key: RUT_KEY })
            await Preferences.remove({ key: EMPRESA_KEY })
            window.dispatchEvent(new CustomEvent('auth:logout'))
        },
    },
})

export default store
