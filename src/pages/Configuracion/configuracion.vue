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

        <f7-block-title>Configuración de la impresora</f7-block-title>

        <div class="text-muted" v-if="!isAndroid">
            <p>
                <f7-icon f7="info_circle"></f7-icon>
                La detección de impresoras Bluetooth está disponible solo en
                Android.
            </p>
        </div>

        <f7-list form inset strong>
            <!-- IMPRESORAS -->
            <f7-list-item
                ref="ssPrinter"
                title="Impresora Bluetooth"
                class="select-impresora"
                smart-select
                :smart-select-params="ssParams"
                :disabled="!isAndroid || loading"
            >
                <select
                    v-model="selectedKeyModel"
                    @change="onPrinterChange"
                    :disabled="!isAndroid || loading"
                >
                    <option value="" disabled>
                        {{ ssLabel() }}
                    </option>

                    <option v-for="p in printers" :key="p.key" :value="p.key">
                        {{ p.label }}
                    </option>
                </select>
            </f7-list-item>

            <!-- MODO DE CONEXIÓN -->
            <f7-list-item
                ref="ssMode"
                title="Modo de conexión"
                class="select-printermode"
                smart-select
                :smart-select-params="ssParams"
                :disabled="!isAndroid || loading"
            >
                <select
                    v-model="selectedModeModel"
                    @change="onModeChange"
                    :disabled="!isAndroid || loading || printers.length === 0"
                >
                    <option value="" disabled>Seleccione modo…</option>
                    <option value="spp">Bluetooth normal (recomendado)</option>
                    <option value="ble">Bluetooth de bajo consumo</option>
                </select>
            </f7-list-item>

            <f7-list-item v-if="currentName" title="Impresora seleccionada">
                <template #after>
                    <span class="chip chip-outline">
                        <span class="chip-media">
                            <f7-icon f7="printer"></f7-icon>
                        </span>
                        <span class="chip-label">
                            {{ currentName }}
                            <span v-if="currentAddr">({{ currentAddr }})</span>
                        </span>
                    </span>
                </template>
            </f7-list-item>

            <!-- ANCHO / PAPER WIDTH -->
            <f7-list-item
                ref="ssWidth"
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

            <f7-list-item v-if="errorMsg" class="li-alert no-padding">
                <template #inner>
                    <div class="alert alert-danger">
                        <i class="f7-icons">exclamationmark_circle</i>
                        {{ errorMsg }}
                    </div>
                </template>
            </f7-list-item>
        </f7-list>

        <f7-block strong inset>
            <div class="alert alert-info">
                <i class="f7-icons">info_circle</i>
                <div>
                    <strong>Modo de conexión de la impresora</strong><br />
                    <small>
                        • <b>Bluetooth normal</b>: recomendado para la mayoría
                        de las impresoras térmicas.<br />
                        • <b>Bluetooth de bajo consumo</b>: usar solo si la
                        impresora no funciona con el modo normal.<br />
                        <span class="text-muted">
                            Si no estás seguro, utiliza <b>Bluetooth normal</b>.
                        </span>
                    </small>
                </div>
            </div>
        </f7-block>

        <f7-block-title>Opciones de la impresora</f7-block-title>
        <f7-list inset strong>
            <!-- Actualizar -->
            <f7-list-item
                link
                @click="refreshPrinters"
                title="Actualizar"
                :disabled="loading || !isAndroid"
            >
                <template #media>
                    <f7-icon f7="arrow_clockwise"></f7-icon>
                </template>
            </f7-list-item>

            <!-- Comprobar permisos Bluetooth -->
            <f7-list-item
                link
                @click="checkBluetoothPermissions"
                title="Comprobar permisos Bluetooth"
                :disabled="loading || !isAndroid"
            >
                <template #media>
                    <f7-icon f7="shield_checkmark"></f7-icon>
                </template>
            </f7-list-item>

            <!-- Probar impresión -->
            <f7-list-item
                link
                @click="testPrint"
                title="Probar impresión"
                :disabled="loading || !hasSelection"
            >
                <template #media>
                    <f7-icon f7="doc_text"></f7-icon>
                </template>
            </f7-list-item>

            <!-- Quitar selección -->
            <f7-list-item
                link
                @click="clearSelection"
                title="Quitar selección"
                class="text-red-600"
                :disabled="loading"
            >
                <template #media>
                    <f7-icon f7="xmark_circle"></f7-icon>
                </template>
            </f7-list-item>

            <!-- Desconectar -->
            <f7-list-item
                link
                @click="disconnect"
                title="Desconectar"
                class="text-orange-600"
                :disabled="loading"
            >
                <template #media>
                    <f7-icon f7="bolt"></f7-icon>
                </template>
            </f7-list-item>
        </f7-list>

        <f7-block-title>Integración de guías Forestruck</f7-block-title>
        <f7-list inset strong v-if="habilitaIntegracionForestruck">
            <f7-list-item title="Carpeta de intercambio">
                <template #after>
                    <span class="chip chip-outline" v-if="guidesConfigured">
                        <span class="chip-media"
                            ><f7-icon f7="folder"></f7-icon
                        ></span>
                        <span class="chip-label">{{ guidesDisplayPath }}</span>
                    </span>
                    <span v-else class="text-muted">No configurada</span>
                </template>
            </f7-list-item>

            <f7-list-item
                link
                @click="seleccionarCarpetaGuias"
                :title="
                    guidesConfigured ? 'Cambiar carpeta' : 'Seleccionar carpeta'
                "
                :disabled="importGuidesLoading || !isAndroid"
            >
                <template #media
                    ><f7-icon f7="folder_badge_plus"></f7-icon
                ></template>
            </f7-list-item>

            <f7-list-item
                link
                @click="testGuidesFolder"
                title="Probar acceso"
                :disabled="importGuidesLoading || !guidesConfigured"
            >
                <template #media
                    ><f7-icon f7="checkmark_shield"></f7-icon
                ></template>
            </f7-list-item>

            <f7-list-item
                link
                @click="clearGuidesFolder"
                title="Quitar configuración"
                class="text-red-600"
                :disabled="importGuidesLoading || !guidesConfigured"
            >
                <template #media><f7-icon f7="trash"></f7-icon></template>
            </f7-list-item>

            <f7-list-item class="li-alert no-padding" v-if="!guidesConfigured">
                <template #inner>
                    <div class="alert alert-warning">
                        <i class="f7-icons">info_circle</i>
                        Seleccione la carpeta donde el sistema externo dejará
                        los archivos JSON. Este permiso se solicita una sola
                        vez.
                    </div>
                </template>
            </f7-list-item>
        </f7-list>

        <f7-block v-else
            >Funcionalidad en desarrollo. Disponible en nuevas
            versiones.</f7-block
        >
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import { Capacitor } from "@capacitor/core";
import store from "@/js/store";
import {
    listPrinters,
    printRawText,
    disconnectPrinter,
} from "@/app/services/Printer";

import { ensureBluetoothPermissions } from "@/app/helpers/bluetooth-permissions";
import { StorageAccess } from "@/app/plugins/StorageAccess";

import config from "@/Common/json/config.json";
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
            importGuidesLoading: false,
            modeTick: 0,
            selectedModeModel: "", // 'spp' | 'ble'
            guidesTick: 0,
            printerTick: 0,
            widthTick: 0,
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
        habilitaIntegracionForestruck() {
            return !!config?.parametros?.habilitaIntegracionForestruck;
        },

        hasSelection() {
            // usa v-model (reactivo) y, por si viene desde la persistencia, cae al store
            return !!this.selectedKeyModel || !!this.currentName;
        },
        currentPaperWidth() {
            return store.state?.printer?.paperWidth ?? null;
        },
        currentMode() {
            // Si el usuario ya eligió modo en esta sesión, usa eso
            if (this.selectedModeModel) {
                return this.selectedModeModel;
            }
            // fallback al store (hidratar / persistencia)
            return store.state?.printer?.mode || null;
        },

        selectedKeyFromStore() {
            return this.currentName
                ? `${this.currentName}|${this.currentAddr || ""}`
                : "";
        },
        guidesConfigured() {
            this.guidesTick;
            return !!store.state?.importGuides?.treeUri;
        },
        guidesDisplayPath() {
            this.guidesTick;
            return store.state?.importGuides?.displayPath || "No configurada";
        },
        guidesTreeUri() {
            this.guidesTick;
            return store.state?.importGuides?.treeUri || null;
        },
    },

    async created() {
        // 1) Hidratar store (persistencia)
        if (!store.state.ready) {
            try {
                await store.dispatch("hydrate");
            } catch {}
        }

        // 2) Precargar modelos DESDE store (antes de listar)
        this.selectedKeyModel = this.selectedKeyFromStore || "";
        this.selectedWidthModel = this.currentPaperWidth
            ? String(this.currentPaperWidth)
            : "";
        this.selectedModeModel = this.currentMode
            ? String(this.currentMode)
            : "";

        // 3) Ahora sí: listar impresoras
        await this.refreshPrinters();

        // 4) Forzar label visible (ya con selección cargada)
        await this.$nextTick();
        this.updateSSLabel();
        this.updateSSModeLabel();
        this.updateSSWidthLabel();
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
            const out = [];
            if (!Array.isArray(raw)) return out;

            // el plugin devuelve [name, mac, type, name, mac, type, ...]
            for (let i = 0; i < raw.length; i += 3) {
                const name = raw[i];
                const address = raw[i + 1];
                const type = raw[i + 2]; // opcional

                if (typeof name === "string" && typeof address === "string") {
                    out.push({
                        key: `${name}|${address}`,
                        name,
                        address,
                        type,
                        label: `${name} (${address})`,
                    });
                }
            }
            return out;
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

        ssLabelMode() {
            if (!this.isAndroid) return "No disponible en este dispositivo";
            if (this.loading) return "Cargando…";
            if (this.currentMode === "spp")
                return "Modo actual: Bluetooth normal (recomendado)";
            if (this.currentMode === "ble")
                return "Modo actual: Bluetooth de bajo consumo";
            return "Seleccione modo de conexión…";
        },
        selectedModeHuman() {
            if (!this.selectedModeModel) return this.ssLabelMode();

            return this.selectedModeModel === "ble"
                ? "Bluetooth de bajo consumo"
                : "Bluetooth normal (recomendado)";
        },

        updateSSLabel() {
            const ss = f7.smartSelect.get(".select-impresora .smart-select");
            ss && ss.setValueText(this.selectedLabel());
        },

        updateSSModeLabel() {
            const ss = f7.smartSelect.get(".select-printermode .smart-select");
            ss && ss.setValueText(this.selectedModeHuman());
        },

        updateSSWidthLabel() {
            const ss = f7.smartSelect.get(".select-paperwidth .smart-select");
            ss && ss.setValueText(this.selectedWidthHuman());
        },

        async onModeChange(e) {
            const mode = String(e?.target?.value || "");
            if (!["spp", "ble"].includes(mode)) return;

            try {
                await disconnectPrinter();
            } catch {}

            await store.dispatch("setPrinterMode", { mode });

            await this.$nextTick();
            this.updateSSModeLabel();

            f7.toast
                .create({ text: "Modo guardado", closeTimeout: 1200 })
                .open();
        },

        async refreshPrinters() {
            if (!this.isAndroid) {
                this.updateSSLabel();
                return;
            }

            this.errorMsg = "";
            this.loading = true;
            //this.updateSSLabel(); // “Buscando impresoras…”
            const dlg = f7.dialog.preloader("Buscando impresoras…");

            try {
                // 🟢 1. Verificar y solicitar permisos Bluetooth antes de listar
                const ok = await ensureBluetoothPermissions({ needScan: true });

                // ❌ 2. Si el usuario negó o no están disponibles
                if (!ok) {
                    this.errorMsg = "No se otorgaron permisos de Bluetooth.";
                    this.printers = [];

                    // Abre configuración del sistema (por si el usuario marcó "No volver a preguntar")
                    try {
                        const { App } = await import("@capacitor/app");
                        await App.openSettings();
                    } catch (err) {
                        console.warn("No se pudo abrir Ajustes:", err);
                    }

                    return; // detiene el flujo
                }

                // 🔵 3. Si los permisos están concedidos, listar impresoras normalmente
                const raw = await listPrinters();
                this.printers = this.normalizeList(raw);

                this.printerTick++;
                if (this.printers.length === 0) {
                    this.errorMsg =
                        "No se encontraron impresoras Bluetooth emparejadas. " +
                        "Activa el Bluetooth y verifica que la impresora esté emparejada " +
                        "en los Ajustes del sistema.";
                }
            } catch (e) {
                const msg = String(e?.message || e || "").toUpperCase();
                if (msg.includes("NO BLUETOOTH DEVICE FOUND")) {
                    this.errorMsg =
                        "No hay dispositivos Bluetooth disponibles o el Bluetooth está apagado.";
                } else {
                    this.errorMsg =
                        typeof e === "string"
                            ? e
                            : e?.message || "No se pudo listar impresoras.";
                }
                this.printers = [];
            } finally {
                this.loading = false;
                try {
                    dlg.close();
                } catch {}
                await this.$nextTick();
                this.updateSSLabel(); // ← actualizar texto visible del SmartSelect
                this.updateSSModeLabel();
                this.updateSSWidthLabel();
            }
        },

        async checkBluetoothPermissions() {
            if (!this.isAndroid) {
                f7.dialog.alert(
                    "La verificación de Bluetooth está disponible solo en Android."
                );
                return;
            }

            this.errorMsg = "";
            const dlg = f7.dialog.preloader("Comprobando permisos…");

            try {
                // Solicita / valida permisos necesarios para escaneo
                const ok = await ensureBluetoothPermissions({ needScan: true });

                if (ok) {
                    f7.toast
                        .create({
                            text: "Permisos de Bluetooth: OK",
                            closeTimeout: 1500,
                        })
                        .open();
                    // opcional: refrescar lista automáticamente
                    // await this.refreshPrinters();
                } else {
                    this.errorMsg = "Permisos de Bluetooth no otorgados.";
                    f7.dialog.alert(
                        "No se otorgaron permisos de Bluetooth.\n" +
                            "Puedes habilitarlos en Ajustes del sistema (Bluetooth/Permisos)."
                    );

                    // opcional: abrir ajustes
                    try {
                        const { App } = await import("@capacitor/app");
                        await App.openSettings();
                    } catch (err) {
                        console.warn("No se pudo abrir Ajustes:", err);
                    }
                }
            } catch (e) {
                console.warn("checkBluetoothPermissions:", e);
                f7.dialog.alert(
                    e?.message || "No se pudo comprobar permisos de Bluetooth."
                );
            } finally {
                try {
                    dlg.close();
                } catch {}
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
            if (!this.hasSelection) {
                f7.dialog.alert("Seleccione una impresora primero.");
                return;
            }
            if (!this.currentMode) {
                f7.dialog.alert("Seleccione el modo de conexión.");
                return;
            }

            const dlg = f7.dialog.preloader("Imprimiendo…");
            try {
                await printRawText("¡ÁÉÑ! áéñ"); // Debe salir PERFECTO

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

            this.printerTick++;
            this.widthTick++;

            this.updateSSLabel(); // solo texto del SmartSelect impresora
            this.updateSSWidthLabel(); // texto del SmartSelect ancho

            f7.toast
                .create({ text: "Selección eliminada", closeTimeout: 1200 })
                .open();
        },

        async seleccionarCarpetaGuias() {
            if (!this.isAndroid) {
                f7.dialog.alert(
                    "Esta función está disponible solo en Android."
                );
                return;
            }
            this.ensureStorageAccess();

            this.importGuidesLoading = true;

            const dlg = f7.dialog.preloader("Seleccione la carpeta…");
            try {
                // Plugin Capacitor (lo implementaremos ahora)

                const res = await StorageAccess.pickFolder();
                // res: { treeUri, displayPath }

                if (!res?.treeUri) {
                    throw new Error("No se recibió una carpeta válida.");
                }

                await store.dispatch("setGuidesFolder", {
                    treeUri: res.treeUri,
                    displayPath: res.displayPath || "Carpeta seleccionada",
                });
                this.guidesTick++;
                await this.$nextTick();

                f7.toast
                    .create({ text: "Carpeta guardada", closeTimeout: 1200 })
                    .open();
            } catch (e) {
                f7.dialog.alert(
                    e?.message ||
                        "No se pudo seleccionar la carpeta. Inténtelo nuevamente."
                );
            } finally {
                try {
                    dlg.close();
                } catch {}
                this.importGuidesLoading = false;
            }
        },

        async testGuidesFolder() {
            if (!this.guidesTreeUri) {
                f7.dialog.alert("Primero seleccione una carpeta.");
                return;
            }

            this.ensureStorageAccess();

            this.importGuidesLoading = true;
            const dlg = f7.dialog.preloader("Probando acceso…");
            try {
                // lista solo JSON visibles (pendientes)
                const res = await StorageAccess.listJson({
                    treeUri: this.guidesTreeUri,
                });
                const files = res?.files || [];
                const count = Array.isArray(files) ? files.length : 0;
                const first = count > 0 ? `\nEj: ${files[0]?.name || ""}` : "";

                f7.dialog.alert(
                    `Acceso OK.\nArchivos JSON encontrados: ${count}${first}`
                );
            } catch (e) {
                console.warn("testGuidesFolder:", e);
                f7.dialog.alert(
                    e?.message ||
                        "No se pudo acceder a la carpeta. Vuelva a seleccionarla."
                );
            } finally {
                try {
                    dlg.close();
                } catch {}
                this.importGuidesLoading = false;
            }
        },

        async clearGuidesFolder() {
            const ok = await new Promise((resolve) => {
                f7.dialog.confirm(
                    "¿Desea quitar la configuración de la carpeta de intercambio?",
                    "Confirmar",
                    () => resolve(true),
                    () => resolve(false)
                );
            });

            if (!ok) return;

            await store.dispatch("clearGuidesFolder");

            this.guidesTick++; // 👈 fuerza update inmediato
            await this.$nextTick();

            f7.toast
                .create({ text: "Configuración eliminada", closeTimeout: 1200 })
                .open();
        },

        back() {
            f7.views.main?.router?.navigate("/home/?tab=menu", {
                reloadAll: true,
            });
        },
        ensureStorageAccess() {
            if (!this.isAndroid) {
                throw new Error("Disponible solo en Android.");
            }
            if (
                !StorageAccess ||
                typeof StorageAccess.pickFolder !== "function"
            ) {
                throw new Error(
                    "Plugin StorageAccess no está disponible. ¿Ejecutaste npx cap sync android?"
                );
            }
        },
    },

    watch: {
        selectedKeyModel() {
            this.$nextTick(() => this.updateSSLabel());
        },
        printers() {
            this.$nextTick(() => this.updateSSLabel());
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
.alert-warning {
    border: 1px solid #ffeeba;
    background: #fff3cd;
    color: #856404;
}
.alert-info {
    border: 1px solid #bee5eb;
    background: #e9f7fb;
    color: #0c5460;
}
.alert-info b {
    font-weight: 600;
}
</style>
