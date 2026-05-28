<template>
    <div class="detalle-ton-root">
        <f7-card>
            <f7-card-content>
                <table class="data-table" style="width: 100%">
                    <tbody>
                        <tr>
                            <td class="label-cell"><b>Producto:</b></td>
                            <td>{{ doc.producto.nombreProducto ?? "—" }}</td>
                        </tr>
                        <tr>
                            <td class="label-cell"><b>Precio unitario:</b></td>
                            <td class="value-cell">
                                <div class="price-with-badge">
                                    {{
                                        formatMoneyCLP(
                                            doc.precioProducto?.precio ?? 0
                                        )
                                    }}
                                    <f7-badge v-if="
                                        doc.precioProducto
                                            ?.indicadorPrecioPorDefecto
                                    " color="orange" class="badge-default">
                                        por defecto
                                    </f7-badge>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="label-cell">
                                <b>Ingreso
                                    {{
                                        doc.producto?.unidadMedida ?? "TON"
                                    }}:</b>
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <f7-block strong inset class="margin-top">
                    <f7-list no-hairlines-md>
                        <f7-list-input label="Volumen" type="number" placeholder="Ingrese volumen" clear-button
                            :value="volumen" :disabled="soloLectura" @input="onInputVolumen" />
                    </f7-list>

                    <div class="stack-line totals">
                        <span><b>Total Volumen
                                {{ doc.producto?.unidadMedida ?? "TON" }}:</b>
                            {{ volumen }}</span>
                        <span class="sep">•</span>
                        <span><b>Total Guía:</b>
                            {{ formatMoneyCLP(valor) }}</span>
                    </div>
                </f7-block>
            </f7-card-content>
        </f7-card>
    </div>
</template>

<script>
import {
    ensureTotalesInit,
    actualizarTotalesTon,
} from "@/app/services/GdeTonService";

export default {
    name: "IngresoVolumen",
    props: {
        doc: { type: Object, required: true },
        soloLectura: { type: Boolean, default: false },
    },
    data() {
        return {
            volumen: 0,
            valor: 0, // entero CLP
        };
    },
    computed: {
        esValido() {
            return Number(this.volumen) > 0;
        },
    },
    async mounted() {
        const { volumen, valor } = await ensureTotalesInit(this.doc._id);
        this.volumen = volumen;
        this.valor = valor;
        this.$emit("valid-change", this.esValido);
    },
    methods: {
        onInputVolumen(payload) {
            // F7 a veces emite el valor crudo, otras el evento
            const raw =
                typeof payload === "object" ? payload?.target?.value : payload;
            const v = Number(raw);
            this.volumen = isNaN(v) ? 0 : v;
            this.onVolumenChange(); // guarda en Pouch vía servicio
        },

        async onVolumenChange() {
            const precio = Number(this.doc?.precioProducto?.precio || 0);
            const updated = await actualizarTotalesTon(
                this.doc._id,
                this.volumen,
                precio
            );

            this.volumen = Number(updated.totales?.ton?.volumen) || 0;
            this.valor = Number(updated.totales?.ton?.valor) || 0;

            this.$emit("doc-updated", { totales: updated.totales });
        },
    },
    watch: {
        volumen() {
            // cada vez que cambie, avisa si es válido
            this.$emit("valid-change", this.esValido);
        },
    },
};
</script>

<style scoped>
.section-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 8px;
}

.totales {
    font-size: 14px;
}

.mt-2 {
    margin-top: 8px;
}

.stack-line {
    display: flex;
    gap: 10px;
    align-items: baseline;
    flex-wrap: wrap;
    font-size: 14px;
    padding: 4px 0;
}

.sep {
    opacity: 0.6;
}

/* Mantén el precio y el badge juntos y que puedan saltar de línea */
.price-with-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    /* igual que tu margin-left */
    flex-wrap: wrap;
    /* permite bajar el badge a la línea siguiente si no cabe */
}

/* Ajustes del badge para móviles */
.badge-default {
    white-space: nowrap;
    /* no se parte dentro del badge */
    line-height: 18px;
    padding: 2px 8px;
    font-size: 12px;
    border-radius: 12px;
}

@media (max-width: 360px) {
    .badge-default {
        font-size: 11px;
        padding: 1px 6px;
    }
}
</style>
