<template>
    <f7-card>
        <f7-card-content>
            <table class="data-table" style="width: 100%">
                <tbody>
                    <tr>
                        <td class="label-cell"><b>Producto:</b></td>
                        <td>{{ doc.producto.nombreProducto ?? "—" }}</td>
                    </tr>
                    <tr>
                        <td class="label-cell"><b>Largo:</b></td>
                        <td>{{ doc.largoProducto ?? "—" }} Metro(s)</td>
                    </tr>
                    <tr>
                        <td class="label-cell"><b>Precio:</b></td>
                        <td class="label-cell">
                            {{
                                formatMoneyCLP(doc.precioProducto?.precio ?? 0)
                            }}
                            <f7-badge
                                v-if="
                                    doc.precioProducto
                                        ?.indicadorPrecioPorDefecto
                                "
                                color="orange"
                                style="margin-left: 8px"
                            >
                                por defecto
                            </f7-badge>
                        </td>
                    </tr>
                </tbody>
            </table>

            <f7-block strong inset>
                <div class="section-title">Ingreso de Volumen</div>

                <f7-list no-hairlines-md>
                    <f7-list-input
                        label="Volumen (TON)"
                        type="number"
                        placeholder="Ingrese volumen"
                        clear-button
                        v-model.number="volumen"
                        @input="onVolumenChange"
                    />
                </f7-list>

                <div class="totales mt-2">
                    <div><b>Total volumen TON:</b> {{ volumen }}</div>
                    <div>
                        <b>Total guía (CLP):</b> {{ formatMoneyCLP(valor) }}
                    </div>
                </div>
            </f7-block>
        </f7-card-content>
    </f7-card>
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
    },
    data() {
        return {
            volumen: 0,
            valor: 0, // entero CLP
        };
    },
    async mounted() {
        const { volumen, valor } = await ensureTotalesInit(this.doc._id);
        this.volumen = volumen;
        this.valor = valor;
    },
    methods: {
        async onVolumenChange() {
            const precio = Number(this.doc?.precioProducto?.precio || 0);
            const { volumen, valor } = await actualizarTotalesTon(
                this.doc._id,
                this.volumen,
                precio
            );
            this.volumen = volumen;
            this.valor = valor;
            // Si quieres avisar al padre:
            this.$emit("updated:ton", { volumen, valor });
        },
        formatMoneyCLP(n) {
            const v = Number(n || 0);
            return v.toLocaleString("es-CL", {
                style: "currency",
                currency: "CLP",
                maximumFractionDigits: 0,
            });
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
</style>
