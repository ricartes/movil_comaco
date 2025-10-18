<template>
    <div>
        <f7-block-title>Resumen</f7-block-title>
        <Filters
            :range="range"
            :from="from"
            :to="to"
            :only-user="onlyUser"
            @update:range="(v) => (range = v)"
            @update:from="(v) => (from = v)"
            @update:to="(v) => (to = v)"
            @update:onlyUser="(v) => (onlyUser = v)"
            @refresh="reload"
        />

        <KpiCards :kpi="kpi" />

        <f7-block-title>Distribución por unidad de medida</f7-block-title>
        <f7-block strong inset>
            <UmPieChart :um-counts="umCounts" />
        </f7-block>

        <f7-block-title>Guías emitidas por fecha</f7-block-title>
        <f7-block strong inset>
            <ByDateBar :serie="serie" />
        </f7-block>

        <LatestGuides
            v-if="latest && latest.length"
            :items="latest"
            :estados-guia="estadosGuia"
        />
    </div>
</template>

<script>
import store from "@/js/store";
import config from "@/Common/json/config.json";
import { obtenerResumen } from "@/app/services/GdeDashboardService";
import Filters from "@/pages/Home/Dashboard/Filters.vue";
import KpiCards from "@/pages/Home/Dashboard/KpiCards.vue";
import UmPieChart from "@/pages/Home/Dashboard/UmPieChart.vue";
import ByDateBar from "@/pages/Home/Dashboard/ByDateBar.vue";
import LatestGuides from "@/pages/Home/Dashboard/LatestGuides.vue";

export default {
    name: "DashboardGde",
    components: { Filters, KpiCards, UmPieChart, ByDateBar, LatestGuides },
    data() {
        return {
            // filtros
            initializing: false,
            range: "7d",
            from: "",
            to: "",
            onlyUser: false,
            userRut: null, // setea si quieres “solo mis guías”
            resumen: null,
            // data mock (sin API)
            guias: [],
            estados: {
                enviado: config?.parametros?.estadosGuia.ENVIADA.id,
                nula: config?.parametros?.estadosGuia.NULA.id,
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
        filtradas() {
            const fromDt = this.from ? new Date(this.from + "T00:00:00") : null;
            const toDt = this.to ? new Date(this.to + "T23:59:59") : null;
            return this.guias.filter((g) => {
                const d = new Date(g.fechaEmision);
                if (fromDt && d < fromDt) return false;
                if (toDt && d > toDt) return false;
                if (
                    this.onlyUser &&
                    this.userRut &&
                    g.usuarioRut &&
                    g.usuarioRut !== this.userRut
                )
                    return false;
                return true;
            });
        },

        kpi() {
            return (
                this.resumen?.kpi ?? { emitidas: 0, anuladas: 0, totales: 0 }
            );
        },
        umCounts() {
            return this.resumen?.umCounts ?? { MR: 0, M3: 0, ASTILLAS: 0 };
        },
        serie() {
            return this.resumen?.serie ?? { labels: [], values: [] };
        },
        latest() {
            return this.resumen?.latest ?? [];
        },
    },
    async created() {
        this.initializing = true; // evita watchers
        this.setPreset("7d"); // setea from/to
        await this.$nextTick();
        this.initializing = false; // activa watchers
        await this.cargar(); // llamada única inicial
    },
    methods: {
        async cargar() {
            this.cargando = true;
            this.error = null;
            try {
                // Si hay filtros, ocuparlos; si no, caer en “últimos 30 días”
                const hoy = new Date();
                const desde = this.from
                    ? new Date(this.from + "T00:00:00")
                    : new Date(hoy.setDate(hoy.getDate() - 29));
                const hasta = this.to
                    ? new Date(this.to + "T23:59:59")
                    : new Date();

                this.resumen = await obtenerResumen(this.empId, this.rut, {
                    desde,
                    hasta,
                    estados: [
                        this.estadosGuia.EMITIDA.id,
                        this.estadosGuia.ENVIADA.id,
                        this.estadosGuia.NULA.id,
                    ],
                    pageSize: 200,
                    limitLatest: 10,
                    maxDaysForSerie: 60,
                });
            } catch (e) {
                this.error = e?.message || "No se pudo cargar el dashboard.";
                console.error(e);
            } finally {
                this.cargando = false;
            }
        },

        toISODate(d) {
            const dt = new Date(d);
            return isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
        },
        setPreset(preset) {
            this.range = preset;
            const now = new Date();
            const end = this.toISODate(now);
            if (preset === "today") {
                this.from = end;
                this.to = end;
            } else if (preset === "7d") {
                const s = new Date(now);
                s.setDate(s.getDate() - 6);
                this.from = this.toISODate(s);
                this.to = end;
            } else if (preset === "30d") {
                const s = new Date(now);
                s.setDate(s.getDate() - 29);
                this.from = this.toISODate(s);
                this.to = end;
            }
        },
        reload() {
            this.cargar();
        },
    },
    watch: {
        from() {
            if (!this.initializing) this.reload();
        },
        to() {
            if (!this.initializing) this.reload();
        },
    },
};
</script>

<style scoped>
.grid {
    display: grid;
}
.grid-cols-1 {
    grid-template-columns: 1fr;
}
.lg\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}
.gap-6 {
    gap: 1.5rem;
}
</style>
