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

let lastBack = 0;
let toastInstance = null;

let stateChangeHandle, resumeHandle, visibilityHandle;

function handleDoubleBackToExit() {
    const now = Date.now();
    if (now - lastBack < 2000) {
        CapacitorApp.exitApp();
    } else {
        if (toastInstance) toastInstance.close();
        toastInstance = f7.toast.create({
            text: "Presiona nuevamente para salir",
            closeTimeout: 1500,
        });
        toastInstance.open();
        lastBack = now;
    }
}

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

        let lastValidation = 0; // anti-spam
        const MIN_RECHECK_MS = 3000; // ventana mínima

        const validateIfNeededSilently = () => {
            const now = Date.now();
            if (now - lastValidation < MIN_RECHECK_MS) return;
            lastValidation = now;
            runValidacionAcceso({ silent: true, nonIntrusive: true });
        };

        // === 1) Validación central ===
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
                    // 🚨 Obligatorio: llevar a /bloqueado
                    if (!currentPath.startsWith("/bloqueado")) {
                        router?.navigate("/bloqueado/", {
                            ...(silent
                                ? { replaceState: true }
                                : { reloadAll: true }),
                            clearPreviousHistory: !silent,
                        });
                    }
                } else {
                    // ✅ Dispositivo OK
                    if (!nonIntrusive) {
                        // Comportamiento original (redirigir a /login si no estás ya allí)
                        if (
                            !currentPath.startsWith("/login") &&
                            !currentPath.startsWith("/home")
                        ) {
                            router?.navigate("/login/", {
                                ...(silent
                                    ? { replaceState: true }
                                    : { reloadAll: true }),
                                clearPreviousHistory: !silent,
                            });
                        }
                    }
                    // Si es nonIntrusive: NO navegamos (te quedas donde estás)
                }
            } catch (err) {
                // Si falla la validación: no patear si hay UID, no está bloqueado y estamos offline/silent/nonIntrusive
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
                    navigator &&
                    navigator.onLine === false;

                if (previoTieneUid && !previoBloqueado) {
                    if (isOfflineLike || silent || nonIntrusive) {
                        // Evitamos navegación disruptiva
                        // console.debug("Validación falló (offline/silent/nonIntrusive). No navegamos.");
                    } else {
                        // Solo en flujo intrusivo (arranque normal con red) volver al login si no estamos ahí
                        if (!currentPath.startsWith("/login")) {
                            router?.navigate("/login/", {
                                ...(silent
                                    ? { replaceState: true }
                                    : { reloadAll: true }),
                                clearPreviousHistory: !silent,
                            });
                        }
                    }
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
                }
            } finally {
                if (!silent) f7.dialog.close();
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

        const handleFolioIntent = async (intent, payload = {}) => {
            if (intent !== "folio:loaded") return false;
            if (pushGuard) return true;
            if (
                store.state.user &&
                store.state.user.empresa &&
                store.state.user.rut
            ) {
                // tomar empId/rut desde el push si vienen; si no, desde el usuario actual
                const empId = store.state.user.empresa;
                const rut = store.state.user.rut;

                try {
                    pushGuard = true;
                    f7.dialog.preloader("Cargando folios…");

                    const resultado = await cargarFoliosDesdeWeb(empId, rut);

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
                            </div>
                        `;
                        f7.dialog.alert(msg, "Carga completada");
                    } else {
                        f7.dialog.alert(
                            "No se cargaron folios o la respuesta fue inválida.",
                            "Aviso"
                        );
                    }
                } catch (ex) {
                    console.error("Error al cargar folios:", ex);
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

        // === 3) Dispatcher de intents ===
        const handlePushIntent = async (payload) => {
            const { data, title, body } = payload;
            const intent = (data?.intent || "").toLowerCase();
            if (!intent) return;

            // delega a handlers
            if (await handleDeviceIntent(intent, { title, body })) return;
            if (await handleFolioIntent(intent, payload)) return;

            // fallback

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

                    if (device.android) {
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

                        stateChangeHandle = await CapacitorApp.addListener(
                            "appStateChange",
                            ({ isActive }) => {
                                if (isActive) validateIfNeededSilently();
                            }
                        );

                        // Respaldo (algunas versiones lanzan 'resume')
                        resumeHandle = await CapacitorApp.addListener(
                            "resume",
                            () => {
                                validateIfNeededSilently();
                            }
                        );

                        CapacitorApp.addListener("backButton", () => {
                            const app = f7;
                            if (!app) return;

                            // 1) Cierra capas de UI primero (para que back no navegue)
                            if (app.dialog?.opened) {
                                app.dialog.close();
                                return;
                            }
                            const actionsOpened = document.querySelector(
                                ".actions-modal.modal-in"
                            );
                            if (actionsOpened) {
                                app.actions.close(actionsOpened);
                                return;
                            }
                            const sheetOpened = document.querySelector(
                                ".sheet-modal.modal-in"
                            );
                            if (sheetOpened) {
                                app.sheet.close(sheetOpened);
                                return;
                            }
                            const popupOpened =
                                document.querySelector(".popup.modal-in");
                            if (popupOpened) {
                                app.popup.close(popupOpened);
                                return;
                            }
                            const popoverOpened =
                                document.querySelector(".popover.modal-in");
                            if (popoverOpened) {
                                app.popover.close(popoverOpened);
                                return;
                            }

                            // 2) Ruta actual
                            const route =
                                app.views.main?.router?.currentRoute?.path ||
                                "";

                            // 3) Si estás en Home (tabs) → bloquear (no volver al login)
                            if (
                                route.startsWith("/login") ||
                                route.startsWith("/home")
                            ) {
                                handleDoubleBackToExit();
                                // (opcional) doble toque para salir:
                                // handleDoubleBackToExit();
                                return;
                            }

                            // 5) Resto de pantallas → navegar atrás
                        });
                    }
                }

                visibilityHandle = () => {
                    if (document.visibilityState === "visible")
                        validateIfNeededSilently();
                };
                document.addEventListener("visibilitychange", visibilityHandle);

                await store.dispatch("hydrate");
                await runValidacionAcceso();
            });
        });

        onBeforeUnmount(() => {
            stateChangeHandle?.remove?.();
            resumeHandle?.remove?.();
            document.removeEventListener("visibilitychange", visibilityHandle);
        });

        return { f7params };
    },
};
</script>
