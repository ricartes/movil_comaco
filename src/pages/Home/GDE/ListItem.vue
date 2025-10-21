<template>
    <f7-list-item
        class="card"
        :title="folioText(item)"
        @click="$emit('open', item)"
    >
        <template #media>
            <f7-icon f7="doc_text_fill" />
        </template>

        <template #after>{{ formatFecha(item.createdAt) }}</template>

        <template #text>
            <div class="line">
                <!-- Estado -->
                <span
                    class="chip chip-small chip-uniform"
                    :class="
                        estadoChipClass(item?.estado?.id, item?.estado?.texto)
                    "
                >
                    <span class="chip-label">{{
                        item?.estado?.texto ?? "SIN ESTADO"
                    }}</span>
                </span>

                <!-- UM + volumen -->
                <span class="chip chip-fill chip-small chip-uniform color-blue">
                    {{ chipUnidadConVolumen(item) }}
                </span>
            </div>

            <!-- Producto en su propia línea -->
            <div class="product">
                {{ item.producto?.nombreProducto ?? "" }}
            </div>
        </template>

        <template #footer>
            <span class="muted">Origen: {{ item.predio?.predio ?? "" }}</span>
            <span class="muted">
                Destino:
                {{ item.cliente?.razonSocialCliente ?? "" }}
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
            return g?.folio != null
                ? `Folio ${g.folio}`
                : "Sin folio asignado.";
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
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 6px; /* despega de "Folio" */
    padding-right: 96px; /* reserva espacio para la fecha (#after) */
}

/* Importante: mostrar todo el texto del slot #text */
:deep(.item-text) {
    white-space: normal;
    overflow: visible;
    max-height: none; /* quita el clamp */
    -webkit-line-clamp: unset;
}

/* Producto debajo de los chips */
.product {
    margin-top: 4px;
    font-size: 13px;
    font-weight: 500;
    color: #111827;
}

/* Texto “muted” del footer tal como lo tenías */
.muted {
    color: #6b7280;
    font-size: 12px;
    display: block;
    margin-top: 2px;
}

/* Chips uniformes (mismo ancho visual) */
.chip-small {
    --f7-chip-padding-horizontal: 8px;
    --f7-chip-height: 22px;
    font-size: 11px;
    line-height: 1;
}
.chip-uniform {
    min-width: 92px; /* iguala ancho visual entre chips */
    justify-content: center;
    text-align: center;
    white-space: nowrap;
}

/* Un poco de aire vertical general */
:deep(.item-inner) {
    padding-top: 10px;
    padding-bottom: 12px;
}

/* Fecha alineada arriba y con espacio del título */
:deep(.item-title-row .item-after) {
    margin-left: 8px;
    align-self: flex-start;
}

/* Responsive: reduce el colchón derecho en pantallas estrechas */
@media (max-width: 420px) {
    .line {
        padding-right: 80px;
    }
}
</style>
