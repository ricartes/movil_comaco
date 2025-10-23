<template>
    <f7-card class="mb-2">
        <f7-card-content class="p-0">
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th class="label-cell">GD.</th>
                            <th class="numeric-cell">
                                Volumen ({{ unidad || "—" }})
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr v-for="(f, i) in filasOrdenadas" :key="i">
                            <td class="label-cell">{{ f.folio }}</td>
                            <td class="numeric-cell">
                                {{ formateaVolumen(f.volumen) }}
                            </td>
                        </tr>
                    </tbody>

                    <tfoot>
                        <tr>
                            <td class="fw-600">Volumen</td>
                            <td class="mono text-align-right fw-600">
                                {{ formateaVolumen(subtotal) }}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </f7-card-content>
    </f7-card>
</template>

<script>
export default {
    name: "TablaGDVolumen",
    props: {
        filas: { type: Array, required: true }, // [{ folio, volumen }]
        unidad: { type: String, default: "" }, // "MR" | "M3" | "TON"...
        subtotal: { type: Number, default: 0 },
        decimales: { type: Number, default: 2 },
    },
    computed: {
        filasOrdenadas() {
            // por si no vienen ya ordenadas
            return [...(this.filas || [])].sort(
                (a, b) => (a?.folio ?? 0) - (b?.folio ?? 0)
            );
        },
    },
};
</script>

<style scoped>
.tabla-gd :deep(table) {
    width: 100%;
}
.col-gd {
    width: 40%;
}
.col-vol {
    width: 60%;
}
.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        "Liberation Mono", monospace;
}
tfoot tr {
    border-top: 1px solid var(--f7-list-item-border-color, #ececec);
}
.fw-600 {
    font-weight: 600;
}
</style>
