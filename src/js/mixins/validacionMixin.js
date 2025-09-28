// src/mixins/validacionMixin.js
import { f7 } from "framework7-vue";
import store from "@/js/store";
import { bootstrapValidacionDispositivo } from "@/js/bootstrap-dispositivo";

export default {
    methods: {
        async runValidacionAcceso() {
            f7.dialog.preloader("Validando acceso");

            try {
                const res = await bootstrapValidacionDispositivo();
                console.log("[Validación] Resultado:", res);

                await store.dispatch("setDispositivoResult", res);

                if (res.bloquea) {
                    f7.views.main?.router?.navigate("/bloqueado/", { reloadAll: true });
                } else {
                    f7.views.main?.router?.navigate("/login/", { reloadAll: true });
                }
            } catch (err) {
                console.warn("[Validación] Falló:", err);

                const previoBloqueado = store.getters.isBloqueado;
                const previoTieneUid = !!store.getters.dispositivoUid;

                if (previoTieneUid && !previoBloqueado) {
                    f7.views.main?.router?.navigate("/login/", { reloadAll: true });
                } else {
                    await store.dispatch("setDispositivoResult", {
                        uid: store.getters.dispositivoUid ?? null,
                        estado: "DESCONOCIDO",
                        bloquea: true,
                        message:
                            "No fue posible validar el dispositivo. Bloqueado por defecto.",
                    });
                    f7.views.main?.router?.navigate("/bloqueado/", { reloadAll: true });
                }
            } finally {
                f7.dialog.close();
            }
        }
    }
};
