<template>
    <f7-app v-bind="f7params">
        <!-- Your main view, should have "view-main" class -->
        <f7-view main class="safe-areas" url="/login/"></f7-view>
    </f7-app>
</template>

<script>
import { ref, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import { getDevice } from "framework7/lite-bundle";
import capacitorApp from "../js/capacitor-app.js";
import routes from "../js/routes.js";
import store from "../js/store";
import { StatusBar } from "@capacitor/status-bar";

export default {
    setup() {
        const device = getDevice();
        // const isAuth = ref(false);

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
                // 👈 ahora es async
                if (device.capacitor) {
                    // Desactiva overlay en Android/iOS
                    await StatusBar.setOverlaysWebView({ overlay: false });
                    // Luego inicializa tu lógica capacitor
                    capacitorApp.init(f7);
                }

                // ... tu lógica de sesión inicial
            });
        });

        return { f7params };
    },
};
</script>
