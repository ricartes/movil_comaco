

import Login from '@/pages/login.vue'
import NotFoundPage from '../pages/404.vue';
import home from '@/pages/home.vue';
import GdeIngreso from '@/pages/gde/ingreso.vue';
import store from './store';


function isAuthed() {
    return !!localStorage.getItem('auth_token')
}

var routes = [
    {
        path: '/login/',
        component: Login,
    },
    {
        path: '/home/',
        component: home,
    },
    {
        path: '/gde/ingreso/',
        component: GdeIngreso,
    },

    {
        path: '(.*)',
        component: NotFoundPage,
    },
];

export default routes;
