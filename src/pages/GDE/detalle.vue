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

        <EncabezadoGde v-else-if="doc !== null" :doc="doc" />

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
                    <f7-card
                        class="m3-card detalle-m3-root"
                        v-if="doc.producto.unidadMedida === unidadesMedida.M3"
                    >
                        <DetalleM3
                            ref="detalleM3Ref"
                            :doc="doc"
                            :gde-id="id"
                            :solo-lectura="soloLectura"
                            @doc-updated="
                                (patch) => {
                                    if (patch.totales) {
                                        doc.totales = {
                                            ...doc.totales,
                                            ...patch.totales,
                                        };
                                    }
                                    // Actualizar otras propiedades planas igualmente si vienen
                                    Object.keys(patch).forEach((key) => {
                                        if (key !== 'totales')
                                            doc[key] = patch[key];
                                    });
                                }
                            "
                            @valid-change="
                                (v) => {
                                    detalleValidoM3 = !!v;
                                }
                            "
                        />
                    </f7-card>

                    <f7-card
                        class="mr-card detalle-mr-root"
                        v-else-if="
                            doc.producto.unidadMedida === unidadesMedida.MR
                        "
                    >
                        <DetalleMR
                            ref="detalleMrRef"
                            :doc="doc"
                            :gde-id="id"
                            :solo-lectura="soloLectura"
                            @doc-updated="
                                (patch) => {
                                    if (patch.totales) {
                                        doc.totales = {
                                            ...doc.totales,
                                            ...patch.totales,
                                        };
                                    }
                                    // Actualizar otras propiedades planas igualmente si vienen
                                    Object.keys(patch).forEach((key) => {
                                        if (key !== 'totales')
                                            doc[key] = patch[key];
                                    });
                                }
                            "
                            @valid-change="
                                (v) => {
                                    detalleValidoMR = !!v;
                                }
                            "
                        />
                    </f7-card>

                    <f7-card
                        class="ton-card detalle-ton-root"
                        v-else-if="
                            doc.producto.unidadMedida === unidadesMedida.TON ||
                            doc.producto.unidadMedida === unidadesMedida.BDMT ||
                            doc.producto.unidadMedida === unidadesMedida.M3ST
                        "
                    >
                        <DetalleTon
                            ref="detalleTonRef"
                            :doc="doc"
                            :gde-id="id"
                            :solo-lectura="soloLectura"
                            @doc-updated="
                                (patch) => {
                                    if (patch.totales) {
                                        doc.totales = {
                                            ...doc.totales,
                                            ...patch.totales,
                                        };
                                    }
                                    // Actualizar otras propiedades planas igualmente si vienen
                                    Object.keys(patch).forEach((key) => {
                                        if (key !== 'totales')
                                            doc[key] = patch[key];
                                    });
                                }
                            "
                            @valid-change="
                                (v) => {
                                    detalleValidoTon = !!v;
                                }
                            "
                        />
                    </f7-card>

                    <div v-else>
                        <span>No hay detalle para la unidad seleccionada.</span>
                    </div>
                </f7-accordion-content>
            </f7-list-item>

            <f7-list-item
                v-if="doc"
                accordion-item
                accordion-opened
                title="Comentarios"
                class="comentarios"
                :properties="{ opened: true }"
            >
                <f7-accordion-content>
                    <DetalleComentario
                        v-if="doc"
                        :doc="doc"
                        :solo-lectura="soloLectura"
                        @doc-updated="(p) => Object.assign(doc, p)"
                    />
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

            <f7-list-item
                v-if="doc"
                accordion-item
                accordion-opened
                title="Opciones"
                class="opciones-guia"
                :properties="{ opened: true }"
            >
                <f7-accordion-content>
                    <opciones-gde
                        v-if="doc"
                        :doc="doc"
                        @descartar="onDescartar"
                        @generar-pdf="onGenerarPDF"
                        @emitir="onEmitir"
                        @enviar="onEnviar"
                        @imprimir="onImprimir"
                        @imprimir-cedible="onImprimirCedible"
                        @anular="onAnular"
                    />
                </f7-accordion-content>
            </f7-list-item>
        </f7-list>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import {
    obtenerGde,
    descartarGde,
    emitirGde,
    anularGde,
} from "@/app/services/GdeService";

import { enviarGde } from "@/app/services/GdeEnvioService";
import EncabezadoGde from "@/pages/GDE/Detalle/EncabezadoGde.vue";
import DetalleM3 from "@/pages/GDE/Detalle/DetalleM3.vue";
import DetalleMR from "@/pages/GDE/Detalle/DetalleMR.vue";
import DetalleTon from "@/pages/GDE/Detalle/DetalleTon.vue";
import DatosGde from "@/pages/GDE/Detalle/DatosGde.vue";
import DetalleComentario from "@/pages/GDE/Detalle/DetalleComentario.vue";
import OpcionesGde from "@/pages/GDE/Detalle/OpcionesGde.vue";
import config from "@/Common/json/config.json";
import { buildDefinition } from "@/js/utils/gdePdfTemplate";
import { createPdfAndOpen } from "@/js/utils/pdfNative";
import { renderPdf417FromTED } from "@/js/utils/pdf417";
import { printGuiaFromDoc } from "@/js/Utils/gdePrinter";

export default {
    name: "GdeDetalle",
    props: { id: String },
    components: {
        EncabezadoGde,
        DatosGde,
        DetalleM3,
        DetalleMR,
        DetalleTon,
        DetalleComentario,
        OpcionesGde,
    },

    data() {
        return {
            loading: false,
            error: null,
            doc: null,
            detalleValidoMR: true,
            detalleValidoTon: true,
            detalleValidoM3: true,
        };
    },

    computed: {
        soloLectura() {
            const st = this.doc?.estado?.id;
            const EG = config.parametros.estadosGuia;
            if (!st || !EG) return false;
            // ajusta a tus claves reales si difieren
            const EMITIDA = EG.EMITIDA?.id ?? EG.EMITIDA;
            const ENVIADA = EG.ENVIADA?.id ?? EG.ENVIADA;
            const NULA = EG.NULA?.id ?? EG.NULA;
            return [EMITIDA, ENVIADA, NULA].includes(st);
        },
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
                    return "Detalle Astillas:";
                case this.unidadesMedida.BDMT:
                    return "Detalle Astillas:";
                case this.unidadesMedida.M3ST:
                    return "Detalle Astillas:";
                default:
                    return "Detalle:";
            }
        },
        requiereValidacionMR() {
            return this.doc?.producto?.unidadMedida === this.unidadesMedida.MR;
        },
        requiereValidacionM3() {
            return this.doc?.producto?.unidadMedida === this.unidadesMedida.M3;
        },
        requiereValidacionTon() {
            const u = this.doc?.producto?.unidadMedida;
            return [
                this.unidadesMedida.TON,
                this.unidadesMedida.BDMT,
                this.unidadesMedida.M3ST,
            ].includes(u);
        },
    },

    async mounted() {
        f7.dialog.preloader("Cargando...");
        try {
            if (!this.id) throw new Error("ID no proporcionado");
            this.doc = await obtenerGde(this.id);
            console.log(this.doc);
            await this.$nextTick();
            f7.accordion.open(".detalle-unidad");
            f7.accordion.open(".comentarios");
            f7.accordion.open(".opciones-guia");
        } catch (e) {
            this.error = e?.message || "Error al cargar la guía";
        } finally {
            f7.dialog.close();
        }
    },

    methods: {
        volverHaciaIngresoMr() {
            f7.accordion.open(".detalle-unidad");

            // intenta scrollear al root del componente MR
            const vm = this.$refs.detalleMrRef;
            // 1) si expone $el (componente Vue)
            const el =
                vm?.$el?.querySelector?.(".detalle-mr-root") || vm?.$el || null;
            // 2) fallback por si quieres scrollear a todo el list-item
            const fallback = document.querySelector(".detalle-unidad");

            (el || fallback)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        },

        volverHaciaIngresoM3() {
            f7.accordion.open(".detalle-unidad");

            // intenta scrollear al root del componente MR
            const vm = this.$refs.detalleM3Ref;
            // 1) si expone $el (componente Vue)
            const el =
                vm?.$el?.querySelector?.(".detalle-m3-root") || vm?.$el || null;
            // 2) fallback por si quieres scrollear a todo el list-item
            const fallback = document.querySelector(".detalle-unidad");

            (el || fallback)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        },

        volverHaciaIngresoTon() {
            f7.accordion.open(".detalle-unidad");

            // intenta scrollear al root del componente MR
            const vm = this.$refs.detalleTonRef;
            // 1) si expone $el (componente Vue)
            const el =
                vm?.$el?.querySelector?.(".detalle-ton-root") ||
                vm?.$el ||
                null;
            // 2) fallback por si quieres scrollear a todo el list-item
            const fallback = document.querySelector(".detalle-unidad");

            (el || fallback)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        },
        validarIngresoVolumenes() {
            if (this.requiereValidacionMR && !this.detalleValidoMR) {
                this.volverHaciaIngresoMr();
                f7.dialog.alert(
                    "Debe existir al menos un banco con volumen mayor a 0 para emitir.",
                    "Validación"
                );
                return false;
            }

            if (this.requiereValidacionTon && !this.detalleValidoTon) {
                this.volverHaciaIngresoTon();
                f7.dialog.alert(
                    "Debe ingresar el volumen para emitir.",
                    "Validación"
                );
                return false;
            }

            if (this.requiereValidacionM3 && !this.detalleValidoM3) {
                this.volverHaciaIngresoM3();
                f7.dialog.alert(
                    "Debe ingresar al menos un díametro para emitir.",
                    "Validación"
                );
                return false;
            }

            return true;
        },

        async onEmitir() {
            f7.dialog.preloader("Emitiendo guia...");
            try {
                if (this.validarIngresoVolumenes()) {
                    const updatedDoc = await emitirGde(this.doc);
                    this.doc = updatedDoc; // 👈 actualizas el doc en memoria
                    f7.dialog.alert(
                        "Guía emitida correctamente.",
                        "Éxito",
                        () => {
                            this.scrollArriba();
                        }
                    );
                }
            } catch (e) {
                const mensaje = e?.message
                    ? e.message
                    : "Ha ocurrido un error inesperado al emitir la guía.";

                f7.dialog.alert(mensaje, "Error");
            } finally {
                f7.dialog.close();
            }
        },

        async onAnular(motivo) {
            f7.dialog.preloader("Anulando guia...");
            try {
                const updatedDoc = await anularGde(this.doc, motivo);
                this.doc = updatedDoc; // 👈 actualizas el doc en memoria
                f7.dialog.alert("Guía anulada correctamente.", "Éxito", () => {
                    this.scrollArriba();
                });
            } catch (e) {
                const mensaje = e?.message
                    ? e.message
                    : "Ha ocurrido un error inesperado al anular la guía.";

                f7.dialog.alert(mensaje, "Error");
            } finally {
                f7.dialog.close();
            }
        },

        async onGenerarPDF() {
            f7.dialog.preloader("Generando PDF...");
            try {
                if (!this.doc) throw new Error("Documento no cargado");
                let timbrePng = null;
                if (this.soloLectura) {
                    if (!this.doc.ted) {
                        // Si por algún motivo no hay TED, generamos PDF sin timbre pero avisamos.
                        console.warn(
                            "Estado emitido/enviado/nulo sin TED. Se genera PDF sin timbre."
                        );
                    } else {
                        // Genera imagen PDF417 del TED (requerimiento SII)
                        timbrePng = await renderPdf417FromTED(this.doc.ted, {
                            fit: "fill",
                            targetWidth: 320,
                            targetHeight: 300,
                            columns: [14],
                            aspectratio: 1,
                            scale: 2,
                            height: 4,
                            quiet: 2,
                            // ← Seguridad óptima para térmica
                            securitylevel: [5, 4, 3],
                        });
                    }
                }
                const def = await buildDefinition(this.doc, timbrePng);
                const filename = `GDE-${this.doc?.folio || "borrador"}.pdf`;
                await createPdfAndOpen(def, filename);
            } catch (e) {
                f7.dialog.alert(
                    e?.message || "Ha ocurrido un error al generar el PDF.",
                    "Error"
                );
            } finally {
                f7.dialog.close();
            }
        },
        async onDescartar(doc) {
            try {
                await descartarGde(doc);
                f7.dialog.alert(
                    "Guía descartada correctamente.",
                    "Éxito",
                    () => {
                        this.back(); // se ejecuta al cerrar el alert
                    }
                );
            } catch (err) {
                f7.dialog.alert(
                    err.message || "Error al descartar la guía",
                    "Error"
                );
            }
        },

        async onEnviar() {
            f7.dialog.preloader("Enviado");
            try {
                const updatedDoc = await enviarGde(this.doc);
                this.doc = updatedDoc; // 👈 actualizas el doc en memoria
                f7.dialog.alert("Guía enviada correctamente.", "Éxito");
            } catch (err) {
                f7.dialog.alert(
                    err.message || "Error al enviar la guía",
                    "Error"
                );
            } finally {
                f7.dialog.close();
            }
        },

        async onImprimirCedible() {
            await this.onImprimir(this.doc, true);
        },

        async onImprimir(doc, cedible = false) {
            try {
                f7.dialog.preloader("Imprimiendo…");
                await printGuiaFromDoc(doc, {
                    timbreBase64: null,
                    cedible: cedible,
                });
                f7.toast
                    .create({ text: "Impresión enviada", closeTimeout: 1500 })
                    .open();
            } catch (e) {
                console.error(e);
                const msg = String(e?.message || e || "");
                const paperLikely =
                    /paper|cover|sin\s*papel|tapa|timeout|broken pipe|socket|disconnected/i.test(
                        msg
                    );

                if (paperLikely) {
                    // sugerir reintento
                    f7.dialog
                        .create({
                            title: "Impresora",
                            text: "Papel agotado o tapa abierta. Recarga y cierra la tapa. ¿Reintentar impresión?",
                            buttons: [
                                { text: "Cancelar" },
                                {
                                    text: "Reintentar",
                                    bold: true,
                                    onClick: async () => {
                                        // reintento
                                        try {
                                            f7.dialog.preloader(
                                                "Reintentando…"
                                            );
                                            await printGuiaFromDoc(doc, {
                                                timbreBase64: null,
                                            });
                                            f7.toast
                                                .create({
                                                    text: "Impresión enviada",
                                                    closeTimeout: 1500,
                                                })
                                                .open();
                                        } catch (e2) {
                                            f7.dialog.alert(
                                                e2?.message ||
                                                    "Error al reintentar impresión"
                                            );
                                        } finally {
                                            try {
                                                f7.dialog.close();
                                            } catch {}
                                        }
                                    },
                                },
                            ],
                        })
                        .open();
                } else {
                    f7.dialog.alert(
                        typeof e === "string"
                            ? e
                            : e?.message || "Error al imprimir"
                    );
                }
            } finally {
                try {
                    f7.dialog.close();
                } catch {}
            }
        },

        back() {
            // vuelve a la vista anterior
            f7.views.main?.router?.navigate("/home/?tab=gde", {
                reloadAll: true,
            });
        },
        scrollArriba() {
            const pageEl = f7.views.main.router.currentPageEl;
            if (pageEl) {
                const content = pageEl.querySelector(".page-content");
                if (content) content.scrollTo({ top: 0, behavior: "smooth" });
            }
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
