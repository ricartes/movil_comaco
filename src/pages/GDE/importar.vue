<template>
    <f7-page
        name="importar-forestruck"
        @page:init="onPageInit"
        @page:beforein="onPageBeforeIn"
    >
        <f7-navbar title="Importar desde Forestruck" back-link="Volver" />

        <!-- ALERTA: carpeta no configurada -->
        <f7-block v-if="!folderOk" strong class="alert-wrapper">
            <div class="alert alert-danger">
                <i class="f7-icons">exclamationmark_circle</i>
                {{ folderErrorMsg }}
            </div>
            <div class="text-align-right" style="margin-top: 8px">
                <f7-button small outline color="red" @click="irAConfiguracion">
                    Ir a Configuración
                </f7-button>
            </div>
        </f7-block>

        <!-- ALERTA: parámetros generales / mapping -->
        <f7-block v-if="folderOk && !paramsOk" strong class="alert-wrapper">
            <div class="alert alert-danger">
                <i class="f7-icons">exclamationmark_circle</i>
                {{ paramsErrorMsg }}
            </div>
        </f7-block>

        <f7-block class="mb-0">
            <f7-button
                fill
                @click="onClickActualizar"
                :disabled="loading || !canOperate"
            >
                {{ loading ? "Cargando…" : "Actualizar" }}
            </f7-button>
        </f7-block>

        <!-- Info directorio -->
        <f7-block class="mb-0" v-if="folderOk">
            <div class="text-color-gray">
                Mostrando guías desde el directorio <b>{{ displayPath }}</b>
            </div>
        </f7-block>

        <!-- Lista -->
        <f7-list inset strong v-if="canOperate && items.length">
            <f7-list-item
                v-for="it in items"
                :key="it.fileKey"
                link
                :title="it.file.name"
                :subtitle="it.file.uri"
                @click="() => !it.imported && abrirPreview(it)"
            >
                <template #media>
                    <f7-icon
                        :f7="
                            it.failed
                                ? 'exclamationmark_circle_fill'
                                : it.imported
                                ? 'checkmark_circle_fill'
                                : 'clock_fill'
                        "
                        :color="
                            it.failed ? 'red' : it.imported ? 'green' : 'yellow'
                        "
                    />
                </template>

                <template #after>
                    <span
                        :class="
                            it.failed
                                ? 'text-color-red'
                                : it.imported
                                ? 'text-color-green'
                                : 'text-color-yellow'
                        "
                    >
                        {{
                            it.failed
                                ? "Error"
                                : it.imported
                                ? "Integrado"
                                : "Pendiente"
                        }}
                    </span>
                </template>
            </f7-list-item>
        </f7-list>

        <!-- Empty -->
        <f7-block v-else-if="canOperate" class="text-align-center">
            <f7-icon f7="tray_arrow_down" size="48" />
            <div class="margin-top">{{ emptyMessage }}</div>
        </f7-block>
    </f7-page>
</template>

<script>
import store from "@/js/store";
import { f7 } from "framework7-vue";
import {
    listarImportablesForestruck,
    leerJsonForestruckParaPreview,
    ForestruckImportError,
} from "@/app/services/ForestruckImportService";

import { listarParametrosGenerales } from "@/app/services/Parametros/ParametrosGeneralService";

// IDs “canónicos” de tus params
import config from "@/Common/json/config.json"; // <- donde tienes parametrosGenerales.forestruckMapping = 8

export default {
    name: "ImportarForestruckPage",

    data() {
        return {
            loading: false,
            items: [],

            // carpeta (desde store)
            treeUriLocal: null,
            displayPathLocal: "No configurada",
            folderOk: false,
            folderErrorMsg:
                "Carpeta de intercambio no configurada. Debes configurarla en Configuración.",

            // parámetros
            paramLoading: false,
            paramsOk: false,
            paramsErrorMsg:
                "No se pudieron cargar los parámetros generales. No es posible importar.",
            mappingValue: null, // JSON mapping (param 8)

            // helpers
            _autoLoadedOnce: false,

            _lastPrecheckAt: 0,
            _lastFolderSyncAt: 0,
            _precheckPromise: null,
        };
    },

    computed: {
        displayPath() {
            return this.displayPathLocal || "No configurada";
        },

        canOperate() {
            // si no tengo carpeta o params/mapping, deshabilito actualizar + importar
            return this.folderOk && this.paramsOk;
        },

        emptyMessage() {
            if (!this.folderOk)
                return "Configura una carpeta para ver archivos JSON.";
            if (!this.paramsOk)
                return "Faltan parámetros para importar (revisa la alerta).";
            if (this.loading) return "Cargando…";
            return "No se encontraron JSON en la carpeta.";
        },

        usuarioActivo() {
            return store.state?.user || null;
        },
    },

    methods: {
        async waitStoreReady(maxMs = 2000) {
            const start = Date.now();
            while (!store.state?.ready) {
                try {
                    await store.dispatch("hydrate");
                } catch (e) {}
                if (store.state?.ready) break;

                if (Date.now() - start > maxMs) break;
                await new Promise((r) => setTimeout(r, 80));
            }
        },

        syncFolderFromStore() {
            const ig = store.state?.importGuides || {};
            this.treeUriLocal = ig.treeUri || null;
            this.displayPathLocal = ig.displayPath || "No configurada";

            this.folderOk = !!this.treeUriLocal;

            if (!this.folderOk) {
                this.items = [];
            }
        },

        async cargarParametros() {
            this.paramLoading = true;
            this.paramsOk = false;
            this.mappingValue = null;

            try {
                const empresaId = this?.usuarioActivo?.empresa ?? 1;

                const parametros = await listarParametrosGenerales(empresaId);
                const arr = Array.isArray(parametros) ? parametros : [];

                // ✅ busca mapping por id=8 (preferente) o por glosa
                const mappingId =
                    config?.parametrosGenerales?.forestruckMapping ?? 8;

                const pById = arr.find(
                    (p) =>
                        Number(p.id) === Number(mappingId) &&
                        String(p.empId) === String(empresaId)
                );

                const pByGlosa = arr.find(
                    (p) =>
                        String(p.empId) === String(empresaId) &&
                        String(p.glosa || "").toUpperCase() ===
                            "FORESTRUCK_MAPPING"
                );

                const raw = pById?.valor ?? pByGlosa?.valor;

                if (!raw) {
                    this.paramsErrorMsg =
                        "Faltan cargar parámetros generales. Favor cargar los parámetros desde el menú principal.";
                    return;
                }

                // si el backend ya devuelve JSON, esto puede venir objeto; si viene string, parsea
                let mapping = raw;
                if (typeof raw === "string") {
                    try {
                        mapping = JSON.parse(raw);
                    } catch (e) {
                        this.paramsErrorMsg =
                            "El parámetro Forestruck Mapping (ID 8) no es un JSON válido.";
                        return;
                    }
                }

                // validación mínima del mapping (lo básico)
                if (!mapping || typeof mapping !== "object") {
                    this.paramsErrorMsg =
                        "El parámetro Forestruck Mapping (ID 8) es inválido.";
                    return;
                }

                this.mappingValue = mapping;
                this.paramsOk = true;
            } catch (e) {
                console.error("cargarParametros:", e);
                this.paramsErrorMsg =
                    e?.message ||
                    "No se pudieron cargar los parámetros generales. No es posible importar.";
            } finally {
                this.paramLoading = false;
            }
        },

        async precheck() {
            await this.waitStoreReady();
            this.syncFolderFromStore();

            // si no hay carpeta, no seguimos
            if (!this.folderOk) return false;

            // carga params y valida mapping
            await this.cargarParametros();
            return this.canOperate;
        },

        async onPageInit() {
            await this.withLoading(async () => {
                const ok = await this.precheckCached({ force: true });
                if (!ok) return;

                await this.reload();
                this._autoLoadedOnce = true;
            }, "Cargando...");
        },

        async onPageBeforeIn() {
            await this.withLoading(async () => {
                const ok = await this.precheckCached({ force: true });
                if (!ok) return;

                if (this._autoLoadedOnce) {
                    await this.reload();
                }
            }, "Cargando...");
        },

        async reload() {
            if (this.loading) return;

            // No operar si faltan precondiciones (sin volver a pegar al backend)
            if (!this.canOperate) return;

            this.loading = true;
            try {
                this.items = await listarImportablesForestruck(
                    this.treeUriLocal
                );
            } catch (e) {
                console.log(e);

                if (
                    e instanceof ForestruckImportError &&
                    e.code === "FOLDER_NOT_CONFIGURED"
                ) {
                    this.items = [];
                    this.folderOk = false;
                    this.folderErrorMsg =
                        "Carpeta no configurada. Ve a Configuración y selecciónala nuevamente.";
                    return;
                }

                f7.dialog.alert(
                    e?.message || "No se pudo cargar la carpeta de intercambio."
                );
            } finally {
                this.loading = false;
            }
        },

        async onClickActualizar() {
            await this.withLoading(async () => {
                const ok = await this.precheckCached({ force: true });
                if (!ok) return;

                await this.reload();
            }, "Cargando...");
        },

        async abrirPreview(it) {
            if (!this.canOperate) return;

            if (it?.imported) {
                f7.toast
                    .create({
                        text: "Esta guía ya fue integrada.",
                        closeTimeout: 1500,
                    })
                    .open();
                return;
            }

            await this.withLoading(async () => {
                const payload = await leerJsonForestruckParaPreview(it);
                await store.dispatch("setForestruckPreview", payload);
                f7.views.main.router.navigate("/gde/importar/preview/");
            }, "Leyendo JSON...");
        },

        async precheckCached({ force = false } = {}) {
            // Evita llamadas paralelas: si ya hay una corriendo, espera esa.
            if (this._precheckPromise) return this._precheckPromise;

            const now = Date.now();

            // ✅ Si ya está todo OK y fue chequeado hace poco, no repitas
            const FRESH_MS = 4000; // ajustable (4s)
            if (
                !force &&
                this.canOperate &&
                now - this._lastPrecheckAt < FRESH_MS
            ) {
                return true;
            }

            this._precheckPromise = (async () => {
                await this.waitStoreReady();

                // Sync carpeta (pero no cada 10ms)
                this.syncFolderFromStore();
                this._lastFolderSyncAt = now;

                if (!this.folderOk) {
                    this._lastPrecheckAt = now;
                    return false;
                }

                // ✅ Solo carga params si no están OK o force
                if (force || !this.paramsOk) {
                    await this.cargarParametros();
                }

                this._lastPrecheckAt = now;
                return this.canOperate;
            })();

            try {
                return await this._precheckPromise;
            } finally {
                this._precheckPromise = null;
            }
        },

        irAConfiguracion() {
            f7.views.main?.router?.navigate("/configuracion/");
        },
    },
};
</script>

<style scoped>
.alert-wrapper {
    margin-top: 10px;
    margin-bottom: 10px;
}
.alert {
    width: 100%;
    box-sizing: border-box;
    border-radius: 6px;
    padding: 10px 15px;
    font-size: 14px;
    display: flex;
    align-items: center;
}
.alert i {
    font-size: 16px;
    margin-right: 6px;
}
.alert-danger {
    border: 1px solid #ebccd1;
    background: #f2dede;
    color: #a94442;
}

.is-imported {
    opacity: 0.7;
}
</style>
