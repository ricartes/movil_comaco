<template>
    <f7-page
        name="gde"
        infinite
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

        <!-- FAB con 2 acciones -->
        <template #fixed>
            <!-- FAB -->
            <f7-fab
                position="right-bottom"
                morph-to=".gde-create-sheet.fab-morph-target"
            >
                <f7-icon ios="f7:plus" md="material:add" />
            </f7-fab>

            <!-- Target morph -->
            <f7-list inset strong class="gde-create-sheet fab-morph-target">
                <f7-list-item
                    link
                    title="Nueva guía (borrador)"
                    @click="crearBorrador"
                    class="fab-close"
                >
                    <template #media>
                        <f7-icon f7="doc_text" />
                    </template>
                </f7-list-item>

                <f7-list-item
                    v-if="habilitaIntegracionForestruck"
                    link
                    title="Importar desde Forestruck"
                    @click="importarForestruck"
                    class="fab-close"
                >
                    <template #media>
                        <f7-icon f7="tray_arrow_down" />
                    </template>
                </f7-list-item>
            </f7-list>
        </template>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
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
        habilitaIntegracionForestruck() {
            return !!config?.parametros?.habilitaIntegracionForestruck;
        },
    },

    beforeUnmount() {
        hidePreloader();
    },
    on: {
        pageInit() {
            this.ensureLoaded(); // primera carga
        },
        pageBeforeOut() {
            hidePreloader();
        },
        pageBeforeRemove() {
            hidePreloader();
        },
    },

    methods: {
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
            if (this.loading) return;

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
            } catch (e) {
                console.log(e);
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

        crearBorrador() {
            f7.views.main?.router?.navigate("/gde/ingreso/?tab=gde");
        },
        importarForestruck() {
            f7.views.main?.router?.navigate("/gde/importar/?tab=gde");
        },

        openDetalle(g) {
            f7.views.main?.router?.navigate(`/gde/detalle/${g._id}`);
        },
    },
};
</script>

<style scoped>
.gde-create-sheet {
    position: fixed;
    right: 16px;
    bottom: calc(var(--f7-safe-area-bottom) + var(--f7-toolbar-height) + 16px);

    width: min(320px, calc(100vw - 32px));
    border-radius: 16px;
    overflow: hidden;
    z-index: 20000;

    /* 👇 ESTO ES LO CLAVE */
    background-color: var(--f7-page-bg-color, #fff);

    /* look nativo */
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.gde-create-sheet .links-list a,
.gde-create-sheet a.fab-close {
    display: flex;
    align-items: center;
    gap: 10px; /* separa icono y texto */
    justify-content: flex-start;
    padding: 12px 16px;
}

.gde-create-sheet .f7-icons {
    width: 22px; /* fija ancho para alinear ambos items */
    text-align: center;
    font-size: 18px;
    flex: 0 0 22px;
}

.gde-create-sheet a.fab-close {
    color: inherit; /* respeta tema */
}

/* opcional: que se note el hover/tap */
.gde-create-sheet a.fab-close:active {
    opacity: 0.6;
}
</style>
