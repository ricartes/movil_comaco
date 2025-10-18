<template>
    <div>
        <f7-block-title class="!mb-2">Últimas 10 guías</f7-block-title>
        <f7-list strong inset media-list class="latest-list">
            <GdeLatestItem
                v-for="g in items"
                :key="`${g.empId}-${g.folio}`"
                :item="g"
                :estados-guia="estadosGuia"
                @open="$emit('open', g)"
            />
        </f7-list>
    </div>
</template>

<script>
import GdeLatestItem from "./GdeLatestItem.vue";

export default {
    name: "LatestGuides",
    components: { GdeLatestItem },
    emits: ["open"],
    props: {
        items: { type: Array, required: true },
        // 👇 pásame el objeto completo de estados desde config.parametros.estadosGuia
        estadosGuia: { type: Object, required: true },
    },
};
</script>

<style scoped>
.latest-list :deep(.item-inner) {
    align-items: center;
    --f7-list-item-padding-vertical: 10px;
}
</style>
