<!-- pages/Bloqueado.vue -->
<template>
    <f7-page>
        <f7-navbar title="Dispositivo bloqueado" />
        <f7-block>
            <p>
                El dispositivo no tiene acceso a la aplicación. Esto puede ser
                porque se encuentre bloqueado o la versión de su aplicación no
                corresponde con la vigente.
            </p>
            <f7-block>
                <p class="text-align-center text-color-black text-large">
                    Versión app {{ versionApp }}
                </p>
                <p class="text-align-center text-color-black text-large">
                    UID {{ uid }}
                </p>
            </f7-block>

            <f7-button fill @click="reintentar"
                >Reintentar validación</f7-button
            >
        </f7-block>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import { bootstrapValidacionDispositivo } from "@/js/bootstrap-dispositivo";
import Utilidades from "@/app/Utilidades";

export default {
    data() {
        return {
            uid: true,
            versionApp: null,
        };
    },
    async created() {
        this.uid = await Utilidades.getUIDevice();
        this.versionApp = await Utilidades.obtenerVersionApp();
    },
    methods: {
        async reintentar() {
            f7.dialog.preloader("Validando acceso");
            try {
                const res = await bootstrapValidacionDispositivo();
                await store.dispatch("setDispositivoResult", res);
                if (!res.bloquea) {
                    f7.views.main?.router?.navigate("/login/", {
                        reloadAll: true,
                    });
                } else {
                    f7.dialog.alert("Sigue bloqueado: " + (res.message || ""));
                }
            } catch (e) {
                f7.dialog.alert("Error al validar. Intenta más tarde.");
            } finally {
                f7.dialog.close();
            }
        },
    },
};
</script>
