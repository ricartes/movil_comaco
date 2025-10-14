<template>
    <f7-list strong outline-ios dividers-ios inset-md accordion-list>
        <f7-list-item
            ref="acc"
            accordion-item
            title="Filtros"
            header
            @accordion:opened="$emit('togglePtr', false)"
            @accordion:closed="$emit('togglePtr', true)"
        >
            <f7-accordion-content>
                <f7-list
                    strong
                    inset
                    dividers
                    class="gde-filters no-margin-vertical"
                >
                    <!-- Estado -->
                    <f7-list-item
                        ref="ssEstado"
                        title="Estado"
                        class="estado-select"
                        smart-select
                        :smart-select-params="{
                            openIn: 'sheet',
                            multiple: true,
                            closeOnSelect: false,
                        }"
                    >
                        <!-- El v-model debe ir en el <select> -->
                        <select name="estado" multiple v-model="estadosLocal">
                            <option :value="estadosGuia.PROVISORIA?.id">
                                {{ estadosGuia.PROVISORIA?.texto }}
                            </option>
                            <option :value="estadosGuia.BORRADOR?.id">
                                {{ estadosGuia.BORRADOR?.texto }}
                            </option>
                            <option :value="estadosGuia.EMITIDA?.id">
                                {{ estadosGuia.EMITIDA?.texto }}
                            </option>
                            <option :value="estadosGuia.ENVIADA?.id">
                                {{ estadosGuia.ENVIADA?.texto }}
                            </option>
                            <option :value="estadosGuia.NULA?.id">
                                {{ estadosGuia.NULA?.texto }}
                            </option>
                        </select>
                    </f7-list-item>

                    <!-- Fechas -->
                    <f7-list-input
                        label="Desde"
                        type="date"
                        clear-button
                        :input-attrs="{
                            max: hastaLocal || undefined,
                            autocomplete: 'off',
                        }"
                        v-model:value="desdeLocal"
                    />
                    <f7-list-input
                        label="Hasta"
                        type="date"
                        clear-button
                        :input-attrs="{
                            min: desdeLocal || undefined,
                            autocomplete: 'off',
                        }"
                        v-model:value="hastaLocal"
                    />

                    <!-- Nº Guía -->
                    <f7-list-input
                        label="Nº Guía"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        placeholder="(opcional)"
                        clear-button
                        v-model:value="folioLocal"
                    />
                </f7-list>

                <f7-block class="gde-filters-actions">
                    <div class="gde-buttons-row">
                        <f7-button
                            large
                            fill
                            class="col-btn"
                            :disabled="loading"
                            @click="$emit('apply')"
                        >
                            {{ loading ? "Filtrando…" : "Aplicar" }}
                        </f7-button>
                        <f7-button
                            large
                            outline
                            class="col-btn"
                            :disabled="loading"
                            @click="limpiar"
                        >
                            {{ loading ? "Limpiando…" : "Limpiar" }}
                        </f7-button>
                    </div>
                </f7-block>
            </f7-accordion-content>
        </f7-list-item>
    </f7-list>
</template>

<script>
import { f7 } from "framework7-vue";
export default {
    name: "GdeFilters",
    props: {
        estadosGuia: { type: Object, required: true },
        loading: { type: Boolean, default: false },

        // v-models individuales
        estados: { type: Array, default: () => [] },
        desde: { type: [String, null], default: null }, // 'YYYY-MM-DD' | null
        hasta: { type: [String, null], default: null },
        folio: { type: String, default: "" },
    },
    emits: [
        "togglePtr",
        "apply",
        "clear",
        "update:estados",
        "update:desde",
        "update:hasta",
        "update:folio",
    ],
    computed: {
        estadosLocal: {
            get() {
                return this.estados;
            },
            set(v) {
                // normaliza: siempre array de strings
                const arr = Array.isArray(v) ? v : v ? [v] : [];
                this.$emit(
                    "update:estados",
                    arr.map((s) => String(s))
                );
            },
        },
        desdeLocal: {
            get() {
                return this.desde;
            },
            set(v) {
                this.$emit("update:desde", v || null);
            },
        },
        hastaLocal: {
            get() {
                return this.hasta;
            },
            set(v) {
                this.$emit("update:hasta", v || null);
            },
        },
        folioLocal: {
            get() {
                return this.folio;
            },
            set(v) {
                this.$emit(
                    "update:folio",
                    String(v || "").replace(/[^\d]/g, "")
                );
            },
        },
    },

    methods: {
        limpiar() {
            f7.smartSelect.get(".estado-select .smart-select").setValueText("");
            this.$emit("clear");
        },
    },
};
</script>

<style scoped>
.gde-filters-actions {
    margin: 8px 0;
}
.gde-buttons-row {
    display: flex;
    width: 100%;
    gap: 8px;
}
.col-btn {
    flex: 1;
    text-align: center;
}
</style>
