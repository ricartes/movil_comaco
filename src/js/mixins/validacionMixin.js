// src/mixins/validacionMixin.js
import { f7 } from "framework7-vue";
import store from "@/js/store";
import { bootstrapValidacionDispositivo } from "@/js/bootstrap-dispositivo";

// instancia compartida para el preloader de validación
let validacionPreloader = null;

function abrirPreloaderValidacion(mensaje = "Validando acceso") {
    // por si quedó alguno abierto
    if (validacionPreloader) {
        try {
            validacionPreloader.close();
        } catch (e) { }
        validacionPreloader = null;
    }

    validacionPreloader = f7.dialog.preloader(mensaje);
}

function cerrarPreloaderValidacion() {
    if (validacionPreloader) {
        try {
            validacionPreloader.close();
        } catch (e) { }
        validacionPreloader = null;
    }

    // saneo extra por si quedó un fantasma en el DOM
    const ghost = document.querySelector(".dialog.dialog-preloader");
    if (ghost && ghost.parentNode) {
        ghost.parentNode.removeChild(ghost);
    }
}

export default {
    methods: {
        async runValidacionAcceso() {
            abrirPreloaderValidacion("Validando acceso");

            try {
                const res = await bootstrapValidacionDispositivo();
                console.log("[Validación] Resultado:", res);

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
                console.warn("[Validación] Falló:", err);

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
                cerrarPreloaderValidacion();
            }
        },
    },
};
