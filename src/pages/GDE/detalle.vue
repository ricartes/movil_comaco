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

        <f7-card class="summary-card" v-else>
            <f7-card-content>
                <div class="summary-row">
                    <div><b>Folio:</b> {{ doc.folio ?? "Sin folio" }}</div>
                    <div><b>Estado:</b> {{ doc.estado?.texto ?? "—" }}</div>
                </div>
                <div class="summary-row">
                    <div><b>Creada:</b> {{ formatFecha(doc.createdAt) }}</div>
                </div>
            </f7-card-content>
        </f7-card>
        <f7-list>
            <f7-list-item
                accordion-item
                accordion-opened
                title="Información de la Guía"
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
import DatosGde from "./Detalle/DatosGde.vue";

export default {
    name: "GdeDetalle",
    props: { id: String },
    components: { DatosGde },

    data() {
        return {
            loading: true,
            error: null,
            doc: null,
        };
    },

    async mounted() {
        try {
            if (!this.id) throw new Error("ID no proporcionado");
            this.doc = await obtenerGde(this.id);
            console.log(this.doc);
            await this.$nextTick();
            f7.accordion.open(".info-guia");
        } catch (e) {
            this.error = e?.message || "Error al cargar la guía";
        } finally {
            this.loading = false;
        }
    },

    methods: {
        formatFecha(iso) {
            if (!iso) return "—";
            const d = new Date(iso);
            return isNaN(d)
                ? "—"
                : d.toLocaleDateString("es-CL", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                  });
        },
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
