<template>
    <f7-list inset strong>
        <!-- Emitir (solo borrador) -->
        <f7-list-item
            v-if="showEmitir"
            link
            @click="onEmitir"
            title="Emitir guía"
            class="text-green-600"
            :disabled="loading"
        >
            <template #media>
                <f7-icon ios="f7:paperplane_fill" md="material:send"></f7-icon>
            </template>
        </f7-list-item>

        <!-- Enviar (emitida o enviada) -->
        <f7-list-item
            v-if="showEnviar"
            link
            @click="onEnviar"
            :title="tituloEnviar"
            class="text-blue-600"
            :disabled="loading"
        >
            <template #media>
                <f7-icon
                    ios="f7:arrow_up_doc_fill"
                    md="material:outbox"
                ></f7-icon>
            </template>
        </f7-list-item>

        <!-- Generar PDF (siempre) -->
        <f7-list-item
            link
            @click="onGenerarPDF"
            title="Generar PDF"
            class="text-green-600"
            :disabled="loading"
        >
            <template #media>
                <f7-icon
                    ios="f7:doc_text_fill"
                    md="material:picture_as_pdf"
                ></f7-icon>
            </template>
        </f7-list-item>

        <!-- Imprimir (siempre) -->
        <f7-list-item
            link
            v-if="hasPrinter"
            @click="onImprimir"
            title="Imprimir Original"
            :disabled="loading"
        >
            <template #media>
                <f7-icon ios="f7:printer_fill" md="material:print"></f7-icon>
            </template>
        </f7-list-item>

        <f7-list-item
            link
            v-if="hasPrinter"
            @click="onImprimirCedible"
            title="Imprimir Cedible"
            :disabled="loading"
        >
            <template #media>
                <f7-icon ios="f7:printer_fill" md="material:print"></f7-icon>
            </template>
        </f7-list-item>

        <f7-block strong v-else class="alert-wrapper">
            <div
                class="alert alert-danger"
                style="
                    border: 1px solid #ebccd1;
                    background-color: #f2dede;
                    color: #a94442;
                    border-radius: 6px;
                    padding: 10px 15px;
                    font-size: 14px;
                "
            >
                <i class="f7-icons" style="font-size: 16px; margin-right: 6px">
                    exclamationmark_circle
                </i>
                No hay <strong>impresora configurada</strong>. Ve a
                <strong>Configuración</strong> y selecciona una impresora
                Bluetooth para poder imprimir.
                <f7-link @click="goConfig" class="ml-1"
                    >Ir a Configuración</f7-link
                >
            </div>
        </f7-block>

        <!-- Descartar (solo borrador) -->
        <f7-list-item
            v-if="showDescartar"
            link
            @click="onDescartar"
            title="Descartar borrador"
            class="text-red-600"
            :disabled="loading"
        >
            <template #media>
                <f7-icon ios="f7:trash_fill" md="material:delete"></f7-icon>
            </template>
        </f7-list-item>
    </f7-list>
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import config from "@/Common/json/config.json";

export default {
    name: "OpcionesGde",
    props: {
        doc: { type: Object, required: true },
        loading: { type: Boolean, default: false },
    },
    emits: ["emitir", "enviar", "imprimir", "generar-pdf", "descartar"],
    computed: {
        st() {
            return this.doc?.estado?.id;
        },
        EG() {
            return config?.parametros?.estadosGuia || {};
        },
        // Normalizamos por si en config vienen como objeto {id, texto} o string
        ID_BORRADOR() {
            return this.EG.BORRADOR?.id ?? this.EG.BORRADOR;
        },
        ID_EMITIDA() {
            return this.EG.EMITIDA?.id ?? this.EG.EMITIDA;
        },
        ID_ENVIADA() {
            return this.EG.ENVIADA?.id ?? this.EG.ENVIADA;
        },
        ID_IMPRESA() {
            return this.EG.IMPRESA?.id ?? this.EG.IMPRESA;
        },
        ID_NULA() {
            return this.EG.NULA?.id ?? this.EG.NULA;
        },

        isBorrador() {
            return this.st === this.ID_BORRADOR;
        },
        isEmitida() {
            return this.st === this.ID_EMITIDA;
        },
        isEnviada() {
            return this.st === this.ID_ENVIADA;
        },
        isImpresa() {
            return this.st === this.ID_IMPRESA;
        },
        isNula() {
            return this.st === this.ID_NULA;
        },

        tituloEnviar() {
            return this.isEmitida
                ? "Enviar guia"
                : this.isEnviada
                ? "Reenviar guia"
                : "";
        },

        // Visibilidad según tu regla
        showEmitir() {
            return this.isBorrador;
        },
        showDescartar() {
            return this.isBorrador;
        },
        showEnviar() {
            return this.isEmitida || this.isEnviada;
        },
        hasPrinter() {
            return !!store?.state?.printer?.name;
        },
    },
    methods: {
        onEmitir() {
            this.$emit("emitir", this.doc);
        },
        onEnviar() {
            this.$emit("enviar", this.doc);
        },
        onGenerarPDF() {
            this.$emit("generar-pdf", this.doc);
        },
        onImprimir() {
            this.$emit("imprimir", this.doc);
        },
        onImprimirCedible() {
            this.$emit("imprimir-cedible", this.doc);
        },
        onDescartar() {
            f7.dialog.confirm(
                "¿Seguro que deseas descartar este borrador?",
                "Confirmar",
                () => this.$emit("descartar", this.doc)
            );
        },
        goConfig() {
            // Ruta de tu pantalla de configuración de impresora
            f7.views.main?.router?.navigate("/configuracion");
        },
    },
};
</script>

<style scoped>
.mb-0 {
    margin-bottom: 0;
}
</style>
