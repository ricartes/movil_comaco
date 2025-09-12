
import HomePage from '../pages/home.vue';
import Login from '@/pages/login.vue'
import NotFoundPage from '../pages/404.vue';

var routes = [
    {
        path: '/login/',
        component: Login,
    },

    {
        path: '(.*)',
        component: NotFoundPage,
    },
];

export default routes;
