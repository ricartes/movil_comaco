<template>
    <f7-app v-bind="f7params">
        <template v-if="isAuth">
            <!-- forzamos nuevo árbol cuando cambia auth -->
            <f7-views tabs class="safe-areas" :key="'auth-tabs'">
                <!-- Tabbar inferior -->
                <f7-toolbar tabbar labels bottom>
                    <f7-link
                        tab-link="#view-home"
                        tab-link-active
                        icon-ios="f7:rectangle_grid_2x2_fill"
                        icon-md="material:dashboard"
                        text="Dashboard"
                    />
                    <f7-link
                        tab-link="#view-gde"
                        icon-ios="f7:doc_text_fill"
                        icon-md="material:description"
                        text="GDE"
                    />
                    <f7-link
                        tab-link="#view-menu"
                        icon-ios="f7:line_3_horizontal"
                        icon-md="material:menu"
                        text="Menú"
                    />
                </f7-toolbar>

                <!-- Vistas/tabs -->
                <f7-view id="view-home" main tab tab-active url="/home/" />
                <f7-view id="view-gde" name="gde" tab url="/gde/" />
                <f7-view id="view-menu" name="menu" tab url="/menu/" />
            </f7-views>
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
                if (device.capacitor) {
                    capacitorApp.init(f7);
                }
                // sesión inicial
                isAuth.value = !!localStorage.getItem("auth_token");

                // 👇 fuerza ir a la página correcta por si la URL quedó vacía
                console.log(isAuth.value);
                if (isAuth.value) {
                    console.log("pasa");
                    f7.views.main?.router?.navigate("/home/", {
                        reloadAll: true,
                    });
                } else {
                    f7.views.main?.router?.navigate("/login/", {
                        reloadAll: true,
                    });
                }

                // eventos globales opcionales
                window.addEventListener("auth:login", () => {
                    isAuth.value = true;
                    f7.views.main?.router?.navigate("/home/", {
                        reloadAll: true,
                    });
                });
                window.addEventListener("auth:logout", () => {
                    isAuth.value = false;
                    localStorage.removeItem("auth_token");
                    f7.views.main?.router?.navigate("/login/", {
                        reloadAll: true,
                    });
                });
            });
        });

        return { f7params, isAuth };
    },
};
</script>
