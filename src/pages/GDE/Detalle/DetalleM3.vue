<template>
    <f7-card>
        <f7-card-content>
            <!-- Cabecera -->
            <table class="data-table" style="width: 100%">
                <tbody>
                    <tr>
                        <td class="label-cell"><b>Producto:</b></td>
                        <td>{{ doc.producto?.nombreProducto ?? "—" }}</td>
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
                </tbody>
            </table>

            <!-- Tabla de diámetros -->
            <table class="tabla m3">
                <thead>
                    <tr>
                        <th>Ø</th>
                        <th class="right">Trozos</th>
                        <th class="right">Vol</th>
                        <th class="right">Total</th>
                        <th class="center">±</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(fila, i) in filas" :key="fila.diametro">
                        <td class="center">
                            <b>{{ fila.diametro }}</b>
                        </td>
                        <td class="right">
                            <f7-input
                                type="number"
                                inputmode="numeric"
                                step="1"
                                min="0"
                                :value="fila.trozos"
                                @input="(e) => onTrozoInput(i, e)"
                            />
                        </td>
                        <td class="right mono">
                            {{ fila.volumen.toFixed(3) }}
                        </td>
                        <td class="right mono">
                            {{ formatMoneyCLP(fila.totalPrecio) }}
                        </td>
                        <td class="center">
                            <div class="stepper">
                                <button class="sbtn" @click="inc(i, -1)">
                                    −
                                </button>
                                <button class="sbtn" @click="inc(i, 1)">
                                    +
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th class="right" colspan="2">Totales</th>
                        <th class="right mono">
                            {{ totalVolumen.toFixed(3) }}
                        </th>
                        <th class="right mono">
                            {{ formatMoneyCLP(totalValor) }}
                        </th>
                        <th></th>
                    </tr>
                </tfoot>
            </table>
        </f7-card-content>
    </f7-card>
</template>

<script>
import {
    ensureDetalleM3,
    saveDetalleM3,
    calcVolumenM3,
} from "@/app/services/GdeAserrableService";

export default {
    name: "DetalleM3",
    props: {
        doc: { type: Object, required: true }, // solo lectura
        soloLectura: { type: Boolean, default: false },
    },
    data() {
        return {
            filas: [], // [{diametro, trozos, largo, precioUnitario, volumen, totalPrecio}]
            _saveTimer: null,
        };
    },
    computed: {
        totalVolumen() {
            return this.filas.reduce((a, f) => a + (Number(f.volumen) || 0), 0);
        },
        totalValor() {
            return this.filas.reduce(
                (a, f) => a + (Number(f.totalPrecio) || 0),
                0
            );
        },
        largo() {
            return Number(this.doc?.largoProducto || 0);
        },
        precioUnitario() {
            return Number(this.doc?.precioProducto?.precio || 0);
        },
        esValido() {
            return this.filas.some(
                (f) => Number(f.trozos) > 0 && Number(f.volumen) > 0
            );
        },
    },
    async mounted() {
        const { detalleM3 } = await ensureDetalleM3(this.doc._id);
        // Sincroniza con largo/precio actuales por si cambiaron:
        const largo = this.largo;
        const precio = this.precioUnitario;

        this.filas = detalleM3.map((f) => {
            const trozos = Number(f.trozos || 0);
            const vol = calcVolumenM3(f.diametro, largo, trozos);
            const total = Math.round(vol * Number(f.precioUnitario ?? precio));
            return {
                diametro: Number(f.diametro),
                trozos,
                largo,
                precioUnitario: Number(f.precioUnitario ?? precio),
                volumen: vol,
                totalPrecio: total,
            };
        });
        // guardamos una normalización inicial (opcional)
        this.queueSave();
        this.$emit("valid-change", this.esValido);
    },
    methods: {
        onTrozoInput(idx, payload) {
            const raw =
                typeof payload === "object" ? payload?.target?.value : payload;
            let v = parseInt(raw, 10);
            if (isNaN(v) || v < 0) v = 0;
            this.setTrozos(idx, v);
        },
        inc(idx, delta) {
            const cur = Number(this.filas[idx].trozos || 0);
            let v = cur + delta;
            if (v < 0) v = 0;
            this.setTrozos(idx, v);
        },

        setTrozos(idx, trozos) {
            const f = this.filas[idx];
            const largo = this.largo;
            const precio = Number(f.precioUnitario ?? this.precioUnitario);

            const vol = calcVolumenM3(f.diametro, largo, trozos);
            const updated = {
                ...f,
                trozos,
                largo,
                precioUnitario: precio,
                volumen: vol,
                totalPrecio: Math.round(vol * precio),
            };

            // Opción A: splice (la más simple)
            this.filas.splice(idx, 1, updated);

            // Opción B: reemplazo inmutable (alternativa):
            // this.filas = [
            //   ...this.filas.slice(0, idx),
            //   updated,
            //   ...this.filas.slice(idx + 1),
            // ];

            this.queueSave();
            this.$emit("valid-change", this.esValido);
        },

        queueSave() {
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => this.persist(), 250);
        },
        async persist() {
            const updated = await saveDetalleM3(
                this.doc._id,
                this.filas,
                this.precioUnitario
            );
            this.$emit("doc-updated", {
                detalleM3: updated.doc.detalleM3,
                totales: updated.doc.totales,
            });
        },
        _recalcAllAndEmit() {
            const largo = this.largo;
            const precio = this.precioUnitario;
            this.filas = this.filas.map((f) => {
                const vol = calcVolumenM3(
                    f.diametro,
                    largo,
                    Number(f.trozos || 0)
                );
                return {
                    ...f,
                    largo,
                    precioUnitario: Number(f.precioUnitario ?? precio),
                    volumen: vol,
                    totalPrecio: Math.round(
                        vol * Number(f.precioUnitario ?? precio)
                    ),
                };
            });
            this.$emit("valid-change", this.esValido);
            this.queueSave();
        },
    },
    watch: {
        // Si cambia el largo o el precio de la guía, recalculamos todo y notificamos validez.
        "doc.largoProducto"(nv, ov) {
            if (nv === ov) return;
            this._recalcAllAndEmit();
        },
        "doc.precioProducto?.precio"(nv, ov) {
            if (nv === ov) return;
            this._recalcAllAndEmit();
        },
    },

    beforeUnmount() {
        clearTimeout(this._saveTimer);
    },
};
</script>

<style scoped>
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

/* Ajustes de ancho para columnas específicas */
.tabla.m3 th:nth-child(2),
.tabla.m3 td:nth-child(2) {
    width: 80px; /* 👈 más estrecha la columna Trozos */
}

.tabla.m3 th:nth-child(5),
.tabla.m3 td:nth-child(5) {
    width: 100px; /* 👈 más espacio para los botones ± */
}

/* Estilo del stepper */
.stepper {
    display: flex;
    gap: 6px;
    justify-content: center;
}
.sbtn {
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 6px;
    width: 28px;
    height: 28px;
    line-height: 26px;
    text-align: center;
    font-weight: bold;
    font-size: 18px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
}
.sbtn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
}

/* 👇 Hace que el input de trozos no se expanda demasiado */
.tabla.m3 td:nth-child(2) .input,
.tabla.m3 td:nth-child(2) input {
    max-width: 60px;
    text-align: right;
}
</style>

