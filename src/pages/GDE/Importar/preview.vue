<template>
    <f7-page name="importar-forestruck-preview">
        <f7-navbar title="Preview Forestruck" back-link="Volver" />

        <!-- ALERTA: no hay payload en store -->
        <f7-block v-if="!preview" strong class="alert-wrapper">
            <div class="alert alert-danger">
                <i class="f7-icons">exclamationmark_circle</i>
                No hay un archivo cargado para previsualizar. Vuelve y
                selecciona uno.
            </div>
            <div class="text-align-right" style="margin-top: 8px">
                <f7-button small outline color="red" @click="volver">
                    Volver
                </f7-button>
            </div>
        </f7-block>

        <template v-else>
            <!-- Info archivo -->
            <f7-block strong inset>
                <div style="display: flex; align-items: center; gap: 10px">
                    <f7-icon
                        :f7="
                            preview.imported
                                ? 'checkmark_circle_fill'
                                : 'doc_text_fill'
                        "
                        :color="preview.imported ? 'red' : 'green'"
                    />
                    <div style="flex: 1">
                        <div>
                            <b>{{ preview.file?.name || "Archivo" }}</b>
                        </div>
                        <div
                            class="text-color-gray"
                            style="font-size: 12px; margin-top: 4px"
                        >
                            Tamaño:
                            {{
                                (preview.file?.size || 0).toLocaleString()
                            }}
                            bytes • Modificado:
                            {{
                                new Date(
                                    preview.file?.lastModified || 0
                                ).toLocaleString()
                            }}
                        </div>

                        <div style="margin-top: 4px">
                            <span
                                :class="
                                    preview.imported
                                        ? 'text-color-red'
                                        : 'text-color-green'
                                "
                            >
                                {{
                                    preview.imported ? "Integrado" : "Pendiente"
                                }}
                            </span>
                        </div>
                    </div>
                </div>
            </f7-block>

            <!-- Acciones -->
            <f7-block class="mb-0">
                <f7-button
                    small
                    outline
                    @click="copiarJson"
                    :disabled="!prettyJson"
                >
                    Copiar JSON
                </f7-button>
            </f7-block>

            <!-- JSON -->
            <f7-block strong inset>
                <div
                    class="text-color-gray"
                    style="font-size: 12px; margin-bottom: 8px"
                >
                    JSON cargado desde store (previsualización)
                </div>

                <pre class="json-box">{{ prettyJson }}</pre>

                <div
                    v-if="isTruncated"
                    class="text-color-gray"
                    style="font-size: 12px; margin-top: 8px"
                >
                    *El JSON es muy grande y se muestra truncado.
                </div>
            </f7-block>
        </template>
    </f7-page>
</template>

<script>
import store from "@/js/store";
import { f7 } from "framework7-vue";

export default {
    name: "ImportarForestruckPreviewPage",

    data() {
        return {
            prettyJson: "",
            isTruncated: false,
        };
    },

    computed: {
        preview() {
            return store.state?.forestruckPreview || null;
        },
        shortUri() {
            const u = this.preview?.file?.uri || "";
            if (!u) return "";
            // deja solo los últimos 28 chars (ajusta a gusto)
            const tail = 28;
            return u.length > tail ? `…${u.slice(-tail)}` : u;
        },
    },

    methods: {
        volver() {
            f7.views.main?.router?.back();
        },

        buildPrettyJson() {
            this.isTruncated = false;

            const j = this.preview?.json ?? null;
            if (!j) {
                this.prettyJson = "(sin JSON en store)";
                return;
            }

            // stringify seguro + truncado para no matar la UI
            let s = "";
            try {
                s = JSON.stringify(j, null, 2);
            } catch (e) {
                this.prettyJson = "No se pudo serializar el JSON.";
                return;
            }

            const MAX_CHARS = 80_000; // ajusta si quieres
            if (s.length > MAX_CHARS) {
                this.prettyJson = s.slice(0, MAX_CHARS);
                this.isTruncated = true;
            } else {
                this.prettyJson = s;
            }
        },

        async copiarJson() {
            try {
                const text = this.prettyJson || "";
                await navigator.clipboard.writeText(text);
                f7.toast
                    .create({ text: "JSON copiado", closeTimeout: 1500 })
                    .open();
            } catch (e) {
                console.log(e);
                f7.dialog.alert("No se pudo copiar el JSON.");
            }
        },
    },

    mounted() {
        this.buildPrettyJson();
    },

    watch: {
        preview: {
            deep: true,
            handler() {
                this.buildPrettyJson();
            },
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

.json-box {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.35;
    background: #111;
    color: #eee;
    padding: 12px;
    border-radius: 8px;
    overflow: auto;
    max-height: 55vh;
}
</style>
