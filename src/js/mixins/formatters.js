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

        /** Convierte 'YYYY-MM-DD' a ISO empezando el día (00:00:00.000 local) */
        dateInputToISOStart(yyyyMmDd) {
            if (!yyyyMmDd) return undefined;
            const [y, m, d] = String(yyyyMmDd).split('-').map(Number);
            const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0); // local start
            return isNaN(dt) ? undefined : dt.toISOString();
        },

        /** Convierte 'YYYY-MM-DD' a ISO terminando el día (23:59:59.999 local) */
        dateInputToISOEnd(yyyyMmDd) {
            if (!yyyyMmDd) return undefined;
            const [y, m, d] = String(yyyyMmDd).split('-').map(Number);
            const dt = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999); // local end
            return isNaN(dt) ? undefined : dt.toISOString();
        },
    },
}
