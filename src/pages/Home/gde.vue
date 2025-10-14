<template>
    <f7-page
        name="gde"
        :infinite="hasMore && loaded && !loading && !loadingMore"
        :infinite-preloader="loadingMore"
        :infinite-distance="100"
        @infinite="onInfinite"
    >
        <f7-navbar title="Guías de despacho" />

        <!-- Filtros -->
        <GdeFilters
            v-model:estados="filters.estados"
            v-model:desde="filters.desde"
            v-model:hasta="filters.hasta"
            v-model:folio="filters.folio"
            :estadosGuia="estadosGuia"
            :loading="loadingFilters"
            @apply="onApplyFilters"
            @clear="onClearFilters"
        />

        <!-- Empty -->
        <div
            v-if="!loading && items.length === 0"
            class="empty text-align-center"
        >
            <f7-icon f7="doc_text" size="48"></f7-icon>
            <div class="empty-title">No se encuentran guías registradas</div>
            <div class="empty-sub">
                Intente cambiar los criterios del filtro.
            </div>
        </div>

        <!-- Lista -->
        <f7-list media-list class="gde-list cards-look" v-else>
            <GdeListItem
                v-for="g in items"
                :key="g._id || `${g.empId}-${g.folio}`"
                :item="g"
                :estadosGuia="estadosGuia"
                @open="openDetalle"
            />
        </f7-list>

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
import GdeFilters from "./GDE/Filtros.vue";
import GdeListItem from "./GDE/ListItem.vue";

const PAGE_SIZE = 20;

let _dlg = null;

const showPreloader = (text = "Cargando…") => {
    if (_dlg) return _dlg; // evita duplicados
    _dlg = f7.dialog.preloader(text);
    return _dlg;
};

const hidePreloader = () => {
    try {
        if (_dlg) {
            // cierra sin animación y destruye el componente
            _dlg.close(false);
            if (typeof _dlg.destroy === "function") _dlg.destroy();
        }
    } finally {
        _dlg = null;
        // por si quedó algo en el DOM
        f7?.dialog?.close();
    }
};

const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export default {
    name: "GdePage",
    components: { GdeFilters, GdeListItem },

    data() {
        return {
            items: [],
            loading: false,
            loadingMore: false,
            hasMore: true,
            skip: 0,
            loaded: false,
            _firstLoadInFlight: null,
            loadingFilters: false,
            filters: { estados: [], desde: null, hasta: null, folio: "" }, // desde/hasta = 'YYYY-MM-DD' | null
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
    },

    beforeUnmount() {
        hidePreloader();
    },
    on: {
        pageBeforeOut() {
            hidePreloader();
        },
        pageBeforeRemove() {
            hidePreloader();
        },
    },

    methods: {
        // helpers fechas (del input date)
        dateInputToISOStart(val) {
            if (!val) return undefined;
            // val = 'YYYY-MM-DD'
            const [y, m, d] = String(val).split("-").map(Number);
            return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
        },
        dateInputToISOEnd(val) {
            if (!val) return undefined;
            const [y, m, d] = String(val).split("-").map(Number);
            return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
        },

        normalizeEstados(v) {
            if (Array.isArray(v)) return v;
            if (v == null || v === "") return [];
            return [v];
        },

        async onApplyFilters() {
            try {
                this.loadingFilters = true;
                this.filters.estados = this.normalizeEstados(
                    this.filters.estados
                );
                await this.fetchPage({ reset: true });
            } finally {
                this.loadingFilters = false;
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
        },

        async ensureLoaded() {
            if (this._firstLoadInFlight) return this._firstLoadInFlight;
            this._firstLoadInFlight = (async () => {
                try {
                    await this.fetchPage({ reset: true, initial: true });
                    this.loaded = true;
                } finally {
                    this._firstLoadInFlight = null;
                }
            })();
            return this._firstLoadInFlight;
        },

        async fetchPage({ reset = false, initial = false } = {}) {
            if (!this.empId || !this.rut) return;

            // evita solapes
            if (this.loading || this.loadingMore) return;

            // preloader sólo en primera carga
            if (initial) showPreloader("Cargando guías…");

            this.loading = true;
            try {
                if (reset) {
                    this.items = [];
                    this.skip = 0;
                    this.hasMore = true;
                }

                const params = {
                    limit: PAGE_SIZE,
                    skip: this.skip,
                    estados: this.normalizeEstados(this.filters.estados).length
                        ? this.normalizeEstados(this.filters.estados)
                        : undefined,
                    folio: this.filters.folio || undefined,
                    desde: this.dateInputToISOStart(this.filters.desde),
                    hasta: this.dateInputToISOEnd(this.filters.hasta),
                };

                const page =
                    (await listarPorEmpresaYRutPaginado(
                        Number(this.empId),
                        this.rut,
                        params
                    )) || [];
                const filtered = this.applyClientFilters(page);

                this.items = reset ? filtered : this.items.concat(filtered);
                this.hasMore = page.length === PAGE_SIZE;
                this.skip += page.length;
            } finally {
                this.loading = false;
                if (initial) hidePreloader();
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
            if (
                this.loading ||
                this.loadingMore ||
                !this.hasMore ||
                !this.loaded
            )
                return;
            this.loadingMore = true;
            try {
                await this.fetchPage();
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
/* …tus estilos tal cual… */
</style>
