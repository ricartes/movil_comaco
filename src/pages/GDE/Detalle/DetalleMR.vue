<template>
    <!-- Card resumen (producto/largo/precio) -->
    <f7-card class="mr-card">
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
                        <td class="value-cell">
                            <div class="price-with-badge">
                                {{
                                    formatMoneyCLP(
                                        doc.precioProducto?.precio ?? 0
                                    )
                                }}
                                <f7-badge
                                    v-if="
                                        doc.precioProducto
                                            ?.indicadorPrecioPorDefecto
                                    "
                                    color="orange"
                                    class="badge-default"
                                >
                                    por defecto
                                </f7-badge>
                            </div>
                        </td>
                    </tr>

                    <!-- ancho secuencia solo si aplica -->
                    <tr v-if="requiereAnchoSecuencia">
                        <td class="label-cell"><b>Ancho secuencia:</b></td>
                        <td style="padding-bottom: 10px">
                            <template v-if="!soloLectura">
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
                                    <span>{{
                                        op.toFixed(cantidadDecimalesMr)
                                    }}</span>
                                </label>
                            </template>
                            <template v-else>
                                <span class="mono">
                                    {{
                                        anchoSecuencia?.toFixed(
                                            cantidadDecimalesMr
                                        ) ?? "—"
                                    }}
                                </span>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </f7-card-content>
    </f7-card>

    <!-- “Ticket” CAMIÓN -->
    <f7-card class="ticket ticket-camion">
        <f7-card-content>
            <div class="ticket-header">
                <div class="ticket-icon">🚚</div>
                <div class="ticket-title">
                    <div class="title">Camión</div>
                    <div class="subtitle">
                        {{ doc?.patenteCamion?.patCamion ?? "—" }}

                        <span v-if="tieneAnchoCamionDoc" class="pill">
                            ancho:
                            {{
                                Number(anchoCamionDoc).toFixed(
                                    cantidadDecimalesMr
                                )
                            }}
                            metros.
                        </span>
                        <span v-else class="pill pill-warn">sin ancho</span>
                    </div>
                </div>
            </div>

            <div class="ticket-body">
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
                        <tr
                            v-for="banco in bancosCamion"
                            :key="'C-' + banco.id"
                        >
                            <td class="center">
                                {{ banco.ordenTipo ?? banco.id }}
                            </td>

                            <td>
                                <f7-input
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    :value="banco.ancho"
                                    :disabled="soloLectura"
                                    @input="
                                        (e) =>
                                            onNum(
                                                banco,
                                                'ancho',
                                                e,
                                                idxGlobal(banco)
                                            )
                                    "
                                />
                            </td>

                            <td>
                                <f7-input
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    :value="banco.alturaIzquierda"
                                    :disabled="soloLectura"
                                    @input="
                                        (e) =>
                                            onNum(
                                                banco,
                                                'alturaIzquierda',
                                                e,
                                                idxGlobal(banco)
                                            )
                                    "
                                />
                            </td>

                            <td>
                                <f7-input
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    :value="banco.alturaDerecha"
                                    :disabled="soloLectura"
                                    @input="
                                        (e) =>
                                            onNum(
                                                banco,
                                                'alturaDerecha',
                                                e,
                                                idxGlobal(banco)
                                            )
                                    "
                                />
                            </td>

                            <td class="right mono">
                                {{
                                    (Number(banco.volumen) || 0).toFixed(
                                        cantidadDecimalesMr
                                    )
                                }}
                            </td>
                        </tr>

                        <tr v-if="bancosCamion.length === 0">
                            <td colspan="5" class="empty-row">
                                No hay bancos de camión
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="ticket-footer">
                    <span
                        ><b>Vol. Camión:</b>
                        {{ volumenCamion.toFixed(cantidadDecimalesMr) }}
                        MR</span
                    >
                    <span class="sep">•</span>
                    <span
                        ><b>Total Camión:</b>
                        {{ formatMoneyCLP(totalCamion) }}</span
                    >
                </div>
            </div>
        </f7-card-content>
    </f7-card>

    <!-- “Ticket” CARRO -->
    <f7-card
        v-if="tieneCarroDoc && bancosCarro.length > 0"
        class="ticket ticket-carro"
    >
        <f7-card-content>
            <div class="ticket-header">
                <div class="ticket-icon">🛻</div>
                <div class="ticket-title">
                    <div class="title">Carro</div>
                    <div class="subtitle">
                        {{ patenteCarroTexto }}

                        <span v-if="tieneAnchoCarroDoc" class="pill">
                            ancho:
                            {{
                                Number(anchoCarroDoc).toFixed(
                                    cantidadDecimalesMr
                                )
                            }}
                            metros.
                        </span>
                        <span v-else class="pill pill-warn">sin ancho</span>
                    </div>
                </div>
            </div>

            <div class="ticket-body">
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
                        <tr v-for="banco in bancosCarro" :key="'R-' + banco.id">
                            <td class="center">
                                {{ banco.ordenTipo ?? banco.id }}
                            </td>

                            <td>
                                <f7-input
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    :value="banco.ancho"
                                    :disabled="soloLectura"
                                    @input="
                                        (e) =>
                                            onNum(
                                                banco,
                                                'ancho',
                                                e,
                                                idxGlobal(banco)
                                            )
                                    "
                                />
                            </td>

                            <td>
                                <f7-input
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    :value="banco.alturaIzquierda"
                                    :disabled="soloLectura"
                                    @input="
                                        (e) =>
                                            onNum(
                                                banco,
                                                'alturaIzquierda',
                                                e,
                                                idxGlobal(banco)
                                            )
                                    "
                                />
                            </td>

                            <td>
                                <f7-input
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    :value="banco.alturaDerecha"
                                    :disabled="soloLectura"
                                    @input="
                                        (e) =>
                                            onNum(
                                                banco,
                                                'alturaDerecha',
                                                e,
                                                idxGlobal(banco)
                                            )
                                    "
                                />
                            </td>

                            <td class="right mono">
                                {{
                                    (Number(banco.volumen) || 0).toFixed(
                                        cantidadDecimalesMr
                                    )
                                }}
                            </td>
                        </tr>

                        <tr v-if="bancosCarro.length === 0">
                            <td colspan="5" class="empty-row">
                                No hay bancos de carro
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="ticket-footer">
                    <span
                        ><b>Vol. Carro:</b>
                        {{ volumenCarro.toFixed(cantidadDecimalesMr) }} MR</span
                    >
                    <span class="sep">•</span>
                    <span
                        ><b>Total Carro:</b>
                        {{ formatMoneyCLP(totalCarro) }}</span
                    >
                </div>
            </div>
        </f7-card-content>
    </f7-card>

    <!-- Totales -->
    <f7-card class="mr-card">
        <f7-card-content>
            <div class="stack-line totals">
                <span
                    ><b>Total Volumen MR:</b>
                    {{ totalVolumen.toFixed(cantidadDecimalesMr) }}</span
                >
                <span class="sep">•</span>
                <span><b>Total Guía:</b> {{ formatMoneyCLP(totalGuia) }}</span>
            </div>
        </f7-card-content>
    </f7-card>
</template>


<script>
import { ensureDetalleMR, saveDetalleMR } from "@/app/services/GdeRumasService";
import {
    getAnchoCamion,
    getAnchoCarro,
    tieneCarro,
} from "@/app/helpers/AnchoPatentesHelper";

import config from "@/Common/json/config.json";
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
        soloLectura: { type: Boolean, default: false },
    },
    data() {
        return {
            detalleMR: [],
            anchoSecuencia: null,
            _persistDebounced: null,
        };
    },
    computed: {
        tipoCamion() {
            return config?.parametros?.tipoBanco?.camion ?? "CAMION";
        },
        tipoCarro() {
            return config?.parametros?.tipoBanco?.carro ?? "CARRO";
        },

        bancosCamion() {
            return (this.detalleMR || []).filter(
                (b) => b.tipoBanco === this.tipoCamion
            );
        },
        bancosCarro() {
            return (this.detalleMR || []).filter(
                (b) => b.tipoBanco === this.tipoCarro
            );
        },

        patenteCarroTexto() {
            // legacy: string
            // nuevo: { patCarro: "...", anchoCarro: ... }
            const pc = this.doc?.patenteCarro;
            if (!pc) return "—";
            if (typeof pc === "string") return pc;
            return pc.patCarro ?? "—";
        },

        anchoCamionDoc() {
            return getAnchoCamion(this.doc);
        },
        anchoCarroDoc() {
            return getAnchoCarro(this.doc);
        },
        tieneCarroDoc() {
            return tieneCarro(this.doc);
        },

        tieneAnchoCamionDoc() {
            return Number(this.anchoCamionDoc) > 0;
        },
        tieneAnchoCarroDoc() {
            return Number(this.anchoCarroDoc) > 0;
        },

        requiereAnchoSecuencia() {
            // 1) legacy: si NO hay anchos por patente → siempre pedir secuencia
            const noHayAnchoPatente =
                !Number(this.anchoCamionDoc) ||
                (this.tieneCarroDoc && !Number(this.anchoCarroDoc));

            if (noHayAnchoPatente) return true;

            // 2) versión nueva: si algún banco no tiene ancho
            const hayCeros = this.detalleMR.some((b) => !(Number(b.ancho) > 0));

            return hayCeros;
        },

        totalVolumen() {
            const volReal = this.detalleMR.reduce(
                (acc, b) => acc + (Number(b.volumen) || 0),
                0
            );
            // misma lógica de negocio: 3 decimales comerciales
            return Number(volReal.toFixed(this.cantidadDecimalesMr)); // → 8.248
        },

        // Total Guía calculado desde ese volumen comercial
        totalGuia() {
            const precio = Number(this.doc?.precioProducto?.precio) || 0;
            return Math.round(this.totalVolumen * precio); // → 247.440
        },
        cantidadDecimalesMr() {
            return config?.parametros?.cantidadDecimalesMr || 3;
        },

        esValido() {
            return this.detalleMR.some(this.bancoEsValido);
        },

        volumenCamion() {
            const v = this.bancosCamion.reduce(
                (acc, b) => acc + (Number(b.volumen) || 0),
                0
            );
            return Number(v.toFixed(this.cantidadDecimalesMr));
        },

        volumenCarro() {
            const v = this.bancosCarro.reduce(
                (acc, b) => acc + (Number(b.volumen) || 0),
                0
            );
            return Number(v.toFixed(this.cantidadDecimalesMr));
        },

        totalCamion() {
            const precio = Number(this.doc?.precioProducto?.precio) || 0;
            return Math.round(this.volumenCamion * precio);
        },

        totalCarro() {
            const precio = Number(this.doc?.precioProducto?.precio) || 0;
            return Math.round(this.volumenCarro * precio);
        },
    },
    async mounted() {
        // Carga/crea el detalle desde Pouch (NO mutamos this.doc)
        const { detalleMR } = await ensureDetalleMR(this.gdeId);
        this.detalleMR = detalleMR;
        this.normalizarTipoBancoLegacy();

        // Si todos los bancos comparten el mismo ancho, lo sugerimos en la UI
        const uniq = [
            ...new Set(
                this.detalleMR
                    .map((b) => Number(b.ancho) || 0)
                    .filter((x) => x > 0)
            ),
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
        idxGlobal(banco) {
            const idx = this.detalleMR.indexOf(banco);
            if (idx >= 0) return idx;

            // fallback por si viene clonado (poco probable)
            return this.detalleMR.findIndex(
                (b) => b.id === banco.id && b.tipoBanco === banco.tipoBanco
            );
        },

        bancoEsValido(b) {
            const ancho = Number(b.ancho) ?? 0;
            const hI = Number(b.alturaIzquierda) ?? 0;
            const hD = Number(b.alturaDerecha) ?? 0;
            const vol = Number(b.volumen) ?? 0;
            return ancho > 0 && hI > 0 && hD > 0 && vol > 0;
        },
        setAnchoSecuencia(valor) {
            this.anchoSecuencia = valor;

            const hayAnchosPatente =
                !!this.anchoCamionDoc || !!this.anchoCarroDoc;

            this.detalleMR.forEach((b, idx) => {
                // Si hay anchos de patente, NO pises los bancos que ya tienen ancho
                if (hayAnchosPatente && Number(b.ancho) > 0) return;

                b.ancho = valor;
                this.calcularBanco(idx, false);
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

        normalizarTipoBancoLegacy() {
            const tipoCamion = this.tipoCamion; // "CAMION"
            const tipoCarro = this.tipoCarro; // "CARRO"

            const arr = this.detalleMR || [];
            if (!arr.length) return;

            // ¿Ya viene tipado? (nueva versión)
            const yaTieneTipo = arr.some(
                (b) =>
                    b && typeof b.tipoBanco === "string" && b.tipoBanco.length
            );
            if (yaTieneTipo) {
                // asegurar ordenTipo si falta
                let c = 0,
                    r = 0;
                arr.forEach((b) => {
                    if (!b) return;
                    if (b.tipoBanco === tipoCamion)
                        b.ordenTipo = b.ordenTipo ?? ++c;
                    else if (b.tipoBanco === tipoCarro)
                        b.ordenTipo = b.ordenTipo ?? ++r;
                });
                return;
            }

            // Legacy: asumimos que el orden original viene "primero camión, después carro"
            const cfg = config?.parametros ?? {};
            const cantidadCfg = cfg.cantidadBancos;

            const cantidadCamion =
                typeof cantidadCfg === "object" && cantidadCfg
                    ? Number(cantidadCfg.camion || 0)
                    : Number(cantidadCfg || 6);

            const hayCarro = this.tieneCarroDoc;

            const cantidadCarro =
                hayCarro && typeof cantidadCfg === "object" && cantidadCfg
                    ? Number(cantidadCfg.carro || 0)
                    : 0;

            const corte = Math.min(Math.max(cantidadCamion, 0), arr.length);

            let c = 0,
                r = 0;
            arr.forEach((b, i) => {
                if (!b) return;

                const esCamion = !hayCarro ? true : i < corte;
                b.tipoBanco = esCamion ? tipoCamion : tipoCarro;
                b.ordenTipo = esCamion ? ++c : ++r;
            });
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

/* Mantén el precio y el badge juntos y que puedan saltar de línea */
.price-with-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px; /* igual que tu margin-left */
    flex-wrap: wrap; /* permite bajar el badge a la línea siguiente si no cabe */
}

/* Ajustes del badge para móviles */
.badge-default {
    white-space: nowrap; /* no se parte dentro del badge */
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

.ticket {
    border-radius: 16px;
    overflow: hidden;
    position: relative;
}

/* cabecera */
.ticket-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
}

.ticket-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    font-size: 22px;
    background: rgba(0, 0, 0, 0.04);
}

.ticket-title .title {
    font-weight: 700;
    font-size: 16px;
    line-height: 1.2;
}
.ticket-title .subtitle {
    font-size: 13px;
    opacity: 0.85;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
}

/* “pastillas” */
.pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    background: rgba(0, 0, 0, 0.05);
}
.pill-warn {
    background: rgba(255, 165, 0, 0.15);
}

/* cuerpo del ticket */
.ticket-body {
    padding: 0 12px 12px 12px;
}

/* cortes tipo boleto (perforación) */
.ticket::before,
.ticket::after {
    content: "";
    position: absolute;
    top: 62px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--f7-page-bg-color, #fff);
}
.ticket::before {
    left: -9px;
}
.ticket::after {
    right: -9px;
}

/* variantes camion/carro */
.ticket-camion {
    border: 1px solid rgba(0, 128, 255, 0.25);
}
.ticket-camion .ticket-header {
    background: rgba(0, 128, 255, 0.08);
}

.ticket-carro {
    border: 1px solid rgba(0, 180, 120, 0.25);
}
.ticket-carro .ticket-header {
    background: rgba(0, 180, 120, 0.08);
}

.ticket-footer {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed rgba(0, 0, 0, 0.15);
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: baseline;
    font-size: 13px;
    opacity: 0.92;
}

/* fila vacía */
.empty-row {
    text-align: center;
    padding: 10px;
    opacity: 0.7;
}
</style>
