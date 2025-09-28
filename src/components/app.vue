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
import {
    listenForFcmMessages,
    extractPushData,
} from "@/app/services/firebaseMessaging";

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

        // guard local del componente
        let pushGuard = false;

        // === 1) Validación central ===
        const runValidacionAcceso = async () => {
            f7.dialog.preloader("Validando acceso");
            try {
                const res = await bootstrapValidacionDispositivo();
                await store.dispatch("setDispositivoResult", res);

                if (res.bloquea) {
                    f7.views.main?.router?.navigate("/bloqueado/", {
                        reloadAll: true,
                    });
                } else {
                    f7.views.main?.router?.navigate("/login/", {
                        reloadAll: true,
                    });
                }
            } catch (err) {
                const previoBloqueado = store.getters.isBloqueado;
                const previoTieneUid = !!store.getters.dispositivoUid;

                if (previoTieneUid && !previoBloqueado) {
                    f7.views.main?.router?.navigate("/login/", {
                        reloadAll: true,
                    });
                } else {
                    await store.dispatch("setDispositivoResult", {
                        uid: store.getters.dispositivoUid ?? null,
                        estado: "DESCONOCIDO",
                        bloquea: true,
                        message:
                            "No fue posible validar el dispositivo. Bloqueado por defecto.",
                    });
                    f7.views.main?.router?.navigate("/bloqueado/", {
                        reloadAll: true,
                    });
                }
            } finally {
                f7.dialog.close();
            }
        };

        // === 2) Handler específico: device ===
        const handleDeviceIntent = async (intent, { title, body }) => {
            if (intent !== "device:block" && intent !== "device:unblock")
                return false;
            if (pushGuard) return true;

            pushGuard = true;
            f7.dialog.alert(
                body || "El dispositivo cambió de estado.",
                title || "Dispositivo",
                async () => {
                    pushGuard = false;
                    await runValidacionAcceso();
                }
            );
            return true; // se procesó
        };

        // === 3) Dispatcher de intents ===
        const handlePushIntent = async (payload) => {
            const { data, title, body } = payload;
            const intent = (data?.intent || "").toLowerCase();
            if (!intent) return;

            // delega a handlers
            if (await handleDeviceIntent(intent, { title, body })) return;

            // fallback
            console.log("Intent no controlado:", intent, payload);
            f7.toast
                .create({
                    text: `Intent recibido: ${intent}`,
                    closeTimeout: 2000,
                })
                .open();
        };

        onMounted(() => {
            f7ready(async () => {
                if (device.capacitor) {
                    capacitorApp.init(f7);

                    // listeners SOLO en nativo
                    listenForFcmMessages(
                        async (msg) => {
                            const payload = extractPushData(msg);
                            await handlePushIntent(payload);
                        },
                        async (msg) => {
                            const payload = extractPushData(msg);
                            await handlePushIntent(payload);
                        }
                    );
                }

                await store.dispatch("hydrate");
                await runValidacionAcceso();
            });
        });

        return { f7params };
    },
};
</script>
