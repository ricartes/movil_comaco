<template>
    <f7-page
        name="gde"
        :infinite="hasMore"
        :infinite-preloader="loadingMore"
        :infinite-distance="100"
        @infinite="onInfinite"
    >
        <f7-navbar title="Guías de despacho" />

        <!-- Acordeón de Filtros (cerrado por defecto) -->
        <f7-list strong outline-ios dividers-ios inset-md accordion-list>
            <f7-list-item
                ref="filtrosAcc"
                accordion-item
                title="Filtros"
                header
                @accordion:opened="ptrEnabled = false"
                @accordion:closed="ptrEnabled = true"
            >
                <f7-accordion-content>
                    <f7-list
                        strong
                        inset
                        dividers
                        class="gde-filters no-margin-vertical"
                    >
                        <!-- Estado (select normal, múltiple) -->
                        <f7-list-input
                            label="Estado"
                            type="select"
                            placeholder="Selecciona estado(s)"
                            multiple
                            v-model:value="filters.estados"
                        >
                            <template #media
                                ><f7-icon f7="list_bullet"
                            /></template>
                            <option :value="estadosGuia.PROVISORIA.id">
                                {{ estadosGuia.PROVISORIA.texto }}
                            </option>
                            <option :value="estadosGuia.BORRADOR.id">
                                {{ estadosGuia.BORRADOR.texto }}
                            </option>
                            <option :value="estadosGuia.EMITIDA.id">
                                {{ estadosGuia.EMITIDA.texto }}
                            </option>
                            <option :value="estadosGuia.ENVIADA.id">
                                {{ estadosGuia.ENVIADA.texto }}
                            </option>
                            <option :value="estadosGuia.NULA.id">
                                {{ estadosGuia.NULA.texto }}
                            </option>
                        </f7-list-input>

                        <!-- Fechas -->
                        <f7-list-input
                            label="Desde"
                            type="datepicker"
                            placeholder="dd/mm/aaaa"
                            readonly
                            :calendar-params="calendarDesde"
                            v-model:value="filters.desde"
                        />
                        <f7-list-input
                            label="Hasta"
                            type="datepicker"
                            placeholder="dd/mm/aaaa"
                            readonly
                            :calendar-params="calendarHasta"
                            v-model:value="filters.hasta"
                        />

                        <!-- Nº Guía -->
                        <f7-list-input
                            label="Nº Guía"
                            type="number"
                            placeholder="(opcional)"
                            clear-button
                            v-model:value="filters.folio"
                        />
                    </f7-list>

                    <!-- Botones (1 línea, 50% + 50%) -->
                    <f7-block class="gde-filters-actions">
                        <div class="gde-buttons-row">
                            <f7-button
                                large
                                fill
                                :disabled="loadingFilters"
                                :class="[
                                    'col-btn',
                                    { 'btn-disabled': loadingFilters },
                                ]"
                                @click="onApplyFilters"
                            >
                                {{ loadingFilters ? "Filtrando…" : "Aplicar" }}
                            </f7-button>

                            <f7-button
                                large
                                outline
                                :disabled="loadingFilters"
                                :class="[
                                    'col-btn',
                                    { 'btn-disabled': loadingFilters },
                                ]"
                                @click="onClearFilters"
                            >
                                {{ loadingFilters ? "Limpiando…" : "Limpiar" }}
                            </f7-button>
                        </div>
                    </f7-block>
                </f7-accordion-content>
            </f7-list-item>
        </f7-list>

        <!-- Empty state -->
        <div v-if="!loading && items.length === 0" class="empty">
            <f7-icon f7="doc_text" size="48"></f7-icon>
            <div class="empty-title">No se encuentran guías registradas</div>
            <div class="empty-sub">
                Desliza hacia abajo para actualizar o crea una nueva guía.
            </div>
        </div>

        <!-- Lista (MISMO template original) con look de card -->
        <f7-list media-list class="gde-list cards-look" v-else>
            <f7-list-item
                class="card"
                v-for="g in items"
                :key="g._id"
                :title="folioText(g)"
                @click="openDetalle(g)"
            >
                <!-- ícono -->
                <template #media><f7-icon f7="doc_text_fill" /></template>

                <!-- derecha del título: fecha -->
                <template #after>{{ formatFecha(g.createdAt) }}</template>

                <!-- debajo del título: estado como chip -->
                <template #subtitle>
                    <span
                        class="chip chip-small"
                        :class="estadoChipClass(g.estado?.id, g.estado?.texto)"
                    >
                        <span class="chip-label">{{
                            g.estado?.texto ?? "SIN ESTADO"
                        }}</span>
                    </span>
                </template>

                <!-- bloque de texto (máx 2 líneas) -->
                <template #text>
                    <div class="line">
                        <span class="chip chip-fill color-blue">{{
                            chipUnidadConVolumen(g)
                        }}</span>
                        <span class="muted">{{
                            g.producto?.nombreProducto ?? ""
                        }}</span>
                    </div>
                </template>

                <!-- pie -->
                <template #footer>
                    <span class="muted"
                        >Origen: {{ g.predio?.predio ?? "" }}</span
                    ><br />
                    <span class="muted">
                        Destino: {{ g.cliente?.razonSocialCliente ?? "" }}
                        {{ g.destino?.destinoCliente ?? "" }}
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
import { f7, f7ready } from "framework7-vue";
import store from "@/js/store";
import { listarPorEmpresaYRutPaginado } from "@/app/services/GdeService";
import config from "@/Common/json/config.json";

const PAGE_SIZE = 20;

let _dlg = null;
const showPreloader = (text = "Cargando…") => {
    if (_dlg) return;
    _dlg = f7.dialog.preloader(text);
};
const hidePreloader = () => {
    _dlg?.close();
    _dlg = null;
};

const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

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
            ptrEnabled: true,
            loadingFilters: false,

            filters: {
                estados: [],
                desde: null,
                hasta: null,
                folio: "",
            },
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

        estadosGuia() {
            return config?.parametros?.estadosGuia || {};
        },

        calendarDesde() {
            return {
                dateFormat: "dd/mm/yyyy",
                closeOnSelect: true,
                value: this.filters.desde ? [new Date(this.filters.desde)] : [],
                on: {
                    change: (cal, value) => {
                        this.filters.desde = value?.[0] || null;
                    },
                },
            };
        },
        calendarHasta() {
            return {
                dateFormat: "dd/mm/yyyy",
                closeOnSelect: true,
                value: this.filters.hasta ? [new Date(this.filters.hasta)] : [],
                on: {
                    change: (cal, value) => {
                        this.filters.hasta = value?.[0] || null;
                    },
                },
            };
        },
    },

    async mounted() {
        f7ready(async () => {
            try {
                showPreloader("Cargando guías…");
                await this.ensureLoaded();
            } finally {
                hidePreloader();
            }
        });
    },

    beforeUnmount() {
        hidePreloader();
    },

    methods: {
        normalizeEstados(v) {
            if (Array.isArray(v)) return v;
            if (v == null || v === "") return [];
            return [v]; // si viene string único -> array con 1 elemento
        },
        // UI helpers
        formatFecha(d) {
            try {
                return new Date(d).toLocaleDateString("es-CL");
            } catch {
                return "";
            }
        },
        folioText(g) {
            return ` ${
                g?.folio != null ? `Folio ${g.folio}` : "Sin folio asignado."
            }`;
        },

        // Chip de estado desde config (match por id o por texto)
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
            const estilo = e.estilo || "chip-fill";
            const color = e.color || "color-gray";
            return `${estilo} ${color}`;
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

        cerrarFiltros() {
            const itemEl =
                this.$refs.filtrosAcc?.$el || this.$refs.filtrosAcc?.el;
            if (itemEl) f7.accordion.close(itemEl); // cierra acordeón al aplicar
        },

        // Filtros: aplicar y cerrar acordeón
        async onApplyFilters() {
            try {
                this.loadingFilters = true;
                await this.fetchPage({ reset: true });
                this.filters.estados = this.normalizeEstados(
                    this.filters.estados
                );
                await this.fetchPage({ reset: true });
            } finally {
                this.loadingFilters = false;
                this.cerrarFiltros();
            }
        },
        async onClearFilters() {
            try {
                this.loadingFilters = true;
                this.filters = {
                    estados: [],
                    desde: null,
                    hasta: null,
                    folio: "",
                };
                await this.fetchPage({ reset: true });
            } finally {
                this.loadingFilters = false;
            }

            //this.cerrarFiltros();
        },

        // Data
        async ensureLoaded() {
            if (this._firstLoadInFlight) return this._firstLoadInFlight;
            this._firstLoadInFlight = (async () => {
                try {
                    this.loading = true;
                    await this.fetchPage({ reset: true });
                    this.loaded = true;
                } finally {
                    this.loading = false;
                    this._firstLoadInFlight = null;
                }
            })();
            return this._firstLoadInFlight;
        },

        async fetchPage({ reset = false } = {}) {
            if (!this.empId || !this.rut) return;

            const isFirstLoad = reset && this.skip === 0 && !this.loaded;
            if (isFirstLoad) showPreloader("Cargando guías…");

            try {
                if (reset) {
                    this.items = [];
                    this.skip = 0;
                    this.hasMore = true;
                }

                const params = {
                    limit: 20,
                    skip: this.skip,
                    estados: this.normalizeEstados(this.filters.estados).length
                        ? this.normalizeEstados(this.filters.estados)
                        : undefined,
                    folio: this.filters.folio || undefined,
                    desde: this.filters.desde
                        ? this.filters.desde.toISOString()
                        : undefined,
                    hasta: this.filters.hasta
                        ? this.filters.hasta.toISOString()
                        : undefined,
                };

                const page =
                    (await listarPorEmpresaYRutPaginado(
                        Number(this.empId),
                        this.rut,
                        params
                    )) || [];

                const filtered = this.applyClientFilters(page);

                this.items = reset ? filtered : this.items.concat(filtered);
                this.hasMore = page.length === 20;
                this.skip += page.length;

                if (isFirstLoad) this.loaded = true;
            } finally {
                if (isFirstLoad) hidePreloader();
            }
        },

        applyClientFilters(list) {
            const estados = this.normalizeEstados(this.filters.estados).map(
                (s) => String(s).toUpperCase()
            );

            const folio = String(this.filters.folio || "").trim();
            const desde = this.filters.desde
                ? stripTime(new Date(this.filters.desde))
                : null;
            const hasta = this.filters.hasta
                ? endOfDay(new Date(this.filters.hasta))
                : null;

            return list.filter((g) => {
                const id = (g?.estado?.id || "").toUpperCase();
                const txt = (g?.estado?.texto || "").toUpperCase();
                const okEstado = estados.length
                    ? estados.includes(id) || estados.includes(txt)
                    : true;
                const okFolio = folio ? String(g?.folio || "") === folio : true;

                const created = g?.createdAt ? new Date(g.createdAt) : null;
                const okDesde = desde ? created && created >= desde : true;
                const okHasta = hasta ? created && created <= hasta : true;

                return okEstado && okFolio && okDesde && okHasta;
            });
        },

        async onInfinite() {
            if (this.loadingMore || !this.hasMore) return;
            this.ptrEnabled = false;
            this.loadingMore = true;
            try {
                await this.fetchPage();
            } finally {
                this.loadingMore = false;
                this.ptrEnabled = true;
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
/* Filtros */
.gde-filters-actions {
    margin-top: 8px;
    margin-bottom: 8px;
}
.gde-buttons-row {
    display: flex;
    width: 100%;
    gap: 8px;
}
.col-btn {
    flex: 1;
    text-align: center;
}

/* Empty */
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

/* Cards look */
.cards-look .item-content {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06);
    margin: 10px 16px; /* leve inset acorde a 'inset' */
    padding: 12px 14px;
}
.cards-look .item-inner::before {
    display: none !important;
}

/* Texto / chips */
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
.gde-list .item-text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.gde-list .item-footer {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.chip-small {
    --f7-chip-padding-horizontal: 8px;
    --f7-chip-height: 20px;
    font-size: 11px;
}

.btn-disabled {
    opacity: 0.6;
    pointer-events: none;
}
</style>
