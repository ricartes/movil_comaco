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
import { cargarFoliosYLiberados } from "@/app/services/CargarFoliosOrquestador";
import {
    attachNotificationActionHandler,
    startGdeSyncForegroundService,
    stopGdeSyncForegroundService,
} from "@/app/background/foregroundService";
import Utilidades from "@/app/Utilidades.js";
import HelperService from "@/app/services/HelperService.js";
import { usuarioLogeadoNoCorresponde } from "@/js/Utils/Seguridad.js";
import UsuarioService from "@/app/services/UsuarioService";

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

        function startAutoSyncIfPossible() {
            try {
                const user = store.state.user || {};
                const empId = user.empresa ?? user.empId;
                const rutEmisor = String(user.rut || "");
                // Solo Android + con credenciales mínimas
                if (getDevice().android && empId && rutEmisor) {
                    startGdeSyncForegroundService(empId, rutEmisor); // idempotente (nuestro módulo evita duplicar intervalos)
                } else {
                    stopGdeSyncForegroundService();
                }
            } catch (e) {
                console.warn(
                    "No se pudo iniciar la sync automática:",
                    e?.message || e
                );
            }
        }

        let onAuthLogin, onAuthLogout;

        // ------- Validación central (intrusiva) -------
        const runValidacionAcceso = async ({
            silent = false,
            nonIntrusive = false,
        } = {}) => {
            if (!silent) f7.dialog.preloader("Validando acceso");
            const router = f7.views.main?.router;

            try {
                // === Paso 0: Conectividad
                const conexion = await Utilidades.verificarConexion();
                if (!conexion?.connected) {
                    // no hay red → usar estado previo
                    return await fallbackSinRed({
                        router,
                        silent,
                        nonIntrusive,
                    });
                }

                // Hay red según sistema… ¿y el backend responde?
                const online = await HelperService.validarConexion(8000);
                if (!online) {
                    // sin salida al host / backend caído → usar estado previo
                    return await fallbackSinRed({
                        router,
                        silent,
                        nonIntrusive,
                    });
                }

                // === Paso 1: Validación online real
                const res = await bootstrapValidacionDispositivo();
                await store.dispatch("setDispositivoResult", res);
                // navegación normal
                const currentPath =
                    router?.currentRoute?.path ||
                    router?.url ||
                    (router?.history?.length
                        ? router.history[router.history.length - 1]
                        : "") ||
                    "";

                if (res.bloquea) {
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
                    const user = store.state.user || {};
                    const autenticado = !!localStorage.getItem("auth_token");
                    const rutSesion = String(user.rut || "");
                    const rutAsignado = res.rut;
                    const usuarioNoCorrespondido =
                        autenticado &&
                        usuarioLogeadoNoCorresponde(rutSesion, rutAsignado);

                    if (autenticado && usuarioNoCorrespondido) {
                        //cerrar sesion si no corresponde
                        f7.dialog.alert(
                            "El usuario en sesión no corresponde al asignado al dispositivo. Favor iniciar sesión con el usuario asignado o contactar al administrador.",
                            "Inicio sesión",
                            async () => {
                                await store.dispatch("clearSession");
                                localStorage.removeItem("auth_token");
                                await UsuarioService.eliminarUsuarioLocalPorRut(
                                    rutSesion
                                );
                                router?.navigate("/login/", {
                                    ...(silent
                                        ? { replaceState: true }
                                        : { reloadAll: true }),
                                    clearPreviousHistory: !silent,
                                });
                            }
                        );
                    } else {
                        if (!nonIntrusive) {
                            router?.navigate("/login/", {
                                ...(silent
                                    ? { replaceState: true }
                                    : { reloadAll: true }),
                                clearPreviousHistory: !silent,
                            });
                        }
                    }

                    return {
                        ok: usuarioNoCorrespondido ? false : true,
                        bloquea: false,
                    };
                }
            } catch (err) {
                // Error “real” (DNS/timeout/etc.) → trata como sin red
                return await fallbackSinRed({ router, silent, nonIntrusive });
            } finally {
                if (!silent) f7.dialog.close();
            }
        };

        async function fallbackSinRed({ router, silent, nonIntrusive }) {
            const previoBloqueado = !!store.getters.isBloqueado?.value;
            const previoUid = !!store.getters.dispositivoUid?.value;
            const previoEstado = store.getters.estadoDispositivo?.value;
            const previoOk =
                previoUid &&
                !previoBloqueado &&
                !!previoEstado &&
                previoEstado !== "DESCONOCIDO";

            const currentPath =
                router?.currentRoute?.path ||
                router?.url ||
                (router?.history?.length
                    ? router.history[router.history.length - 1]
                    : "") ||
                "";
            console.log("Validación sin red: estado previo:", {
                previoUid,
                previoBloqueado,
                previoEstado,
                previoOk,
            });
            if (previoOk) {
                // Permite seguir (degradado). Si es intrusivo, llévalo al login solo si estás online; acá no navegamos salvo que quieras mandarlo al home offline:
                if (!nonIntrusive && !currentPath.startsWith("/login")) {
                    router?.navigate("/login/", {
                        ...(silent
                            ? { replaceState: true }
                            : { reloadAll: true }),
                        clearPreviousHistory: !silent,
                    });
                }
                return { ok: true, bloquea: false, degraded: true };
            }

            // Sin historial confiable → bloquea por seguridad
            await store.dispatch("setDispositivoResult", {
                uid: store.getters.dispositivoUid?.value ?? null,
                estado: "DESCONOCIDO",
                bloquea: true,
                message:
                    "No fue posible validar el dispositivo (sin conectividad). Bloqueado por defecto.",
            });
            if (!currentPath.startsWith("/bloqueado")) {
                router?.navigate("/bloqueado/", {
                    ...(silent ? { replaceState: true } : { reloadAll: true }),
                    clearPreviousHistory: !silent,
                });
            }
            return { ok: false, bloquea: true };
        }

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

                    const resumen = await cargarFoliosYLiberados(
                        user.empresa,
                        user.rut
                    );
                    const html = `
                        <div class="text-start">
                        <p><strong>Proceso completado.</strong></p>
                        <ul class="mt-2 mb-0">
                            <li><b>Folios:</b> ${
                                resumen.carga.ok ? "OK" : "<b>ERROR</b>"
                            }</li>
                            <li><b>Liberaciones:</b> ${
                                resumen.liberado.ok ? "OK" : "<b>ERROR</b>"
                            }
                            ${
                                resumen.liberado.ok
                                    ? ` (actualizados: ${resumen.liberado.updated}, confirmados: ${resumen.liberado.confirmed.length})`
                                    : ""
                            }
                            </li>
                        </ul>
                        </div>`;
                    f7.dialog.alert(html, "Carga completada");
                } catch (ex) {
                    f7.dialog.alert(
                        `Ha ocurrido un error:<br><small>${
                            ex?.message || ex
                        }</small>`,
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
            if (!window.__authHandlersRegistered) {
                onAuthLogin = () => startAutoSyncIfPossible();
                onAuthLogout = () => stopGdeSyncForegroundService();

                window.addEventListener("auth:login", onAuthLogin);
                window.addEventListener("auth:logout", onAuthLogout);
                window.__authHandlersRegistered = true;
            }

            f7ready(async () => {
                // 1) hidrata primero
                await store.dispatch("hydrate");

                if (device.capacitor && device.android) {
                    const { gateNotificationsOrBlock } = await import(
                        "@/app/helpers/permissions"
                    );
                    const ok = await gateNotificationsOrBlock(
                        f7.views.main?.router
                    );
                    if (!ok) return; // 🔒 se redirige a /permisos-notificaciones/ y detiene el flujo
                }

                // 2) init + listeners después de hydrate
                if (device.capacitor) {
                    capacitorApp.init(f7);

                    if (device.android) {
                        // dentro de f7ready, después de hydrate:
                        if (
                            device.capacitor &&
                            device.android &&
                            !window.__fgsHandlerAttached
                        ) {
                            attachNotificationActionHandler(); // idempotente
                            window.__fgsHandlerAttached = true;
                        }

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
                                if (isActive) {
                                    //validateIfNeededSilently();
                                }
                            }
                        );
                        resumeHandle = await CapacitorApp.addListener(
                            "resume",
                            () => {
                                //validateIfNeededSilently();
                            }
                        );

                        // Botón atrás
                    }
                }

                // Visibilidad (webview vuelve a primer plano)
                visibilityHandle = () => {
                    if (document.visibilityState === "visible") {
                        //validateIfNeededSilently();
                    }
                };
                document.addEventListener("visibilitychange", visibilityHandle);

                // 3) validación inicial intrusiva
                await runValidacionAcceso();
            });
        });

        onBeforeUnmount(() => {
            if (onAuthLogin)
                window.removeEventListener("auth:login", onAuthLogin);
            if (onAuthLogout)
                window.removeEventListener("auth:logout", onAuthLogout);
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
