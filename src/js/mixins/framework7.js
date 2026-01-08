// src/js/mixins/formatters.js
import { f7 } from 'framework7-vue';

export default {
    data() {
        return {
            __loadingDlg: null,
            __loadingCount: 0,
        };
    },

    methods: {
        clearSmartSelect(selector, placeholder = '') {
            this.$nextTick(() => {
                const ss = f7.smartSelect.get(`${selector} .smart-select`);
                if (!ss) return;
                try { ss.setValue([]); } catch (_) { }
                try { ss.setValueText(placeholder); } catch (_) { }
            });
        },
        // =========================
        // Loading / Preloader helpers
        // =========================
        showLoading(text = "Cargando...") {
            this.__loadingCount = (this.__loadingCount || 0) + 1;

            // ya hay uno abierto → no abras otro
            if (this.__loadingDlg) return;

            // guarda instancia para cerrarla seguro (no "close()" global)
            this.__loadingDlg = f7.dialog.preloader(text);
        },

        hideLoading() {
            this.__loadingCount = Math.max(0, (this.__loadingCount || 0) - 1);

            // si aún hay operaciones “en curso”, no cierres
            if (this.__loadingCount > 0) return;

            try {
                if (this.__loadingDlg) this.__loadingDlg.close();
            } catch (_) {
                // fallback por si algo raro pasó
                try { f7.dialog.close(); } catch (_) { }
            } finally {
                this.__loadingDlg = null;
            }
        },

        async withLoading(fn, text = "Cargando...") {
            this.showLoading(text);
            try {
                return await fn();
            } finally {
                this.hideLoading();
            }
        },

        // =========================
        // Dialog helpers (async)
        // =========================
        alertAsync(message, title = "Aviso") {
            return new Promise((resolve) => {
                try {
                    f7.dialog.alert(message || "—", title, () => resolve(true));
                } catch (_) {
                    resolve(true);
                }
            });
        },

        confirmAsync(message, title = "Confirmar") {
            return new Promise((resolve) => {
                try {
                    f7.dialog.confirm(
                        message || "—",
                        title,
                        () => resolve(true),
                        () => resolve(false)
                    );
                } catch (_) {
                    resolve(false);
                }
            });
        },

        setSSText(ssTargetElOrRef, text, tries = 10) {
            try {
                const ss = f7.smartSelect.get(ssTargetElOrRef);
                if (ss) { ss.setValueText(text); return; }
            } catch (_) { }

            if (tries > 0) setTimeout(() => this.setSSText(ssTargetElOrRef, text, tries - 1), 50);
        },

    },
}
