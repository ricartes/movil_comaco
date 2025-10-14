<!-- GdeFilters.vue -->
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
                    <f7-list-input
                        label="Estado"
                        type="select"
                        placeholder="Selecciona estado(s)"
                        multiple
                        v-model:value="local.estados"
                    >
                        <template #media><f7-icon f7="list_bullet" /></template>
                        <option :value="estadosGuia.PROVISORIA.id">
                            {{ estadosGuia.PROVISORIA.texto }}
                        </option>
                        <option :value="estadosGuia.BORRADOR.id">
                            {{ estadosGuia.BORRADOR.texto }}
                        </option>
                        <option :value="estadosGuia.EMITIDA.id">
                            {{ estadosGuia.EMITIDA.texto }}
                        </option>
                        <option :value="estadosGuia.ENVIADA.id">
                            {{ estadosGuia.ENVIADA.texto }}
                        </option>
                        <option :value="estadosGuia.NULA.id">
                            {{ estadosGuia.NULA.texto }}
                        </option>
                    </f7-list-input>

                    <!-- Fechas -->
                    <f7-list-input
                        label="Desde"
                        type="date"
                        clear-button
                        v-model:value="local.desde"
                        :input-attrs="{ max: local.hasta || undefined }"
                    />
                    <f7-list-input
                        label="Hasta"
                        type="date"
                        clear-button
                        v-model:value="local.hasta"
                        :input-attrs="{ min: local.desde || undefined }"
                    />

                    <!-- Nº Guía -->
                    <f7-list-input
                        label="Nº Guía"
                        type="number"
                        placeholder="(opcional)"
                        clear-button
                        v-model:value="local.folio"
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
                            @click="$emit('clear')"
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
export default {
    name: "GdeFilters",
    props: {
        estadosGuia: { type: Object, required: true },
        loading: { type: Boolean, default: false },
        modelValue: {
            type: Object,
            default: () => ({
                estados: [],
                desde: null,
                hasta: null,
                folio: "",
            }),
        },
    },
    emits: ["update:modelValue", "apply", "clear", "togglePtr"],
    computed: {
        // Proxy para v-model del objeto de filtros
        local: {
            get() {
                return this.modelValue;
            },
            set(v) {
                this.$emit("update:modelValue", v);
            },
        },
        // Calendar params SIEMPRE con array ([Date] | [])
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
