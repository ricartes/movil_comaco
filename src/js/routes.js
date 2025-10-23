

import Login from '@/pages/login.vue'
import Bloqueado from '@/pages/Bloqueado.vue'
import BloqueadoPermisos from '@/pages/BloqueadoPermisos.vue';
import NotFoundPage from '../pages/404.vue';
import home from '@/pages/home.vue';
import GdeIngreso from '@/pages/gde/ingreso.vue';
import GdeDetalle from '@/pages/gde/detalle.vue';
import ListadoFolios from '@/pages/folios/listado.vue';
import Configuracion from '@/pages/configuracion/configuracion.vue';
import informe from '@/pages/Informe/informe.vue';
import store from './store';



function isAuthed() {
    return !!localStorage.getItem('auth_token')
}

var routes = [
    {
        path: '/login/',
        component: Login,
        name: 'login'
    },
    {
        path: '/bloqueado/',
        component: Bloqueado,
        name: 'bloqueado'
    },
    {
        path: '/permisos-notificaciones/',
        component: BloqueadoPermisos,
        name: 'permisos-notificaciones'
    },
    {
        path: '/folios/listado/',
        component: ListadoFolios,
        name: 'folios-listado'
    },
    {
        path: '/configuracion/',
        component: Configuracion,
        name: 'configuracion'
    },
    {
        path: '/informe/',
        component: informe,
        name: 'informe'
    },
    {
        path: '/home/',
        component: home,
        name: 'home'
    },
    {
        path: '/gde/ingreso/',
        component: GdeIngreso,
        name: 'gde-ingreso'
    },
    {
        path: '/gde/detalle/:id',
        component: GdeDetalle,
        name: 'gde-detalle'
    },

    {
        path: '(.*)',
        component: NotFoundPage,
    },
];

export default routes;
