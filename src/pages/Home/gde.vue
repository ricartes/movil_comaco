<template>
    <f7-page
        name="gde"
        ptr
        @ptr:refresh="onRefresh"
        :infinite="hasMore"
        :infinite-preloader="loadingMore"
        :infinite-distance="100"
        @infinite="onInfinite"
    >
        <f7-navbar title="Guías de despacho" />

        <!-- Empty state -->
        <div v-if="!loading && items.length === 0" class="empty">
            <f7-icon f7="doc_text" size="48"></f7-icon>
            <div class="empty-title">No se encuentran guías registradas</div>
            <div class="empty-sub">
                Desliza hacia abajo para actualizar o crea una nueva guía.
            </div>
        </div>

        <!-- Lista -->
        <f7-list media-list class="gde-list" v-else>
            <f7-list-item
                v-for="g in items"
                :key="g._id"
                :title="folioText(g)"
                @click="openDetalle(g)"
            >
                <!-- ícono -->
                <template #media>
                    <f7-icon f7="doc_text_fill" />
                </template>

                <!-- derecha del título: fecha -->
                <template #after>
                    {{ formatFecha(g.createdAt) }}
                </template>

                <!-- debajo del título: estado como chip -->
                <template #subtitle>
                    <span
                        class="chip chip-small"
                        :class="estadoChipClass(g.estado?.id)"
                    >
                        <span class="chip-label">{{
                            g.estado?.texto ?? "SIN ESTADO"
                        }}</span>
                    </span>
                </template>

                <!-- bloque de texto (máx 2 líneas) -->
                <template #text>
                    <div class="line">
                        <span class="chip color-blue">{{
                            g.producto?.unidadMedida ?? ""
                        }}</span>
                        <span class="muted"
                            >Producto:
                            {{ g.producto?.nombreProducto ?? "" }}</span
                        >
                        <span v-if="g.largoProducto" class="muted"
                            >· Largo: {{ g.largoProducto }}</span
                        >
                    </div>
                </template>

                <!-- pie: transportista y patentes en una sola línea -->
                <template #footer>
                    <span class="muted">
                        Origen: {{ g.predio?.predio ?? "" }} </span
                    ><br />
                    <span class="muted">
                        Cliente: {{ g.cliente?.razonSocialCliente ?? "" }}
                    </span>
                </template>
            </f7-list-item>
        </f7-list>

        <!-- FAB crear -->
        <f7-fab position="right-bottom" @click="onCrear">
            <f7-icon ios="f7:plus" md="material:add" />
        </f7-fab>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import { listarPorEmpresaYRutPaginado } from "@/app/services/GdeService";

const PAGE_SIZE = 20;

export default {
    name: "GdePage",

    data() {
        return {
            items: [],
            loading: true,
            loadingMore: false,
            hasMore: true,
            skip: 0,
            loaded: false,
            _firstLoadInFlight: null,
        };
    },

    computed: {
        user() {
            return store.state.user;
        },
        empId() {
            return this.user?.empresa ?? this.user?.empId;
        },
        rut() {
            return String(this.user?.rut || "");
        },
    },

    methods: {
        // ---- UI helpers
        folioText(g) {
            return ` ${
                g?.folio != null ? `Folio ${g.folio}` : "Sin folio asignado."
            }`;
        },
        estadoChipClass(id) {
            switch ((id || "").toUpperCase()) {
                case "B":
                    return "chip-outline color-gray"; // BORRADOR
                case "E":
                    return "chip-fill color-blue"; // EMITIDA
                case "A":
                    return "chip-fill color-green"; // ACEPTADA
                case "R":
                    return "chip-fill color-red"; // RECHAZADA
                default:
                    return "chip-outline color-gray";
            }
        },
        formatFecha(iso) {
            if (!iso) return "-";
            const d = new Date(iso);
            if (isNaN(d)) return "-";
            return d.toLocaleDateString("es-CL", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
        },
        formatMoney(n) {
            const v = Number(n || 0);
            return v.toLocaleString("es-CL", {
                style: "currency",
                currency: "CLP",
                maximumFractionDigits: 0,
            });
        },
        formatVolumen(n) {
            const v = Number(n || 0);
            return v.toLocaleString("es-CL", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
            });
        },

        // ---- Data

        async ensureLoaded() {
            // si ya hay una carga en curso, espera esa misma
            if (this._firstLoadInFlight) return this._firstLoadInFlight;

            // crea la promesa una sola vez
            this._firstLoadInFlight = (async () => {
                try {
                    this.loading = true;
                    await this.fetchPage({ reset: true }); // siempre recarga
                    this.loaded = true; // opcional, puede servir para debug
                } finally {
                    this.loading = false;
                    this._firstLoadInFlight = null; // liberar candado
                }
            })();

            return this._firstLoadInFlight;
        },

        async fetchPage({ reset = false } = {}) {
            if (!this.empId || !this.rut) return;

            if (reset) {
                this.items = [];
                this.skip = 0;
                this.hasMore = true;
            }

            const page =
                (await listarPorEmpresaYRutPaginado(
                    Number(this.empId),
                    this.rut,
                    {
                        limit: PAGE_SIZE,
                        skip: this.skip,
                    }
                )) || [];

            if (reset) this.items = page;
            else this.items = this.items.concat(page);

            this.hasMore = page.length === PAGE_SIZE;
            this.skip += page.length;
        },

        async refreshList() {
            // 👈 uso manual o pull-to-refresh
            try {
                this.loading = true;
                await this.fetchPage({ reset: true });
            } finally {
                this.loading = false;
                this.loaded = true; // ya quedó “cargado”
            }
        },

        async onRefresh(done) {
            try {
                await this.fetchPage({ reset: true });
            } catch (e) {
                f7.toast
                    .create({
                        text: e?.message || "Error al actualizar",
                        closeTimeout: 2000,
                    })
                    .open();
            } finally {
                done?.();
            }
        },

        async onInfinite() {
            if (this.loadingMore || !this.hasMore) return;
            this.loadingMore = true;
            try {
                await this.fetchPage();
            } catch (e) {
                f7.toast
                    .create({
                        text: e?.message || "Error al cargar más",
                        closeTimeout: 2000,
                    })
                    .open();
            } finally {
                this.loadingMore = false;
            }
        },

        onCrear() {
            f7.views.main?.router?.navigate("/gde/ingreso/");
        },

        openDetalle(g) {
            f7.views.main?.router?.navigate(`/gde/detalle/${g._id}`);
        },
    },
};
</script>

<style scoped>
.empty {
    display: grid;
    place-items: center;
    text-align: center;
    padding: 48px 16px;
    color: #6b7280;
}
.empty-title {
    margin-top: 8px;
    font-weight: 600;
}
.empty-sub {
    font-size: 13px;
    margin-top: 2px;
}

/* líneas internas ordenadas */
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

/* clamp amable de F7: máx 2 líneas en el bloque de texto */
.gde-list .item-text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* el footer queda a 1 línea con ellipsis */
.gde-list .item-footer {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* chip pequeño y discreto para estado */
.chip-small {
    --f7-chip-padding-horizontal: 8px;
    --f7-chip-height: 20px;
    font-size: 11px;
}
</style>
