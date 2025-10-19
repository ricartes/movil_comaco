<template>
    <f7-page data-name="configuracion" class="page-configuracion">
        <f7-navbar>
            <f7-nav-left>
                <f7-link @click="back">
                    <f7-icon icon="icon-back" />
                </f7-link>
            </f7-nav-left>
            <f7-nav-title>Configuración</f7-nav-title>
        </f7-navbar>

        <f7-block strong inset>
            <div class="text-muted" v-if="!isAndroid">
                <p>
                    <f7-icon f7="info_circle"></f7-icon>
                    La detección de impresoras Bluetooth está disponible solo en
                    Android.
                </p>
            </div>

            <div class="row">
                <div class="col-100 tablet-80">
                    <f7-list no-hairlines-md form>
                        <!-- IMPRESORAS -->
                        <f7-list-item
                            title="Impresora Bluetooth"
                            class="select-impresora"
                            smart-select
                            :smart-select-params="ssParams"
                        >
                            <select
                                v-model="selectedKeyModel"
                                @change="onPrinterChange"
                                :disabled="!isAndroid || loading"
                            >
                                <option value="" disabled>
                                    {{ ssLabel() }}
                                </option>

                                <option
                                    v-if="printers.length === 0"
                                    value=""
                                    disabled
                                >
                                    No se encontraron impresoras
                                </option>

                                <option
                                    v-for="p in printers"
                                    :key="p.key"
                                    :value="p.key"
                                >
                                    {{ p.label }}
                                </option>
                            </select>
                        </f7-list-item>

                        <f7-list-item
                            v-if="currentName"
                            title="Impresora seleccionada"
                        >
                            <template #after>
                                <span class="chip chip-outline">
                                    <span class="chip-media">
                                        <f7-icon f7="printer"></f7-icon>
                                    </span>
                                    <span class="chip-label">
                                        {{ currentName }}
                                        <span v-if="currentAddr"
                                            >({{ currentAddr }})</span
                                        >
                                    </span>
                                </span>
                            </template>
                        </f7-list-item>

                        <!-- ANCHO / PAPER WIDTH -->
                        <f7-list-item
                            title="Ancho de impresión"
                            class="select-paperwidth"
                            smart-select
                            :smart-select-params="ssParams"
                        >
                            <select
                                v-model="selectedWidthModel"
                                @change="onWidthChange"
                                :disabled="!isAndroid || loading"
                            >
                                <option value="" disabled>
                                    {{ ssLabelWidth() }}
                                </option>
                                <!-- Valores que entiende la librería -->
                                <option value="32">57–58 mm</option>
                                <option value="48">80 mm</option>
                            </select>
                        </f7-list-item>

                        <f7-list-item class="no-padding">
                            <template #inner>
                                <div class="button-grid">
                                    <div class="button-row">
                                        <f7-button
                                            small
                                            outline
                                            :disabled="loading || !isAndroid"
                                            @click="refreshPrinters"
                                        >
                                            <f7-icon
                                                f7="arrow_clockwise"
                                            ></f7-icon
                                            >&nbsp;Actualizar
                                        </f7-button>

                                        <f7-button
                                            small
                                            outline
                                            :disabled="loading || !selected"
                                            @click="testPrint"
                                        >
                                            <f7-icon f7="doc_text"></f7-icon
                                            >&nbsp;Probar impresión
                                        </f7-button>
                                    </div>

                                    <div class="button-row">
                                        <f7-button
                                            small
                                            outline
                                            color="red"
                                            :disabled="loading"
                                            @click="clearSelection"
                                        >
                                            <f7-icon f7="xmark_circle"></f7-icon
                                            >&nbsp;Quitar selección
                                        </f7-button>

                                        <f7-button
                                            small
                                            outline
                                            color="orange"
                                            :disabled="loading"
                                            @click="disconnect"
                                        >
                                            <f7-icon f7="bolt"></f7-icon
                                            >&nbsp;Desconectar
                                        </f7-button>
                                    </div>
                                </div>
                            </template>
                        </f7-list-item>

                        <f7-list-item
                            v-if="errorMsg"
                            class="li-alert no-padding"
                        >
                            <template #inner>
                                <div class="alert alert-danger">
                                    <i class="f7-icons"
                                        >exclamationmark_circle</i
                                    >
                                    {{ errorMsg }}
                                </div>
                            </template>
                        </f7-list-item>
                    </f7-list>
                </div>
            </div>
        </f7-block>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import { Capacitor } from "@capacitor/core";
import store from "@/js/store";
import {
    listPrinters,
    printTextSafe,
    disconnectPrinter,
} from "@/app/services/PrinterService";

export default {
    name: "ConfiguracionImpresora",
    data() {
        return {
            ssParams: {
                openIn: "popup",
                searchbar: true,
                closeOnSelect: true,
                sheetCloseLinkText: "Listo",
                searchbarPlaceholder: "Buscar",
            },
            printers: [], // [{ key, name, address, label }]
            loading: false,
            errorMsg: "",
            selectedKeyModel: "", // name|address
            selectedWidthModel: "", // "32" | "48"
        };
    },
    computed: {
        isAndroid() {
            return Capacitor.getPlatform() === "android";
        },
        currentName() {
            return store.state?.printer?.name || null;
        },
        currentAddr() {
            return store.state?.printer?.address || null;
        },
        selected() {
            return !!this.currentName;
        },
        currentPaperWidth() {
            return store.state?.printer?.paperWidth ?? null;
        },
        selectedKeyFromStore() {
            return this.currentName
                ? `${this.currentName}|${this.currentAddr || ""}`
                : "";
        },
    },
    async created() {
        // Hidratar store (persistencia)
        if (!store.state.ready) {
            try {
                await store.dispatch("hydrate");
            } catch {}
        }

        await this.refreshPrinters();

        // Aplica selección persistida al v-model (NO hacemos setValue del SmartSelect)
        this.selectedKeyModel = this.selectedKeyFromStore || "";

        // Paper width persistido
        this.selectedWidthModel = this.currentPaperWidth
            ? String(this.currentPaperWidth)
            : "";

        await this.$nextTick();
        this.updateSSLabel(); // Solo actualiza el texto visible
        this.updateSSWidthLabel(); // etiqueta de ancho
    },
    methods: {
        ssLabel() {
            if (!this.isAndroid) return "No disponible en este dispositivo";
            if (this.loading) return "Buscando impresoras…";
            if (this.currentName) {
                return this.currentAddr
                    ? `Impresora predeterminada: ${this.currentName} (${this.currentAddr})`
                    : `Impresora predeterminada: ${this.currentName}`;
            }
            if (this.printers.length === 0)
                return "No se encontraron impresoras";
            return "Seleccione una impresora…";
        },

        ssLabelWidth() {
            if (!this.isAndroid) return "No disponible en este dispositivo";
            if (this.loading) return "Cargando…";
            if (this.currentPaperWidth)
                return `Ancho actual: ${this.currentPaperWidth}`;
            return "Seleccione ancho…";
        },

        normalizeList(raw) {
            const arr = Array.isArray(raw) ? raw : [];
            return arr
                .map((item) => {
                    const name =
                        typeof item === "string" ? item : item?.name ?? "";
                    const address =
                        typeof item === "string" ? null : item?.address ?? null;
                    const key = `${name}|${address || ""}`;
                    const label = address ? `${name} (${address})` : name;
                    return { key, name, address, label };
                })
                .filter((p) => p.name);
        },

        selectedLabel() {
            if (!this.selectedKeyModel) return this.ssLabel();
            const item = this.printers.find(
                (p) => p.key === this.selectedKeyModel
            );
            return item ? item.label : this.ssLabel();
        },

        selectedWidthHuman() {
            if (!this.selectedWidthModel) return this.ssLabelWidth();
            return this.selectedWidthModel === "48"
                ? "80 mm (paperWidth 48)"
                : "57–58 mm (paperWidth 32)";
        },

        // Intenta actualizar el texto del Smart Select; si aún no existe, reintenta
        updateSSLabel() {
            const doUpdate = () => {
                const ss = f7.smartSelect?.get?.(
                    ".select-impresora .smart-select"
                );
                if (!ss) return false;
                ss.setValueText(this.selectedLabel()); // ← texto correcto del item seleccionado
                return true;
            };

            if (doUpdate()) return;
            setTimeout(() => {
                doUpdate();
            }, 50);
        },

        updateSSWidthLabel() {
            const doUpdate = () => {
                const ss = f7.smartSelect?.get?.(
                    ".select-paperwidth .smart-select"
                );
                if (!ss) return false;
                ss.setValueText(this.selectedWidthHuman());
                return true;
            };
            if (doUpdate()) return;
            setTimeout(doUpdate, 50);
        },

        async refreshPrinters() {
            if (!this.isAndroid) {
                this.updateSSLabel();
                return;
            }
            this.errorMsg = "";
            this.loading = true;
            this.updateSSLabel(); // “Buscando impresoras…”
            const dlg = f7.dialog.preloader("Buscando impresoras…");
            try {
                const raw = await listPrinters();
                this.printers = this.normalizeList(raw);
            } catch (e) {
                console.error(e);
                this.errorMsg =
                    typeof e === "string"
                        ? e
                        : e?.message || "No se pudo listar impresoras.";
                this.printers = [];
            } finally {
                this.loading = false;
                try {
                    dlg.close();
                } catch {}
                await this.$nextTick();
                this.updateSSLabel(); // ← usará selectedLabel() si hay selección
            }
        },

        async onPrinterChange(e) {
            const key = e.target.value; // name|address
            const [name, addressRaw] = String(key).split("|");
            const address = addressRaw || null;

            // Persistir en store
            await store.dispatch("setPrinter", { name, address });

            // v-model ya quedó con el valor; aquí solo actualizamos la etiqueta visible
            await this.$nextTick();
            this.updateSSLabel();

            f7.toast
                .create({ text: "Impresora guardada", closeTimeout: 1200 })
                .open();
        },

        async onWidthChange(e) {
            const val = Number(e?.target?.value || 0); // 32 | 48
            if (!val) return;
            // Persiste en store (usa paperWidth como key canónica)
            await store.dispatch("setPrinterWidth", { paperWidth: val });

            await this.$nextTick();
            this.updateSSWidthLabel();

            f7.toast
                .create({ text: "Ancho guardado", closeTimeout: 1200 })
                .open();
        },

        async testPrint() {
            if (!this.selected) {
                f7.dialog.alert("Seleccione una impresora primero.");
                return;
            }
            const dlg = f7.dialog.preloader("Imprimiendo…");
            try {
                await printTextSafe("Prueba de impresión\n\n"); // se autoconecta por NOMBRE
                f7.toast
                    .create({ text: "Impresión enviada", closeTimeout: 1500 })
                    .open();
            } catch (e) {
                console.error(e);
                f7.dialog.alert(e?.message || "Error al imprimir la prueba.");
            } finally {
                try {
                    dlg.close();
                } catch {}
            }
        },

        async disconnect() {
            const dlg = f7.dialog.preloader("Desconectando…");
            try {
                await disconnectPrinter();
                f7.toast
                    .create({ text: "Desconectado", closeTimeout: 1200 })
                    .open();
            } catch (e) {
                console.warn("Desconectar:", e);
            } finally {
                try {
                    dlg.close();
                } catch {}
            }
        },

        async clearSelection() {
            await store.dispatch("clearPrinter");
            // Si quieres reset TOTAL (incluye ancho), descomenta:
            // await store.dispatch("clearPrinterWidth");

            this.selectedKeyModel = ""; // limpia el v-model
            // this.selectedWidthModel = ""; // si activas clearPrinterWidth, limpia también el v-model

            this.updateSSLabel(); // solo texto del SmartSelect impresora
            this.updateSSWidthLabel(); // texto del SmartSelect ancho

            f7.toast
                .create({ text: "Selección eliminada", closeTimeout: 1200 })
                .open();
        },

        back() {
            f7.views.main?.router?.navigate("/home/?tab=menu", {
                reloadAll: true,
            });
        },
    },
};
</script>

<style scoped>
.page-configuracion {
    padding-bottom: 12px;
}
.text-muted {
    color: #6c757d;
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

/* 2 filas x 2 columnas; ancho uniforme */
.button-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
}
.button-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
}
.button-row :deep(.button) {
    width: 100%;
    box-sizing: border-box;
}
</style>
