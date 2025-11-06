// src/js/mixins/formatters.js
import {
    formatMoneyCLP,
    formateaVolumen,
    formatFecha,          // alias dd/MM/yyyy
    formatFechaCorta,     // dd/MM/yyyy
    formatFechaHoraCorta, // dd/MM/yyyy HH:mm
    dateInputToISOStart,
    dateInputToISOEnd,
} from '@/js/Utils/formatters';

export default {
    methods: {
        formatMoneyCLP,
        formateaVolumen,
        formatFecha,
        formatFechaCorta,
        formatFechaHoraCorta,
        dateInputToISOStart,
        dateInputToISOEnd,
    },
};
