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
const PRN_PAPER_WIDTH_KEY = 'printer_paper_width'; // 32 (57–58mm) | 48 (80mm)
const GUIDES_TREE_URI_KEY = 'guides_tree_uri'
const GUIDES_DISPLAY_PATH_KEY = 'guides_display_path'
const GUIDES_CONFIGURED_AT_KEY = 'guides_configured_at'



const store = createStore({
    state: {
        user: null, token: null, offline: false, ready: false,
        dispositivo: {
            bloqueado: false,
            estado: null,
            uid: null,
            lastCheck: null,
        },
        printer: {
            name: null,
            address: null,
            paperWidth: null,
        },
        importGuides: {
            treeUri: null,
            displayPath: null,
            configuredAt: null,
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
        printerName({ state }) { return state.printer.name },
        printerAddr({ state }) { return state.printer.address },
        printerPaperWidth({ state }) { return state.printer.paperWidth },
        userKey({ state }) {
            const u = state.user
            return u ? `${u.empresa ?? ''}|${u.rut ?? ''}` : ''
        },
        userRut({ state }) { return state.user?.rut ?? null },
        userEmpId({ state }) { return state.user?.empresa ?? state.user?.empId ?? null },
        guidesTreeUri({ state }) { return state.importGuides?.treeUri ?? null },
        guidesDisplayPath({ state }) { return state.importGuides?.displayPath ?? null },
        guidesConfigured({ state }) { return !!state.importGuides?.treeUri },


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

                // ====== Impresora (persistido)
                const [
                    { value: pName } = {},
                    { value: pAddr } = {},
                    { value: pWidth } = {},
                ] = await Promise.all([
                    Preferences.get({ key: PRN_NAME_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: PRN_ADDR_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: PRN_PAPER_WIDTH_KEY }).catch(() => ({ value: null })),
                ]);
                state.printer.name = pName || null;
                state.printer.address = pAddr || null;
                state.printer.paperWidth = pWidth ? Number(pWidth) : null; // ← NUEVO


                // ====== Carpeta importación guías (persistido)
                const [
                    { value: gTree } = {},
                    { value: gPath } = {},
                    { value: gAt } = {},
                ] = await Promise.all([
                    Preferences.get({ key: GUIDES_TREE_URI_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: GUIDES_DISPLAY_PATH_KEY }).catch(() => ({ value: null })),
                    Preferences.get({ key: GUIDES_CONFIGURED_AT_KEY }).catch(() => ({ value: null })),
                ])

                state.importGuides.treeUri = gTree || null
                state.importGuides.displayPath = gPath || null
                state.importGuides.configuredAt = gAt || null

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

        async setPrinter({ state }, { name, address = null }) {
            state.printer.name = name ?? null;
            state.printer.address = address ?? null;
            await Preferences.set({ key: PRN_NAME_KEY, value: String(state.printer.name ?? '') });
            await Preferences.set({ key: PRN_ADDR_KEY, value: String(state.printer.address ?? '') });
            window.dispatchEvent(new CustomEvent('printer:changed', { detail: { name, address } }));
        },

        async setPrinterWidth({ state }, { paperWidth }) {
            const val = Number(paperWidth);
            if (![32, 48].includes(val)) return; // valida entrada
            state.printer.paperWidth = val;
            await Preferences.set({ key: PRN_PAPER_WIDTH_KEY, value: String(val) });
            window.dispatchEvent(new CustomEvent('printer:widthChanged', { detail: { paperWidth: val } }));
        },


        async clearPrinter({ state }) {
            state.printer = { name: null, address: null };
            await Preferences.remove({ key: PRN_NAME_KEY });
            await Preferences.remove({ key: PRN_ADDR_KEY });
            window.dispatchEvent(new CustomEvent('printer:changed', { detail: { name: null, address: null } }));
        },

        async clearPrinterWidth({ state }) {
            state.printer.paperWidth = null;
            await Preferences.remove({ key: PRN_PAPER_WIDTH_KEY });
            window.dispatchEvent(new CustomEvent('printer:widthChanged', { detail: { paperWidth: null } }));
        },

        async setGuidesFolder({ state }, { treeUri, displayPath }) {
            state.importGuides.treeUri = treeUri ?? null
            state.importGuides.displayPath = displayPath ?? null
            state.importGuides.configuredAt = new Date().toISOString()

            await Preferences.set({ key: GUIDES_TREE_URI_KEY, value: String(state.importGuides.treeUri ?? '') })
            await Preferences.set({ key: GUIDES_DISPLAY_PATH_KEY, value: String(state.importGuides.displayPath ?? '') })
            await Preferences.set({ key: GUIDES_CONFIGURED_AT_KEY, value: String(state.importGuides.configuredAt ?? '') })

            window.dispatchEvent(new CustomEvent('guides:folderChanged', { detail: { treeUri, displayPath } }))
        },

        async clearGuidesFolder({ state }) {
            state.importGuides = { treeUri: null, displayPath: null, configuredAt: null }
            await Preferences.remove({ key: GUIDES_TREE_URI_KEY })
            await Preferences.remove({ key: GUIDES_DISPLAY_PATH_KEY })
            await Preferences.remove({ key: GUIDES_CONFIGURED_AT_KEY })
            window.dispatchEvent(new CustomEvent('guides:folderChanged', { detail: { treeUri: null, displayPath: null } }))
        },


    },
})

export default store
