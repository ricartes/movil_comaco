// Import Vue
import { createApp } from 'vue'

// Import Framework7
import Framework7 from 'framework7/lite-bundle'

// Import Framework7-Vue Plugin
import Framework7Vue, { registerComponents } from 'framework7-vue/bundle'

import { initializeDatabases, localDbInstance } from '../app/db/dbConfig'
import { initializeServices } from '../app/services/initServices'
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics'
import Utilidades from '@/app/Utilidades'

    // === Inicializa Crashlytics ===
    ; (async () => {
        try {
            const dispositivo = await Utilidades.buildDispositivoPayload()

            // ⛑️ userId debe ir como objeto y no vacío
            if (dispositivo?.uid && typeof dispositivo.uid === 'string' && dispositivo.uid.trim()) {
                await FirebaseCrashlytics.setUserId({ userId: dispositivo.uid })
                await FirebaseCrashlytics.setCustomKey({ key: 'uuid', value: dispositivo.uid })
            } else {
                console.warn('[Crashlytics] UUID vacío/indefinido, no se llama setUserId')
            }

            // Custom keys (normaliza a string)
            await FirebaseCrashlytics.setCustomKey({ key: 'deviceModel', value: dispositivo?.modelo ?? '' })
            await FirebaseCrashlytics.setCustomKey({ key: 'manufacturer', value: dispositivo?.fabricante ?? '' })
            await FirebaseCrashlytics.setCustomKey({ key: 'platform', value: dispositivo?.plataforma ?? '' })
            await FirebaseCrashlytics.setCustomKey({ key: 'osVersion', value: dispositivo?.versionSo ?? '' })
            await FirebaseCrashlytics.setCustomKey({ key: 'appVersion', value: dispositivo?.versionApp ?? '' })

            await FirebaseCrashlytics.log({ message: 'Crashlytics init OK (desde Utilidades)' })

            console.log('[Crashlytics] inicializado correctamente');
        } catch (e) {
            console.warn('[Crashlytics] init error', e)
        }
    })()

window.addEventListener('error', (e) => {
    FirebaseCrashlytics.recordException({
        message: e?.message || '[window.onerror] Error sin message',
        stack: e?.error?.stack ?? ''
    })
})

window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason
    const msg = (reason && typeof reason === 'object' && 'message' in reason)
        ? reason.message
        : String(reason || '[unhandledrejection] sin motivo')
    const stack = (reason && typeof reason === 'object' && 'stack' in reason)
        ? reason.stack
        : ''
    FirebaseCrashlytics.recordException({ message: msg, stack })
})

// Import Framework7 Styles
import 'framework7/css/bundle'

// Import Icons and App Custom Styles
import '../css/icons.css'
import '../css/app.less'
import store from '@/js/store'
// Import App Component
import App from '../components/app.vue'
import formattersMixin from '@/js/mixins/formatters'
import rutMixin from '@/js/mixins/rut'
import framework7Mixin from '@/js/mixins/framework7'
import validacionMixin from '@/js/mixins/validacionMixin'



// Init Framework7-Vue Plugin
Framework7.use(Framework7Vue)

    ; (async () => {
        try {
            await initializeDatabases()
            if (typeof initializeServices === 'function') {
                initializeServices(localDbInstance)
            }

            const app = createApp(App)

            // capturar errores dentro de Vue
            app.config.errorHandler = (err, vm, info) => {
                FirebaseCrashlytics.recordException({
                    message: `[VueError] ${info}: ${err?.message || err}`,
                    stack: err?.stack || ''
                })
            }

            registerComponents(app)
            app.provide('localDb', localDbInstance)
            app.mixin(formattersMixin)
            app.mixin(rutMixin)
            app.mixin(framework7Mixin)
            app.mixin(validacionMixin)


            app.mount('#app')
        } catch (err) {
            FirebaseCrashlytics.recordException({
                message: '[Init] Error al inicializar las bases de datos',
                stack: err?.stack || String(err)
            })
            console.error('Error al inicializar las bases de datos:', err)
            alert('No se pudo inicializar la base de datos local. Reintenta.')
        }
    })()
