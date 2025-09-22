// src/js/mixins/formatters.js
export default {
    methods: {
        formatMoneyCLP(n) {
            const v = Number(n || 0)
            return v.toLocaleString('es-CL', {
                style: 'currency',
                currency: 'CLP',
                maximumFractionDigits: 0,
            })
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
    },
}
