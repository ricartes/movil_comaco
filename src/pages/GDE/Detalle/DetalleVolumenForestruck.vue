<template>
    <f7-block strong inset class="alert-wrapper">
        <div class="alert alert-info">
            <i class="f7-icons">info_circle</i>

            <div class="content">
                <div class="msg">
                    El detalle de volumen no se ingresa, ya que esta guía fue
                    importada desde Forestruck.
                </div>

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
.alert {
    width: 100%;
    box-sizing: border-box;
    border-radius: 10px;
    padding: 12px 12px; /* padding general */
    display: flex;
    align-items: flex-start;
}

.alert i {
    font-size: 18px;
    margin-top: 1px;
}

/* ✅ ESTE es el “padding lateral” del texto */
.content {
    padding-left: 6px; /* o 8px si lo quieres más notorio */
    flex: 1;
}

.msg {
    line-height: 1.3;
}

.resume {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed rgba(49, 112, 143, 0.35);
    font-size: 13px;
    display: grid;
    gap: 6px;
}
</style>
