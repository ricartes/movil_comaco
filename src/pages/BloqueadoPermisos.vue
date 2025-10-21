<template>
    <f7-page no-swipeback class="blocked-page">
        <f7-navbar title="Permisos requeridos" />

        <f7-block strong inset>
            <p>
                Para sincronizar en segundo plano necesitamos que habilites las
                notificaciones en Android.
            </p>
            <p>Sin ellas, no podremos mantener el servicio activo.</p>

            <div class="grid grid-cols-2 grid-gap">
                <f7-button fill @click="onOpenSettings" :disabled="loading">
                    Abrir ajustes
                </f7-button>
                <f7-button outline @click="onRetry" :disabled="loading">
                    Reintentar
                </f7-button>
            </div>

            <f7-block-footer class="mt-3">
                También puedes cerrar sesión y volver a entrar luego de
                habilitarlo.
            </f7-block-footer>
        </f7-block>
    </f7-page>
</template>

<script>
import { App as CapacitorApp } from "@capacitor/app";
import {
    isNotificationGranted,
    requestOrOpenSettings,
} from "@/app/helpers/permissions";

export default {
    name: "PermisosNotificaciones",
    props: { f7router: Object },

    data() {
        return {
            loading: false,
            _resumeHandle: null,
            _visibilityHandler: null,
        };
    },

    methods: {
        async checkAndExitIfGranted() {
            const ok = await isNotificationGranted();
            if (ok) {
                this.f7router.navigate("/login/", {
                    reloadAll: true,
                    clearPreviousHistory: true,
                });
            }
        },

        async onOpenSettings() {
            this.loading = true;
            try {
                await requestOrOpenSettings();
            } finally {
                this.loading = false;
            }
        },

        async onRetry() {
            await this.checkAndExitIfGranted();
        },
    },

    async mounted() {
        // Si ya hay permiso (por venir de ajustes), salimos
        await this.checkAndExitIfGranted();

        // Reintentar al volver a primer plano
        this._resumeHandle = await CapacitorApp.addListener(
            "resume",
            this.checkAndExitIfGranted
        );

        // Reintentar cuando la webview vuelve a ser visible
        this._visibilityHandler = () => {
            if (document.visibilityState === "visible")
                this.checkAndExitIfGranted();
        };
        document.addEventListener("visibilitychange", this._visibilityHandler);
    },

    beforeUnmount() {
        this._resumeHandle?.remove?.();
        if (this._visibilityHandler) {
            document.removeEventListener(
                "visibilitychange",
                this._visibilityHandler
            );
            this._visibilityHandler = null;
        }
    },
};
</script>

<style scoped>
.blocked-page {
    display: grid;
    place-items: center;
}
</style>
