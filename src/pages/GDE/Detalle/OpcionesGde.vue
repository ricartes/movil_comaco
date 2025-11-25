<template>
    <f7-block
        class="alert-wrapper margin-bottom"
        v-if="(isEmitida || isEnviada) && !isRescatada && !puedeAnularPorTiempo"
    >
        <div
            class="alert alert-warning"
            style="
                border: 1px solid #faebcc;
                background-color: #fcf8e3;
                color: #8a6d3b;
                border-radius: 6px;
                padding: 10px 15px;
                font-size: 14px;
            "
        >
            <i class="f7-icons" style="font-size: 16px; margin-right: 6px">
                exclamationmark_triangle
            </i>
            Esta guía ya no puede ser anulada porque han pasado más de
            <strong>{{ horasMaxAnular }}</strong> horas desde su emisión.
        </div>
    </f7-block>

    <f7-list inset strong>
        <!-- Emitir (solo borrador) -->
        <f7-list-item
            v-if="!anularOpen && showEmitir"
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

        <!-- ANULAR CON ACCORDIÓN -->
        <f7-list-item
            v-if="showAnular"
            accordion-item
            title="Anular guía"
            class="text-blue-600"
            :disabled="loading"
            @accordion:opened="anularOpen = true"
            @accordion:closed="anularOpen = false"
        >
            <template #media>
                <f7-icon
                    ios="f7:xmark_circle_fill"
                    md="material:cancel"
                ></f7-icon>
            </template>

            <f7-accordion-content>
                <f7-block class="mt-0 mb-0">
                    <DetalleMotivoAnulacion
                        @confirmar="onConfirmarAnulacion"
                        @cancelar="onCancelarAnulacion"
                    />
                </f7-block>
            </f7-accordion-content>
        </f7-list-item>

        <!-- El resto de opciones se ocultan mientras anularOpen === true -->
        <template v-if="!anularOpen">
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
                v-if="
                    this.isEmitida ||
                    this.isEnviada ||
                    (this.isNula && hasPrinter)
                "
                @click="onImprimir"
                :title="tituloImprimirOriginal"
                :disabled="loading"
            >
                <template #media>
                    <f7-icon
                        ios="f7:printer_fill"
                        md="material:print"
                    ></f7-icon>
                </template>
            </f7-list-item>

            <f7-list-item
                link
                v-if="
                    this.isEmitida ||
                    this.isEnviada ||
                    (this.isNula && hasPrinter)
                "
                @click="onImprimirCedible"
                :title="tituloImprimirCedible"
                :disabled="loading"
            >
                <template #media>
                    <f7-icon
                        ios="f7:printer_fill"
                        md="material:print"
                    ></f7-icon>
                </template>
            </f7-list-item>

            <f7-block
                strong
                v-if="
                    (this.isEmitida || this.isEnviada || this.isNula) &&
                    !hasPrinter
                "
                class="alert-wrapper"
            >
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
                    <i
                        class="f7-icons"
                        style="font-size: 16px; margin-right: 6px"
                    >
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
        </template>
    </f7-list>
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import config from "@/Common/json/config.json";
import DetalleMotivoAnulacion from "@/pages/GDE/Detalle/DetalleMotivoAnulacion.vue";

export default {
    name: "OpcionesGde",
    components: {
        DetalleMotivoAnulacion,
    },
    props: {
        doc: { type: Object, required: true },
        loading: { type: Boolean, default: false },
    },
    emits: [
        "emitir",
        "enviar",
        "imprimir",
        "imprimir-cedible",
        "generar-pdf",
        "descartar",
        "anular",
    ],
    data() {
        return {
            anularOpen: false,
        };
    },
    computed: {
        st() {
            return this.doc?.estado?.id;
        },
        EG() {
            return config?.parametros?.estadosGuia || {};
        },
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
        isRescatada() {
            return this.doc?.rescatado === true;
        },

        tituloEnviar() {
            return this.isEmitida
                ? "Enviar guia"
                : this.isEnviada || this.isNula
                ? "Reenviar guia"
                : "";
        },

        showEmitir() {
            return this.isBorrador;
        },
        showDescartar() {
            return this.isBorrador;
        },
        showEnviar() {
            return (
                (this.isEmitida || this.isEnviada || this.isNula) &&
                !this.isRescatada
            );
        },
        showAnular() {
            return (
                (this.isEmitida || this.isEnviada) &&
                !this.isRescatada &&
                this.puedeAnularPorTiempo
            );
        },
        hasPrinter() {
            return !!store?.state?.printer?.name;
        },
        paperWidth() {
            const v = Number(store?.state?.printer?.paperWidth);
            return v === 48 ? 48 : 32;
        },
        paperWidthLabel() {
            return this.paperWidth === 48 ? "80 mm" : "57–58 mm";
        },
        paperWidthSuffix() {
            return ` (${this.paperWidthLabel})`;
        },
        tituloImprimirOriginal() {
            return `Imprimir Original${this.paperWidthSuffix}`;
        },
        tituloImprimirCedible() {
            return `Imprimir Cedible${this.paperWidthSuffix}`;
        },
        parametrosGenerales() {
            return config.parametros.parametrosGenerales;
        },
        horasMaxAnular() {
            try {
                const lista = this.doc?.parametrosGenerales;
                if (!Array.isArray(lista)) return 24;
                const param = lista.find(
                    (p) =>
                        Number(p.id) ===
                        this.parametrosGenerales.cantidadMaximasDiasAnular
                );
                const valor = Number(param?.valor);
                return isNaN(valor) ? 24 : valor;
            } catch (e) {
                return 24;
            }
        },
        puedeAnularPorTiempo() {
            try {
                const fecha = this.doc?.fechaEmision;
                if (!fecha) return false;
                const fechaEmision = new Date(fecha);
                const ahora = new Date();
                const diffMs = ahora - fechaEmision;
                const diffHoras = diffMs / (1000 * 60 * 60);
                return diffHoras <= this.horasMaxAnular;
            } catch (e) {
                return false;
            }
        },
    },
    methods: {
        onEmitir() {
            f7.dialog.confirm(
                `¿Está seguro que desea emitir esta guía. Esto no podrá ser revertido.?`,
                () => {
                    this.$emit("emitir", this.doc);
                }
            );
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
                "¿Seguro que deseas descartar este borrador? Esto no podrá ser revertido.",
                "Confirmar",
                () => this.$emit("descartar", this.doc)
            );
        },

        onConfirmarAnulacion(payload) {
            this.$emit("anular", { doc: this.doc, ...payload });
        },
        onCancelarAnulacion() {
            // Si quieres cerrar el acordeón desde dentro:
            // this.anularOpen = false;
        },
        goConfig() {
            f7.views.main?.router?.navigate("/configuracion/");
        },
    },
};
</script>

<style scoped>
.mb-0 {
    margin-bottom: 0;
}
</style>
