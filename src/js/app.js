// Import Vue
import { createApp } from 'vue';

// Import Framework7
import Framework7 from 'framework7/lite-bundle';

// Import Framework7-Vue Plugin
import Framework7Vue, { registerComponents } from 'framework7-vue/bundle';

import { initializeDatabases, localDbInstance } from '../app/db/dbConfig';
import { initializeServices } from '../app/services/initServices';

// Import Framework7 Styles
import 'framework7/css/bundle';

// Import Icons and App Custom Styles
import '../css/icons.css';
import '../css/app.less';

// Import App Component
import App from '../components/app.vue';

// Init Framework7-Vue Plugin
Framework7.use(Framework7Vue);

; (async () => {
    try {
        // 1) Inicializa PouchDB e índices
        await initializeDatabases()
        // 2) Si necesitas pasar la instancia a tus services/repos
        //    (por ejemplo, para construir repos con la DB)
        if (typeof initializeServices === 'function') {
            initializeServices(localDbInstance)
        }
        // 3) Crea y monta la app
        const app = createApp(App)
        registerComponents(app)

        // (opcional) exponer la DB por provide/inject
        app.provide('localDb', localDbInstance)

        app.mount('#app')
    } catch (err) {
        console.error('Error al inicializar las bases de datos:', err)
        alert('No se pudo inicializar la base de datos local. Reintenta.')
    }
})()
