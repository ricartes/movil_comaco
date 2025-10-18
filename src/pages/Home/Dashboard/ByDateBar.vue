<template>
    <div>
        <!-- Mensaje de vacío -->
        <div v-if="!hasData" class="text-center text-gray-500 py-6 text-sm">
            No hay datos para mostrar
        </div>

        <!-- Mantener el canvas en el DOM para que Chart.js nunca pierda el contexto -->
        <canvas ref="cv" height="220" v-show="hasData"></canvas>
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
    computed: {
        hasData() {
            const s = this.serie || {};
            return (
                Array.isArray(s.values) && s.values.some((v) => Number(v) > 0)
            );
        },
    },
    mounted() {
        this.safeDraw();
    },
    beforeUnmount() {
        this.destroy();
    },
    watch: {
        // Si cambia la serie, redibujar de forma segura
        serie: {
            handler() {
                this.safeDraw();
            },
            deep: true,
        },
        // Si de pronto no hay datos, destruir el chart para que no intente pintar sobre un canvas oculto
        hasData(val) {
            if (!val) this.destroy();
            // si pasa de no-datos -> datos, dibuja
            else this.$nextTick(() => this.safeDraw());
        },
    },
    methods: {
        destroy() {
            if (this.chart) {
                try {
                    this.chart.destroy();
                } catch {}
                this.chart = null;
            }
        },
        safeDraw() {
            // Si no hay datos, asegúrate de destruir y salir
            if (!this.hasData) {
                this.destroy();
                return;
            }

            const canvas = this.$refs.cv;
            if (!canvas) return; // aún no está en DOM

            // Espera un frame para asegurar que el canvas visible tenga tamaño y contexto válido
            requestAnimationFrame(() => {
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    this.destroy();
                    return;
                }

                const s = this.serie || { labels: [], values: [] };

                // Re-crear el gráfico desde cero
                this.destroy();
                this.chart = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: s.labels,
                        datasets: [
                            {
                                label: "Guías emitidas",
                                data: s.values,
                                backgroundColor: "#3b82f6",
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false, // evita frames extra mientras alternas estados
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                        plugins: { legend: { display: false } },
                    },
                });
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
.text-center {
    text-align: center;
}
.py-6 {
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
}

/* El contenedor del canvas puede necesitar altura si usas maintainAspectRatio: false */
div > canvas {
    display: block;
    width: 100%;
}
</style>
