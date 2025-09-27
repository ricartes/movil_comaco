// src/js/mixins/formatters.js
import { f7 } from 'framework7-vue';

export default {
    methods: {
        clearSmartSelect(selector, placeholder = '') {
            this.$nextTick(() => {
                const ss = f7.smartSelect.get(`${selector} .smart-select`);
                if (!ss) return;
                try { ss.setValue([]); } catch (_) { }
                try { ss.setValueText(placeholder); } catch (_) { }
            });
        }
    },
}
