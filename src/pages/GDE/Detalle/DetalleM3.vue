<template>
    <!-- Cabecera producto -->
    <f7-card>
        <f7-card-content>
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
                </tbody>
            </table>
        </f7-card-content>
    </f7-card>

    <!-- GRID responsive de diámetros (2 por fila) -->
    <div class="m3-grid">
        <div class="grid grid-cols-2 grid-gap">
            <f7-card
                v-for="(fila, i) in filasVisibles"
                :key="fila.diametro"
                class="m3-item-card"
            >
                <f7-card-content class="m3-item">
                    <!-- Arriba: Ø -->
                    <div class="m3-item-top">Ø {{ fila.diametro }}</div>

                    <!-- Medio: trozos / stepper -->
                    <div class="m3-item-middle">
                        <template v-if="!soloLectura">
                            <f7-stepper
                                small
                                round
                                fill
                                :min="0"
                                :max="100"
                                :step="1"
                                input
                                :value="fila.trozos"
                                @change="(val) => onStepperChange(i, val)"
                            />
                        </template>
                        <template v-else>
                            <div class="trozos-readonly">
                                {{ fila.trozos }}
                            </div>
                        </template>
                    </div>

                    <!-- Abajo: vol + total -->
                    <div class="m3-item-bottom">
                        <div class="mono">{{ fila.volumen.toFixed(3) }} m³</div>
                        <div class="mono">
                            {{ formatMoneyCLP(fila.totalPrecio) }}
                        </div>
                    </div>
                </f7-card-content>
            </f7-card>
        </div>
    </div>

    <!-- Totales globales -->
    <f7-card>
        <f7-card-content class="m3-totales-global">
            <div class="totales-label">Totales</div>
            <div class="totales-valores">
                <span class="mono">{{ totalVolumen.toFixed(3) }} m³</span>
                <span class="mono">{{ formatMoneyCLP(totalValor) }}</span>
            </div>
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
        doc: { type: Object, required: true },
        soloLectura: { type: Boolean, default: false },
    },
    data() {
        return {
            filas: [],
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
        filasVisibles() {
            if (!this.soloLectura) return this.filas;
            return this.filas.filter((f) => f.volumen > 0);
        },
    },
    async mounted() {
        const { detalleM3 } = await ensureDetalleM3(this.doc._id);
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

        this.queueSave();
        this.$emit("valid-change", this.esValido);
    },
    methods: {
        onStepperChange(idx, val) {
            const raw =
                typeof val === "object"
                    ? val?.detail?.value ?? val?.target?.value ?? val?.value
                    : val;

            let n = Number(raw);
            if (!Number.isFinite(n) || n < 0) n = 0;
            n = Math.trunc(n);
            this.setTrozos(idx, n);
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

            this.filas.splice(idx, 1, updated);

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
.m3-grid {
    margin-top: 12px;
    padding: 0 16px; /* alineado al padding estándar de los cards */
    margin-bottom: 12px;
}
.data-table td {
    padding: 4px 6px;
    font-size: 13px;
}
.label-cell {
    width: 90px;
    font-weight: 600;
}
.value-cell {
    text-align: left;
}

/* --- GRID contenedor general --- */
.m3-grid {
    margin-top: 8px;
    padding: 0 16px; /* alineado con el resto de los cards */
    margin-bottom: 8px;
}

/* --- Grid compacto de 2 columnas --- */
.m3-grid .grid {
    --f7-grid-gap: 8px; /* 👈 reduce el espacio entre columnas y filas */
}

/* --- Card de cada diámetro --- */
.m3-item-card {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    margin: 0; /* eliminamos margen adicional (ya tenemos grid-gap) */
}

/* --- Contenido interno del card --- */
.m3-item {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 8px 10px; /* suficiente aire interno */
    gap: 4px;
}

/* --- Diámetro --- */
.m3-item-top {
    font-weight: 600;
    text-align: center;
    font-size: 13px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 3px;
}

/* --- Stepper centrado --- */
.m3-item-middle {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 4px 0;
}
.m3-item-middle .stepper {
    transform: scale(0.95);
}

/* --- Totales --- */
.m3-item-bottom {
    border-top: 1px solid #e5e7eb;
    padding-top: 4px;
    text-align: right;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}

/* --- Totales globales --- */
.m3-totales-global {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    margin-top: 6px;
    padding: 0 16px;
}
.totales-label {
    font-weight: 600;
}
.totales-valores {
    display: flex;
    flex-direction: column;
    text-align: right;
}

/* --- Precio + badge cabecera --- */
.price-with-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}
.badge-default {
    white-space: nowrap;
    line-height: 18px;
    padding: 2px 8px;
    font-size: 12px;
    border-radius: 12px;
}
</style>
