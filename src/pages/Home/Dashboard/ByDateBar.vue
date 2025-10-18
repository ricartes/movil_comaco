<template>
    <div>
        <canvas ref="cv" height="220"></canvas>
    </div>
</template>

<script>
import Chart from "chart.js/auto";

export default {
    name: "ByDateBar",
    props: { serie: { type: Object, required: true } }, // { labels, values }
    data() {
        return { chart: null };
    },
    mounted() {
        this.draw();
    },
    beforeUnmount() {
        this.destroy();
    },
    watch: {
        serie: {
            handler() {
                this.draw();
            },
            deep: true,
        },
    },
    methods: {
        destroy() {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
        },
        draw() {
            const canvas = this.$refs.cv;
            if (!canvas) return;
            this.destroy();
            const s = this.serie || { labels: [], values: [] };
            this.chart = new Chart(canvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: s.labels,
                    datasets: [{ label: "Guías emitidas", data: s.values }],
                },
                options: {
                    scales: { y: { beginAtZero: true, precision: 0 } },
                    plugins: { legend: { display: false } },
                },
            });
        },
    },
};
</script>

<style scoped>
.text-sm {
    font-size: 0.875rem;
}
.text-gray-500 {
    color: #6b7280;
}
.mb-2 {
    margin-bottom: 0.5rem;
}
</style>
