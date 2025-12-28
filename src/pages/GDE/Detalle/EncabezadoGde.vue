<template>
    <f7-card>
        <f7-card-content>
            <table class="data-table" style="width: 100%">
                <tbody>
                    <tr>
                        <td class="label-cell"><b>Folio:</b></td>
                        <td>{{ doc.folio ?? "Sin folio" }}</td>
                    </tr>

                    <tr>
                        <td class="label-cell"><b>Origen:</b></td>
                        <td>
                            <f7-badge :color="origenBadgeColor">
                                {{ origenTexto }}
                            </f7-badge>
                        </td>
                    </tr>

                    <tr>
                        <td class="label-cell"><b>Estado:</b></td>
                        <td>
                            <f7-badge :color="badgeColor">
                                {{ doc.estado?.texto ?? "—" }}
                            </f7-badge>
                        </td>
                    </tr>

                    <!-- Motivo catálogo -->
                    <tr v-if="isNula && motivoCatalogo">
                        <td class="label-cell"><b>Motivo anulación:</b></td>
                        <td>{{ motivoCatalogo }}</td>
                    </tr>

                    <!-- Glosa / detalle escrito SOLO si el motivo requiere glosa -->
                    <tr v-if="isNula && requiereGlosa && motivoGlosa">
                        <td class="label-cell"><b>Detalle motivo:</b></td>
                        <td>{{ motivoGlosa }}</td>
                    </tr>

                    <tr>
                        <td class="label-cell"><b>Creada:</b></td>
                        <td>{{ formatFecha(doc.createdAt) }}</td>
                    </tr>
                </tbody>
            </table>
        </f7-card-content>
    </f7-card>
</template>

<script>
import config from "@/Common/json/config.json";

export default {
    name: "EncabezadoGde",
    props: {
        doc: { type: Object, required: true },
    },
    computed: {
        st() {
            return this.doc?.estado?.id;
        },
        EG() {
            return config?.parametros?.estadosGuia || {};
        },
        ID_NULA() {
            return this.EG.NULA?.id ?? this.EG.NULA;
        },
        isNula() {
            return this.st === this.ID_NULA;
        },
        ORIGEN() {
            return config?.parametros?.origenGde || {};
        },
        esForestruck() {
            const fore = this.ORIGEN?.forestruck ?? 2;
            return Number(this.doc?.gdeOrigen) === Number(fore);
        },
        origenTexto() {
            return this.esForestruck ? "FORESTRUCK" : "PROPIA DE FDS";
        },
        origenBadgeColor() {
            return this.esForestruck ? "orange" : "blue";
        },

        // glosa del catálogo (motivo seleccionado)
        motivoCatalogo() {
            return this.doc?.motivoAnulacionSeleccionado?.glosa || null;
        },
        motivoGlosa() {
            return this.doc?.motivoAnulacion || null;
        },
        requiereGlosa() {
            return (
                this.doc?.motivoAnulacionSeleccionado?.requiereGlosa === true
            );
        },
        badgeColor() {
            const raw = this.doc?.estado?.color || "gray";
            return String(raw).replace(/^color-/, "");
        },
    },
    methods: {
        formatFecha(fechaIso) {
            if (!fechaIso) return "—";
            const d = new Date(fechaIso);
            if (Number.isNaN(d.getTime())) return "—";
            return d.toLocaleString(); // o tu formateador real
        },
    },
};
</script>
