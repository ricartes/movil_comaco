<!-- pages/Bloqueado.vue -->
<template>
    <f7-page>
        <f7-navbar title="Dispositivo bloqueado" />
        <f7-block>
            <p>Tu dispositivo está bloqueado o no fue posible validarlo.</p>
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

export default {
    methods: {
        async reintentar() {
            const pre = f7.preloader.show();
            try {
                const res = await bootstrapValidacionDispositivo();
                console.log(res);
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
                f7.preloader.hide(pre);
            }
        },
    },
};
</script>
