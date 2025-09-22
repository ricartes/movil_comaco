<template>
    <f7-page name="gde-detalle">
        <f7-navbar>
            <f7-nav-left>
                <f7-link @click="back">
                    <f7-icon icon="icon-back" />
                </f7-link>
            </f7-nav-left>
            <f7-nav-title>Detalle GDE</f7-nav-title>
        </f7-navbar>

        <f7-block v-if="loading">Cargando…</f7-block>

        <f7-block v-else-if="error">
            <div class="text-color-red">{{ error }}</div>
        </f7-block>

        <EncabezadoGde v-else :doc="doc" />

        <f7-list>
            <f7-list-item
                v-if="doc && doc.producto"
                accordion-item
                accordion-opened
                :title="detalleTitle"
                class="detalle-unidad"
                :properties="{ opened: true }"
            >
                <f7-accordion-content>
                    <DetalleM3
                        v-if="doc.producto.unidadMedida === unidadesMedida.M3"
                        :doc="doc"
                    />

                    <DetalleMR
                        v-else-if="
                            doc.producto.unidadMedida === unidadesMedida.MR
                        "
                        :doc="doc"
                        :gde-id="id"
                        @doc-updated="(patch) => Object.assign(doc, patch)"
                    />

                    <DetalleTon
                        v-else-if="
                            doc.producto.unidadMedida === unidadesMedida.TON
                        "
                        :doc="doc"
                    />
                    <div v-else>
                        <span>No hay detalle para la unidad seleccionada.</span>
                    </div>
                </f7-accordion-content>
            </f7-list-item>

            <f7-list-item
                accordion-item
                accordion-opened
                title="Datos de la Guía (pulse para expandir)"
                class="info-guia"
                :properties="{ opened: true }"
            >
                <f7-accordion-content>
                    <datos-gde :doc="doc" />
                </f7-accordion-content>
            </f7-list-item>
        </f7-list>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import { obtenerGde } from "@/app/services/GdeService";
import EncabezadoGde from "@/pages/GDE/Detalle/EncabezadoGde.vue";
import DetalleM3 from "@/pages/GDE/Detalle/DetalleM3.vue";
import DetalleMR from "@/pages/GDE/Detalle/DetalleMR.vue";
import DetalleTon from "@/pages/GDE/Detalle/DetalleTon.vue";
import DatosGde from "@/pages/GDE/Detalle/DatosGde.vue";
import config from "@/Common/json/config.json";

export default {
    name: "GdeDetalle",
    props: { id: String },
    components: { EncabezadoGde, DatosGde, DetalleM3, DetalleMR, DetalleTon },

    data() {
        return {
            loading: true,
            error: null,
            doc: null,
        };
    },

    computed: {
        unidadesMedida() {
            return config.parametros.unidadesMedida;
        },
        detalleTitle() {
            const unidad = this.doc?.producto?.unidadMedida;
            switch (unidad) {
                case this.unidadesMedida.M3:
                    return "Detalle M3:";
                case this.unidadesMedida.MR:
                    return "Detalle MR:";
                case this.unidadesMedida.TON:
                    return "Detalle Ton:";
                default:
                    return "Detalle:";
            }
        },
    },

    async mounted() {
        try {
            if (!this.id) throw new Error("ID no proporcionado");
            this.doc = await obtenerGde(this.id);
            await this.$nextTick();
            f7.accordion.open(".detalle-unidad");
        } catch (e) {
            this.error = e?.message || "Error al cargar la guía";
        } finally {
            this.loading = false;
        }
    },

    methods: {
        back() {
            // vuelve a la vista anterior
            f7.views.main?.router?.navigate("/home/", {
                reloadAll: true,
            });
        },
    },
};
</script>

<style scoped>
.section {
    padding: 8px 0 2px;
    border-bottom: 1px solid var(--f7-list-item-border-color, #ececec);
}
.section:last-child {
    border-bottom: 0;
}
.section-title {
    font-weight: 600;
    font-size: 13px;
    color: #374151;
    margin-bottom: 6px;
}
.kv {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 4px 12px;
    margin: 0;
}
.kv dt {
    margin: 0;
    color: #6b7280;
    font-size: 12px;
    font-weight: 500;
}
.kv dd {
    margin: 0;
    font-size: 13px;
}
.meta .kv dt {
    color: #4b5563;
}
</style>
