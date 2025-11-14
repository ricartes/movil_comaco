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

        <f7-list-item
            v-if="showAnular"
            link
            @click="onAnular"
            title="Anular guía"
            class="text-blue-600"
            :disabled="loading"
        >
            <template #media>
                <f7-icon
                    ios="f7:xmark_circle_fill"
                    md="material:cancel"
                ></f7-icon>
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
            v-if="
                this.isEmitida || this.isEnviada || (this.isNula && hasPrinter)
            "
            @click="onImprimir"
            :title="tituloImprimirOriginal"
            :disabled="loading"
        >
            <template #media>
                <f7-icon ios="f7:printer_fill" md="material:print"></f7-icon>
            </template>
        </f7-list-item>

        <f7-list-item
            link
            v-if="
                this.isEmitida || this.isEnviada || (this.isNula && hasPrinter)
            "
            @click="onImprimirCedible"
            :title="tituloImprimirCedible"
            :disabled="loading"
        >
            <template #media>
                <f7-icon ios="f7:printer_fill" md="material:print"></f7-icon>
            </template>
        </f7-list-item>

        <f7-block
            strong
            v-if="
                (this.isEmitida || this.isEnviada || this.isNula) && !hasPrinter
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
    emits: [
        "emitir",
        "enviar",
        "imprimir",
        "imprimir-cedible",
        "generar-pdf",
        "descartar",
    ],
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

        // Visibilidad según tu regla
        showEmitir() {
            return this.isBorrador;
        },
        showDescartar() {
            return this.isBorrador;
        },
        showEnviar() {
            // Antes: return this.isEmitida || this.isEnviada || this.isNula;
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
            // 32 (57–58mm) | 48 (80mm) ; fallback 32
            const v = Number(store?.state?.printer?.paperWidth);
            return v === 48 ? 48 : 32;
        },
        paperWidthLabel() {
            return this.paperWidth === 48 ? "80 mm" : "57–58 mm";
        },
        paperWidthSuffix() {
            return ` (${this.paperWidthLabel})`;
        },

        // Títulos con ancho
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
                if (!Array.isArray(lista)) return 24; // fallback global

                const param = lista.find(
                    (p) =>
                        Number(p.id) ===
                        this.parametrosGenerales.cantidadMaximasDiasAnular
                );

                // Si existe y tiene valor numérico correcto:
                const valor = Number(param?.valor);
                return isNaN(valor) ? 24 : valor;
            } catch (e) {
                return 24; // fallback por seguridad
            }
        },
        puedeAnularPorTiempo() {
            try {
                const fecha = this.doc?.fechaEmision;
                if (!fecha) return false; // sin fecha, no permitir por seguridad

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

        onAnular() {
            f7.dialog.prompt("Ingrese el motivo de anulación", (motivo) => {
                if (motivo.trim() == "") {
                    f7.dialog.alert("Debe ingresar un motivo de anulación.");
                } else {
                    f7.dialog.confirm(
                        `¿Está seguro que desea anular esta guía? Esto no podrá ser revertido.`,
                        () => {
                            this.$emit("anular", motivo);
                        }
                    );
                }
            });
        },
        goConfig() {
            // Ruta de tu pantalla de configuración de impresora
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
