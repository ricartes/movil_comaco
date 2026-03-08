routes = [
    {
        path: '/',
        url: './index.html',
    },
    {
        path: '/EmisionDesdeFaena/:idzona/:idgde/:tipoemision',
        url: './pages/EmisionDesdeFaena.html',
    },

    {
        path: '/EvidenciaGuia/:idzona/:idgde/:tipoemision',
        url: './pages/EvidenciaGuia.html',
    },

    {
        path: '/puntosGDE/:idzona/:idgde/:tipoemision',
        url: './pages/PuntosGDE.html',
    },

    {
        path: '/CamionCargado/:idzona/:idgde/:tipoemision',
        url: './pages/CamionCargado.html',
    },

    {
        path: '/PadronVehiculo/:idzona/:idgde/:tipoemision',
        url: './pages/PadronVehiculo.html',
    },

    {
        path: '/CamionVacio/:idzona/:idgde/:tipoemision',
        url: './pages/CamionVacio.html',
    },
    {
        path: '/DetalleM3/:idzona/:idgde/:tipoemision',
        url: './pages/DetalleM3.html',
    },
    {
        path: '/DetalleMR/:idzona/:idgde/:tipoemision',
        url: './pages/DetalleMR.html',
    },
    {
        path: '/Comentarios/:idzona/:idgde/:tipovolumen/:tipoemision',
        url: './pages/Comentarios.html',
    },

    {
        path: '/Impresion/:idzona/:idgde/:tipovolumen/:tipoemision',
        url: './pages/Impresion.html',
    },

    {
        path: '/VistaPreliminar/:idzona/:idgde/:tipovolumen/:tipoemision/:origen',
        url: './pages/VistaPreliminar.html',
    },


    {
        path: '/VistaPreliminarCedible/:idzona/:idgde/:tipovolumen/:tipoemision/:origen',
        url: './pages/VistaPreliminarCedible.html',
    },

    {
        path: '/CargaParametros/',
        url: './pages/CargaParametros.html',
    },

    {
        path: '/IngresoPlanta/',
        url: './pages/IngresoPlanta.html',
    },

    {
        path: '/Configuracion/',
        url: './pages/Configuracion.html',
    },

    {
        path: '/CargaFolios/',
        url: './pages/CargaFolios.html',
    },

    {
        path: '/ListaGuias/',
        url: './pages/ListaGuias.html',
    },
    {
        path: '/EnviarDatos/',
        url: './pages/EnviarDatos.html',
    },

    {
        path: '/LiberaFolios/',
        url: './pages/LiberaFolios.html',
    },


    {
        path: '/CargaGuias/',
        url: './pages/CargaGuias.html',
    },

    // Page Loaders & Router
    {
        path: '/page-loader-template7/:user/:userId/:posts/:postId/',
        templateUrl: './pages/page-loader-template7.html',
    },
    {
        path: '/page-loader-component/:user/:userId/:posts/:postId/',
        componentUrl: './pages/page-loader-component.html',
    },
    // Default route (404 page). MUST BE THE LAST
    {
        path: '(.*)',
        url: './pages/404.html',
    },
];
