<template>
    <f7-page
        name="importar-forestruck"
        @page:init="onPageInit"
        @page:beforein="onPageBeforeIn"
    >
        <f7-navbar title="Importar desde Forestruck" back-link="Volver" />

        <f7-block class="mb-0">
            <f7-button fill @click="reload" :disabled="loading">
                {{ loading ? "Cargando…" : "Actualizar" }}
            </f7-button>
        </f7-block>

        <f7-block class="mb-0">
            <div class="text-color-gray">
                Mostrando guías desde el directorio <b>{{ displayPath }}</b>
            </div>
        </f7-block>

        <!-- Lista -->
        <f7-list inset strong v-if="items.length">
            <f7-list-item
                v-for="it in items"
                :key="it.fileKey"
                link
                :title="it.file.name"
                :subtitle="it.file.uri"
                @click="abrirPreview(it)"
            >
                <template #media>
                    <f7-icon
                        :f7="
                            it.imported
                                ? 'checkmark_circle_fill'
                                : 'doc_text_fill'
                        "
                        :color="it.imported ? 'red' : 'green'"
                    />
                </template>

                <template #after>
                    <span
                        :class="
                            it.imported ? 'text-color-red' : 'text-color-green'
                        "
                    >
                        {{ it.imported ? "Integrado" : "Pendiente" }}
                    </span>
                </template>
            </f7-list-item>
        </f7-list>

        <!-- Empty -->
        <f7-block v-else class="text-align-center">
            <f7-icon f7="tray_arrow_down" size="48" />
            <div class="margin-top">
                {{ emptyMessage }}
            </div>
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

export default {
    name: "ImportarForestruckPage",

    data() {
        return {
            loading: false,
            items: [],
            treeUriLocal: null,
            displayPathLocal: "No configurada",
            _autoLoadedOnce: false,
        };
    },

    computed: {
        displayPath() {
            return this.displayPathLocal || "No configurada";
        },
    },

    methods: {
        // ✅ espera real a que el store esté listo (si hydrate no retorna promise bien)
        async waitStoreReady(maxMs = 1500) {
            const start = Date.now();
            while (!store.state?.ready) {
                // intenta disparar hydrate una vez
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
        },

        async onPageInit() {
            // pageInit ocurre 1 vez; aquí hacemos auto-load inicial
            await this.waitStoreReady();
            this.syncFolderFromStore();

            if (!this.treeUriLocal) return; // no configurada
            await this.reload();
            this._autoLoadedOnce = true;
        },

        async onPageBeforeIn() {
            // cada vez que vuelves (ej. desde Configuración)
            await this.waitStoreReady();
            this.syncFolderFromStore();

            // si ya auto-cargó, igual puedes recargar para reflejar archivos nuevos
            if (this.treeUriLocal) await this.reload();
        },

        async reload() {
            if (this.loading) return;

            // asegura carpeta sincronizada
            await this.waitStoreReady();
            this.syncFolderFromStore();

            if (!this.treeUriLocal) {
                this.items = [];
                f7.dialog.alert(
                    "Primero debes configurar la carpeta de intercambio en Configuración."
                );
                return;
            }

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
                    f7.dialog.alert(
                        "Primero debes configurar la carpeta de intercambio en Configuración."
                    );
                    return;
                }

                f7.dialog.alert(
                    e?.message || "No se pudo cargar la carpeta de intercambio."
                );
            } finally {
                this.loading = false;
            }
        },

        async abrirPreview(it) {
            try {
                const payload = await leerJsonForestruckParaPreview(it);
                console.log(payload);

                // ✅ en tu store es dispatch, no commit
                await store.dispatch("setForestruckPreview", payload);

                console.log("pasa");

                f7.views.main.router.navigate("/gde/importar/preview");
            } catch (e) {
                console.log(e);
                f7.dialog.alert(e?.message || "No se pudo leer el JSON.");
            }
        },
    },
};
</script>


