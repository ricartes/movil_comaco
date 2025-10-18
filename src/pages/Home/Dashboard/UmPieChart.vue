<!-- components/Dashboard/UmPieChartF7.vue -->
<template>
    <div>
        <!-- Estado vacío -->
        <div v-if="total === 0" class="text-center text-gray-500 py-6 text-sm">
            Sin datos para graficar
        </div>

        <!-- Pie chart -->
        <f7-pie-chart v-else :datasets="datasets" tooltip />

        <!-- Leyenda -->
        <div v-if="total > 0" class="legend">
            <div
                v-for="it in legendItems"
                :key="it.label"
                class="legend-item"
                :class="{ 'legend-item--zero': it.value === 0 }"
            >
                <span class="swatch" :style="{ backgroundColor: it.color }" />
                <span class="legend-text"
                    >{{ it.labelLargo }} ({{ it.value }})</span
                >
            </div>
        </div>
    </div>
</template>

<script>
import { f7PieChart } from "framework7-vue";

export default {
    name: "UmPieChartF7",
    components: { f7PieChart },
    props: {
        // Espera exactamente: { MR, M3, ASTILLAS }
        umCounts: { type: Object, required: true },
        size: { type: Number, default: 220 },
    },
    computed: {
        COLORS() {
            return {
                MR: "#3b82f6", // azul
                M3: "#10b981", // verde
                ASTILLAS: "#f59e0b", // ámbar
            };
        },
        safeCounts() {
            const c = this.umCounts || {};
            return {
                MR: Number(c.MR) || 0,
                M3: Number(c.M3) || 0,
                ASTILLAS: Number(c.ASTILLAS) || 0,
            };
        },
        total() {
            const c = this.safeCounts;
            return c.MR + c.M3 + c.ASTILLAS;
        },
        datasets() {
            const c = this.safeCounts;
            return [
                { label: "MR", value: c.MR, color: this.COLORS.MR },
                { label: "M3", value: c.M3, color: this.COLORS.M3 },
                {
                    label: "ASTILLAS",
                    value: c.ASTILLAS,
                    color: this.COLORS.ASTILLAS,
                },
            ];
            // Si quieres ocultar porciones en 0:
            // return ds.filter(s => s.value > 0);
        },
        legendItems() {
            const labelsLargos = {
                MR: "MR",
                M3: "M3",
                ASTILLAS: "Astillas",
            };
            return this.datasets.map((d) => ({
                ...d,
                labelLargo: labelsLargos[d.label] || d.label,
            }));
        },
    },
};
</script>

<style scoped>
.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 10px;
}
.legend-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #374151;
}
.legend-item--zero {
    opacity: 0.5;
}
.swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    display: inline-block;
}
.legend-text {
    line-height: 1;
}

.text-sm {
    font-size: 0.875rem;
}
.text-gray-500 {
    color: #6b7280;
}
.text-center {
    text-align: center;
}
.py-6 {
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
}
</style>
