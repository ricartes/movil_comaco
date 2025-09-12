<template>
    <f7-app v-bind="f7params">
        <template v-if="isAuth">
            <!-- forzamos nuevo árbol cuando cambia auth -->
            <div :key="'auth-shell'">
                <f7-views tabs class="safe-areas">
                    <f7-toolbar tabbar icons bottom>
                        <f7-link
                            tab-link="#view-home"
                            tab-link-active
                            icon-ios="f7:house_fill"
                            icon-md="material:home"
                            text="Home"
                        />
                        <f7-link
                            tab-link="#view-catalog"
                            icon-ios="f7:square_list_fill"
                            icon-md="material:view_list"
                            text="Catalog"
                        />
                        <f7-link
                            tab-link="#view-settings"
                            icon-ios="f7:gear"
                            icon-md="material:settings"
                            text="Settings"
                        />
                    </f7-toolbar>

                    <f7-view id="view-home" main tab tab-active url="/home/" />
                    <f7-view
                        id="view-catalog"
                        name="catalog"
                        tab
                        url="/catalog/"
                    />
                    <f7-view
                        id="view-settings"
                        name="settings"
                        tab
                        url="/settings/"
                    />
                </f7-views>
            </div>
        </template>

        <template v-else>
            <!-- IMPORTANTe: key distinto para que F7 cree un view “nuevo” -->
            <f7-view main :key="'login-view'" url="/login/" />
        </template>
    </f7-app>
</template>

<script>
import { ref, onMounted } from "vue";
import { f7, f7ready } from "framework7-vue";
import { getDevice } from "framework7/lite-bundle";
import capacitorApp from "../js/capacitor-app.js";
import routes from "../js/routes.js";
import store from "../js/store";

export default {
    setup() {
        const device = getDevice();
        const isAuth = ref(false);

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
            f7ready(() => {
                // ✅ Mantener EXACTO
                if (device.capacitor) {
                    capacitorApp.init(f7);
                }
                // sesión inicial
                isAuth.value = !!localStorage.getItem("auth_token");

                // eventos globales opcionales
                window.addEventListener("auth:login", () => {
                    isAuth.value = true;
                });
                window.addEventListener("auth:logout", () => {
                    isAuth.value = false;
                    localStorage.removeItem("auth_token");
                });
            });
        });

        return { f7params, isAuth };
    },
};
</script>
