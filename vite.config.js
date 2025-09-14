
import path from 'path';
import vue from '@vitejs/plugin-vue';


const SRC_DIR = path.resolve(__dirname, './src');
const PUBLIC_DIR = path.resolve(__dirname, './public');
const BUILD_DIR = path.resolve(__dirname, './www',);
export default async () => {

    return {
        plugins: [
            vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.includes('swiper-') } } }), ,

        ],
        root: SRC_DIR,
        base: '',
        publicDir: PUBLIC_DIR,
        build: {
            outDir: BUILD_DIR,
            assetsInlineLimit: 0,
            emptyOutDir: true,
            rollupOptions: {
                treeshake: false,
            },
        },
        resolve: {
            alias: {
                '@': SRC_DIR,
            },
        },
        server: {
            host: true,
            proxy: {
                '/mapi': {
                    target: 'http://gestiona-002-site20.anytempurl.com',
                    changeOrigin: true,
                    secure: false,
                    configure: (proxy, options) => {
                        proxy.on('proxyReq', (proxyReq, req) => {
                            console.log('[proxy] →', req.method, req.url,
                                'to', options.target + req.url)
                        })
                        proxy.on('proxyRes', (proxyRes, req) => {
                            console.log('[proxy] ←', proxyRes.statusCode,
                                req.method, req.url)
                        })
                    },
                },
            },
        }

    };
}
