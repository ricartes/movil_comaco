<template>
    <f7-list-item
        class="card"
        :title="folioText(item)"
        @click="$emit('open', item)"
    >
        <template #media><f7-icon f7="doc_text_fill" /></template>
        <template #after>{{ formatFecha(item.createdAt) }}</template>

        <template #subtitle>
            <span
                class="chip chip-small"
                :class="estadoChipClass(item?.estado?.id, item?.estado?.texto)"
            >
                <span class="chip-label">{{
                    item?.estado?.texto ?? "SIN ESTADO"
                }}</span>
            </span>
        </template>

        <template #text>
            <div class="line">
                <span class="chip chip-fill color-blue">{{
                    chipUnidadConVolumen(item)
                }}</span>
                <span class="muted">{{
                    item.producto?.nombreProducto ?? ""
                }}</span>
            </div>
        </template>

        <template #footer>
            <span class="muted">Origen: {{ item.predio?.predio ?? "" }}</span
            ><br />
            <span class="muted">
                Destino: {{ item.cliente?.razonSocialCliente ?? "" }}
                {{ item.destino?.destinoCliente ?? "" }}
            </span>
        </template>
    </f7-list-item>
</template>

<script>
import config from "@/Common/json/config.json";

export default {
    name: "GdeListItem",
    props: {
        item: { type: Object, required: true },
        estadosGuia: { type: Object, required: true },
    },
    emits: ["open"],
    methods: {

        folioText(g) {
            return ` ${
                g?.folio != null ? `Folio ${g.folio}` : "Sin folio asignado."
            }`;
        },
        estadoChipClass(id, texto) {
            const estados = this.estadosGuia || {};
            const upId = (id || "").toUpperCase();
            const upTxt = (texto || "").toUpperCase();
            const e = Object.values(estados).find(
                (s) =>
                    (s.id && String(s.id).toUpperCase() === upId) ||
                    (s.texto && String(s.texto).toUpperCase() === upTxt)
            );
            if (!e) return "chip-fill color-gray";
            return `${e.estilo || "chip-fill"} ${e.color || "color-gray"}`;
        },
        chipUnidadConVolumen(g) {
            const U = config.parametros.unidadesMedida;
            const um = (g.producto?.unidadMedida || "").toUpperCase();
            const v = this.volumenSegunUM(g);
            if (v == null || isNaN(Number(v))) return um;
            const decs = um === U.MR ? 3 : 2;
            return `${Number(v).toFixed(decs)} ${um}`;
        },
        volumenSegunUM(g) {
            const um = (g.producto?.unidadMedida || "").toUpperCase();
            const t = g.totales || {};
            const U = config.parametros.unidadesMedida;
            switch (um) {
                case U.MR:
                    return t.mr?.volumen ?? null;
                case U.M3:
                    return t.m3?.volumen ?? null;
                case U.TON:
                case U.BDMT:
                case U.M3ST:
                    return t.ton?.volumen ?? null;
                default:
                    return (
                        t.m3?.volumen ?? t.mr?.volumen ?? t.ton?.volumen ?? null
                    );
            }
        },
    },
};
</script>

<style scoped>
.line {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}
.muted {
    color: #6b7280;
    font-size: 12px;
}
.chip-small {
    --f7-chip-padding-horizontal: 8px;
    --f7-chip-height: 20px;
    font-size: 11px;
}
</style>
