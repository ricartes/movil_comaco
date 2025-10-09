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
                        <td class="label-cell"><b>Precio unitario:</b></td>
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

                    <tr>
                        <td class="label-cell"><b>Ancho secuencia:</b></td>
                        <td style="padding-bottom: 10px">
                            <label
                                v-for="op in [2.3, 2.35, 2.4]"
                                :key="op"
                                class="option-row padding-top"
                            >
                                <f7-radio
                                    name="ancho-secuencia"
                                    :checked="anchoSecuencia === op"
                                    @change="() => setAnchoSecuencia(op)"
                                />
                                <span>{{ op.toFixed(2) }}</span>
                            </label>
                        </td>
                    </tr>
                </tbody>
            </table>

            <table class="tabla">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ancho</th>
                        <th>H. Izq</th>
                        <th>H. Der</th>
                        <th>Vol</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(banco, idx) in detalleMR" :key="banco.id">
                        <td class="center">{{ banco.id }}</td>
                        <td>
                            <f7-input
                                type="number"
                                inputmode="decimal"
                                step="0.01"
                                :value="banco.ancho"
                                @input="(e) => onNum(banco, 'ancho', e, idx)"
                            />
                        </td>
                        <td>
                            <f7-input
                                type="number"
                                inputmode="decimal"
                                step="0.01"
                                :value="banco.alturaIzquierda"
                                @input="
                                    (e) =>
                                        onNum(banco, 'alturaIzquierda', e, idx)
                                "
                            />
                        </td>
                        <td>
                            <f7-input
                                type="number"
                                inputmode="decimal"
                                step="0.01"
                                :value="banco.alturaDerecha"
                                @input="
                                    (e) => onNum(banco, 'alturaDerecha', e, idx)
                                "
                            />
                        </td>
                        <td class="right mono">
                            {{ banco.volumen.toFixed(2) }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Totales (sobrios) -->
            <div class="stack-line totals">
                <span
                    ><b>Total Volumen MR:</b>
                    {{ totalVolumen.toFixed(2) }}</span
                >
                <span class="sep">•</span>
                <span><b>Total Guía:</b> {{ formatMoneyCLP(totalGuia) }}</span>
            </div>
        </f7-card-content>
    </f7-card>
</template>

<script>
import { ensureDetalleMR, saveDetalleMR } from "@/app/services/GdeRumasService";

// debounce simple para no spamear PouchDB
function debounce(fn, ms = 300) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

export default {
    name: "DetalleMR",
    props: {
        doc: { type: Object, required: true }, // SOLO lectura
        gdeId: { type: String, required: true }, // ID para persistir
    },
    data() {
        return {
            detalleMR: [],
            anchoSecuencia: null,
            _persistDebounced: null,
        };
    },
    computed: {
        totalVolumen() {
            return this.detalleMR.reduce(
                (acc, b) => acc + (Number(b.volumen) || 0),
                0
            );
        },
        totalGuia() {
            return this.detalleMR.reduce(
                (acc, b) => acc + (Number(b.totalPrecio) || 0),
                0
            );
        },

        esValido() {
            return this.detalleMR.some((b) => Number(b.volumen) > 0);
        },
    },
    async mounted() {
        // Carga/crea el detalle desde Pouch (NO mutamos this.doc)
        const { detalleMR } = await ensureDetalleMR(this.gdeId);
        this.detalleMR = detalleMR;

        // Si todos los bancos comparten el mismo ancho, lo sugerimos en la UI
        const uniq = [
            ...new Set(this.detalleMR.map((b) => Number(b.ancho) || 0)),
        ];
        this.anchoSecuencia = uniq.length === 1 ? uniq[0] : null;

        // Preparar persistencia con debounce
        this._persistDebounced = debounce(async () => {
            const updated = await saveDetalleMR(this.gdeId, this.detalleMR);

            // Emitir totales actualizado sin neto, ivaMonto, total
            this.$emit("doc-updated", {
                totales: updated.totales,
            });
            this.$emit("valid-change", this.esValido);
        }, 300);

        this.$nextTick(() => this.$emit("valid-change", this.esValido));
    },
    methods: {
        setAnchoSecuencia(valor) {
            this.anchoSecuencia = valor;
            // Aplicar el mismo ancho a todos + recalcular + guardar
            this.detalleMR.forEach((b, idx) => {
                b.ancho = valor;
                this.calcularBanco(idx, /*persistNow*/ false);
            });
            this._persistDebounced?.();
            this.$emit("valid-change", this.esValido);
        },

        onNum(obj, field, e, idx) {
            const v = Number(e?.target?.value);
            obj[field] = isNaN(v) ? 0 : v;
            this.calcularBanco(idx);
        },

        calcularBanco(idx, persistNow = true) {
            const banco = this.detalleMR[idx];
            const largo = Number(this.doc.largoProducto) || 0;
            const precio = Number(this.doc?.precioProducto?.precio) || 0;

            const hI = Number(banco.alturaIzquierda) || 0;
            const hD = Number(banco.alturaDerecha) || 0;
            const ancho = Number(banco.ancho) || 0;

            const promedio = (hI + hD) / 2;
            const volumen = (promedio * ancho * largo) / 2.44;

            banco.volumen = isNaN(volumen) ? 0 : volumen;
            banco.totalPrecio = Math.round(banco.volumen * precio);

            this.$emit("update:detalleMR", this.detalleMR);

            // persistir con debounce
            if (persistNow) this._persistDebounced?.();

            this.$emit("valid-change", this.esValido);
        },
    },
    watch: {
        // si cambia el largo o precio del doc, recalcula todo y guarda
        "doc.largoProducto"(nv, ov) {
            if (nv === ov) return;
            this.detalleMR.forEach((_, i) => this.calcularBanco(i, false));
            this._persistDebounced?.();
            this.$emit("valid-change", this.esValido);
        },
        "doc.precioProducto?.precio"(nv, ov) {
            if (nv === ov) return;
            this.detalleMR.forEach((_, i) => this.calcularBanco(i, false));
            this._persistDebounced?.();
            this.$emit("valid-change", this.esValido);
        },
    },
};
</script>

<style scoped>
.mr-card {
    border-radius: 12px;
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

/* radios apilados */
.option-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 0;
}

/* tabla sobria */
.tabla {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
}
.tabla th,
.tabla td {
    border: 1px solid #e5e7eb;
    padding: 6px 8px;
    font-size: 13px;
}
.tabla th {
    background: #f9fafb;
    font-weight: 600;
}
.center {
    text-align: center;
}
.right {
    text-align: right;
}
.mono {
    font-variant-numeric: tabular-nums;
}

/* totales */
.totals {
    margin-top: 8px;
}
</style>
