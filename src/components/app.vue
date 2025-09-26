<template>
    <f7-app v-bind="f7params">
        <f7-view main class="safe-areas" url="/login/"></f7-view>
    </f7-app>
</template>

<script>
import { onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import { getDevice } from "framework7/lite-bundle";
import capacitorApp from "../js/capacitor-app.js";
import routes from "../js/routes.js";
import store from "../js/store";
import { bootstrapValidacionDispositivo } from "@/js/bootstrap-dispositivo";

export default {
    setup() {
        const device = getDevice();

        const f7params = {
            name: "GdeFds",
            theme: "auto",
            store,
            routes,
            input: {
                scrollIntoViewOnFocus: device.capacitor,
                scrollIntoViewCentered: device.capacitor,
            },
            statusbar: {
                iosOverlaysWebView: true,
                androidOverlaysWebView: false,
            },
        };

        onMounted(() => {
            f7ready(async () => {
                if (device.capacitor) {
                    capacitorApp.init(f7);
                }

                // Asegura que el store levante lo persistido (usuario + dispositivo)
                await store.dispatch("hydrate");

                // Preloader mientras validamos dispositivo
                f7.dialog.preloader("Validando acceso");

                try {
                    const res = await bootstrapValidacionDispositivo();
                    await store.dispatch("setDispositivoResult", res);

                    if (res.bloquea) {
                        f7.views.main?.router?.navigate("/bloqueado/", {
                            reloadAll: true,
                        });
                    } else {
                        // si además quieres redirigir a login sólo si no hay sesión:
                        f7.views.main?.router?.navigate("/login/", {
                            reloadAll: true,
                        });
                    }
                } catch (err) {
                    // FALLÓ VALIDACIÓN REMOTA
                    const previoBloqueado = store.getters.isBloqueado;
                    const previoTieneUid = !!store.getters.dispositivoUid;

                    if (previoTieneUid && !previoBloqueado) {
                        // había estado guardado y NO estaba bloqueado → dejar pasar
                        f7.views.main?.router?.navigate("/login/", {
                            reloadAll: true,
                        });
                    } else {
                        // primera vez (o previo bloqueado) → bloquear por defecto
                        await store.dispatch("setDispositivoResult", {
                            uid: store.getters.dispositivoUid ?? null,
                            estado: "DESCONOCIDO",
                            bloquea: true,
                            message:
                                "No fue posible validar el dispositivo. Bloqueado por defecto.",
                        });
                        //TODO: DESCOMENTAR
                        f7.views.main?.router?.navigate("/bloqueado/", {
                            reloadAll: true,
                        });
                    }
                } finally {
                    f7.dialog.close();
                }
            });
        });

        return { f7params };
    },
};
</script>
