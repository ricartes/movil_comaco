<template>
    <f7-app v-bind="f7params">
        <f7-view main class="safe-areas" url="/login/"></f7-view>
    </f7-app>
</template>

<script>
import { onMounted, onBeforeUnmount } from "vue";
import { f7, f7ready } from "framework7-vue";
import { getDevice } from "framework7/lite-bundle";
import capacitorApp from "../js/capacitor-app.js";
import { App as CapacitorApp } from "@capacitor/app";

import routes from "../js/routes.js";
import store from "../js/store";
import { bootstrapValidacionDispositivo } from "@/js/bootstrap-dispositivo";
import {
    listenForFcmMessages,
    extractPushData,
} from "@/app/services/firebaseMessaging";
import { cargarFoliosDesdeWeb } from "@/app/services/CargaFoliosService";

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

        // ------- Guards / referencias de listeners -------
        let pushGuard = false;
        let lastValidation = 0;
        const MIN_RECHECK_MS = 3000;

        let stateChangeHandle = null;
        let resumeHandle = null;
        let backHandle = null;
        let visibilityHandle = null;

        // ------- Validación central (intrusiva) -------
        const runValidacionAcceso = async ({
            silent = false,
            nonIntrusive = false,
        } = {}) => {
            if (!silent) f7.dialog.preloader("Validando acceso");
            try {
                const res = await bootstrapValidacionDispositivo();
                await store.dispatch("setDispositivoResult", res);

                const router = f7.views.main?.router;
                const currentPath =
                    router?.currentRoute?.path ||
                    router?.url ||
                    (router?.history?.length
                        ? router.history[router.history.length - 1]
                        : "") ||
                    "";

                if (res.bloquea) {
                    // 🚫 bloqueado → navegar sí o sí a /bloqueado
                    if (!currentPath.startsWith("/bloqueado")) {
                        router?.navigate("/bloqueado/", {
                            ...(silent
                                ? { replaceState: true }
                                : { reloadAll: true }),
                            clearPreviousHistory: !silent,
                        });
                    }
                    return { ok: false, bloquea: true };
                } else {
                    // ✅ OK: si nonIntrusive = true NO navegamos
                    if (!nonIntrusive) {
                        router?.navigate("/login/", {
                            ...(silent
                                ? { replaceState: true }
                                : { reloadAll: true }),
                            clearPreviousHistory: !silent,
                        });
                    }
                    return { ok: true, bloquea: false };
                }
            } catch (err) {
                const previoBloqueado = store.getters.isBloqueado;
                const previoTieneUid = !!store.getters.dispositivoUid;
                const router = f7.views.main?.router;
                const currentPath =
                    router?.currentRoute?.path ||
                    router?.url ||
                    (router?.history?.length
                        ? router.history[router.history.length - 1]
                        : "") ||
                    "";

                const isOfflineLike =
                    typeof navigator !== "undefined" &&
                    navigator?.onLine === false;

                if (previoTieneUid && !previoBloqueado) {
                    // En offline/silencioso/no-intrusivo NO navegamos; deja seguir
                    if (isOfflineLike || nonIntrusive || silent) {
                        return { ok: true, bloquea: false, degraded: true };
                    }
                    // Flujo intrusivo normal → volver a login si no estás ahí
                    if (!currentPath.startsWith("/login")) {
                        router?.navigate("/login/", {
                            ...(silent
                                ? { replaceState: true }
                                : { reloadAll: true }),
                            clearPreviousHistory: !silent,
                        });
                    }
                    return { ok: true, bloquea: false, degraded: true };
                } else {
                    // Sin UID o marcado bloqueado → a /bloqueado
                    await store.dispatch("setDispositivoResult", {
                        uid: store.getters.dispositivoUid ?? null,
                        estado: "DESCONOCIDO",
                        bloquea: true,
                        message:
                            "No fue posible validar el dispositivo. Bloqueado por defecto.",
                    });
                    if (!currentPath.startsWith("/bloqueado")) {
                        router?.navigate("/bloqueado/", {
                            ...(silent
                                ? { replaceState: true }
                                : { reloadAll: true }),
                            clearPreviousHistory: !silent,
                        });
                    }
                    return { ok: false, bloquea: true };
                }
            } finally {
                if (!silent) f7.dialog.close();
            }
        };

        window.appValidate = runValidacionAcceso;

        // ------- Validación silenciosa (no intrusiva) -------
        const validateIfNeededSilently = () => {
            if (!store.getters.ready) return; // no corras antes de hydrate
            const now = Date.now();
            if (now - lastValidation < MIN_RECHECK_MS) return;
            lastValidation = now;
            runValidacionAcceso({ silent: true, nonIntrusive: true });
        };

        // ------- Handlers FCM -------
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
            return true;
        };

        const handleFolioIntent = async (intent, payload = {}) => {
            if (intent !== "folio:loaded") return false;
            if (pushGuard) return true;

            const { user } = store.state || {};
            if (user && user.empresa && user.rut) {
                try {
                    pushGuard = true;
                    f7.dialog.preloader("Cargando folios…");
                    const resultado = await cargarFoliosDesdeWeb(
                        user.empresa,
                        user.rut
                    );

                    if (resultado?.ok) {
                        const inserted = Number(resultado.inserted ?? 0);
                        const confirmed = Array.isArray(resultado.confirmed)
                            ? resultado.confirmed.length
                            : 0;
                        const msg = `
                        <div class="text-start">
                            <p><strong>Folios cargados correctamente.</strong></p>
                            <ul class="mt-2 mb-0">
                            <li><b>Documentos insertados:</b> ${inserted}</li>
                            <li><b>Confirmados:</b> ${confirmed}</li>
                            </ul>
                        </div>`;
                        f7.dialog.alert(msg, "Carga completada");
                    } else {
                        f7.dialog.alert(
                            "No se cargaron folios o la respuesta fue inválida.",
                            "Aviso"
                        );
                    }
                } catch (ex) {
                    const detail = ex?.message || String(ex);
                    f7.dialog.alert(
                        `Ha ocurrido un error al cargar los folios:<br><small>${detail}</small>`,
                        "Error"
                    );
                } finally {
                    f7.dialog.close();
                    pushGuard = false;
                }
            }
            return true;
        };

        const handleGdeStateChangeIntent = async (intent, { title, body }) => {
            if (intent !== "guia:state_changed") return false;
            if (pushGuard) return true;
            //TODO: aca implementar posible cambio estado gde local
            return true;
        };

        const handlePushIntent = async (payload) => {
            const { data, title, body } = payload || {};
            const intent = (data?.intent || "").toLowerCase();
            if (!intent) return;

            if (await handleDeviceIntent(intent, { title, body })) return;
            if (await handleFolioIntent(intent, payload)) return;
            if (await handleGdeStateChangeIntent(intent, payload)) return;

            f7.toast
                .create({
                    text: `Intent recibido: ${intent}`,
                    closeTimeout: 2000,
                })
                .open();
        };

        // ------- Ciclo de vida -------
        onMounted(() => {
            f7ready(async () => {
                // 1) hidrata primero
                await store.dispatch("hydrate");

                // 2) init + listeners después de hydrate
                if (device.capacitor) {
                    capacitorApp.init(f7);

                    if (device.android) {
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

                        // App state / resume
                        stateChangeHandle = await CapacitorApp.addListener(
                            "appStateChange",
                            ({ isActive }) => {
                                if (isActive) validateIfNeededSilently();
                            }
                        );
                        resumeHandle = await CapacitorApp.addListener(
                            "resume",
                            () => {
                                validateIfNeededSilently();
                            }
                        );

                        // Botón atrás
                    }
                }

                // Visibilidad (webview vuelve a primer plano)
                visibilityHandle = () => {
                    if (document.visibilityState === "visible")
                        validateIfNeededSilently();
                };
                document.addEventListener("visibilitychange", visibilityHandle);

                // 3) validación inicial intrusiva
                await runValidacionAcceso();
            });
        });

        onBeforeUnmount(() => {
            stateChangeHandle?.remove?.();
            resumeHandle?.remove?.();
            backHandle?.remove?.();
            if (visibilityHandle) {
                document.removeEventListener(
                    "visibilitychange",
                    visibilityHandle
                );
                visibilityHandle = null;
            }
        });

        return { f7params };
    },
};
</script>
