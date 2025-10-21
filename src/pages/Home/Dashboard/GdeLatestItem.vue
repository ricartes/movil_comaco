<template>
    <f7-list-item
        class="card"
        :title="folioText(item)"
        @click="$emit('open', item)"
    >
        <template #media>
            <f7-icon f7="doc_text_fill" />
        </template>

        <template #after>
            {{ formatFecha(item.fechaEmision) }}
        </template>

        <!-- 👇 Estado + Unidad de medida -->
        <template #subtitle>
            <div class="subtitle-line">
                <span
                    class="chip chip-small"
                    :class="estadoChipClass(item?.estado)"
                >
                    <span class="chip-label">{{
                        estadoTexto(item?.estado)
                    }}</span>
                </span>

                <span class="chip chip-outline color-blue chip-small">
                    {{ umText(item?.unidadMedida) }}
                </span>
            </div>
        </template>
    </f7-list-item>
</template>

<script>
export default {
    name: "GdeLatestItem",
    props: {
        item: { type: Object, required: true },
        estadosGuia: { type: Object, required: true },
    },
    emits: ["open"],
    methods: {
        folioText(g) {
            return g?.folio != null
                ? `Folio #${g.folio}`
                : "Sin folio asignado";
        },

        estadoTexto(estado) {
            if (estado && typeof estado === "object") {
                return estado.texto || estado.id || "SIN ESTADO";
            }
            const up = String(estado || "").toUpperCase();
            const match = Object.values(this.estadosGuia || {}).find(
                (e) => String(e.id).toUpperCase() === up
            );
            return match?.texto || up || "SIN ESTADO";
        },
        estadoChipClass(estado) {
            const up =
                typeof estado === "string"
                    ? estado.toUpperCase()
                    : String(estado?.id || "").toUpperCase();
            const match = Object.values(this.estadosGuia || {}).find(
                (e) =>
                    String(e.id).toUpperCase() === up ||
                    String(e.texto || "").toUpperCase() ===
                        String(estado?.texto || "").toUpperCase()
            );
            if (!match) return "chip-fill color-gray";
            return `${match.estilo || "chip-fill"} ${
                match.color || "color-gray"
            }`;
        },
        umText(um) {
            return String(um || "—").toUpperCase();
        },
    },
};
</script>

<style scoped>
.subtitle-line {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}
.chip-small {
    --f7-chip-padding-horizontal: 8px;
    --f7-chip-height: 20px;
    font-size: 11px;
}
</style>
