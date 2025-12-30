<template>
    <f7-block strong class="alert-wrapper">
        <div class="alert alert-info">
            <i class="f7-icons">info_circle</i>

            <div class="msg">
                El detalle de volumen no se ingresa, ya que esta guía fue
                importada desde Forestruck.
            </div>

            <!-- ✅ Resumen -->
            <div class="resume">
                <div class="line">
                    <b>Volumen total ({{ labelUM }}):</b>
                    <span class="mono">{{ volumenFmt }}</span>
                </div>
                <div class="line">
                    <b>Neto:</b> <span class="mono">{{ netoFmt }}</span>
                </div>
            </div>
        </div>
    </f7-block>
</template>

<script>
import config from "@/Common/json/config.json";

export default {
    name: "DetalleVolumenForestruck",
    props: {
        doc: { type: Object, required: true },
    },
    computed: {
        umActual() {
            return this.getUM(this.doc);
        },
        labelUM() {
            return this.umActual || "—";
        },
        volumen() {
            return this.getVolumenByUM(this.doc, this.umActual);
        },
        neto() {
            // prioridad: neto (por tu mapping), si no, cae al valor por UM
            const n = this.doc?.totales?.neto ?? null;
            return n != null ? n : this.getValorByUM(this.doc, this.umActual);
        },
        decimales() {
            // si quieres otro criterio por UM, lo cambiamos aquí
            return config?.parametros?.cantidadDecimalesMr || 3;
        },
        volumenFmt() {
            if (this.volumen == null) return "—";
            const n = Number(this.volumen);
            return Number.isFinite(n) ? n.toFixed(this.decimales) : "—";
        },
        netoFmt() {
            if (this.neto == null) return "—";
            return this.formatMoneyCLP(this.neto);
        },
    },
};
</script>

<style scoped>
.alert-info {
    border: 1px solid #bce8f1;
    background: #d9edf7;
    color: #31708f;
}

.msg {
    display: inline;
}

/* mini resumen bajo el texto */
.resume {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed rgba(49, 112, 143, 0.35);
    font-size: 13px;
    display: grid;
    gap: 4px;
}

.line {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.mono {
    font-variant-numeric: tabular-nums;
}
.alert-wrapper {
    margin-top: 10px;
    margin-bottom: 10px;
    padding: 5px;
}
</style>
