
import HomePage from '@/pages/home.vue';
import Login from '@/pages/login.vue'
import Menu from '@/pages//menu.vue';
import NotFoundPage from '../pages/404.vue';

var routes = [
    { path: '/', redirect: () => (store.getters?.isAuth ? '/home/' : '/login/') },
    {
        path: '/login/',
        component: Login,
    },
    {
        path: '/home/',
        component: HomePage,
    },
    {
        path: '/menu/',
        component: Menu,
    },

    {
        path: '(.*)',
        component: NotFoundPage,
    },
];

export default routes;
