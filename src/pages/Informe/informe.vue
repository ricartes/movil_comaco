<template>
    <f7-page data-name="folios" @page:back.prevent>
        <f7-navbar>
            <f7-nav-left>
                <f7-link @click="back">
                    <f7-icon icon="icon-back" />
                </f7-link>
            </f7-nav-left>
            <f7-nav-title>Informe Guías</f7-nav-title>
        </f7-navbar>

        <f7-list strong outline-ios dividers-ios inset-md accordion-list>
            <f7-list-item
                ref="filtrosInforme"
                accordion-item
                title="Filtros"
                header
            >
                <f7-accordion-content>
                    <f7-list
                        strong
                        inset
                        dividers
                        class="gde-filters no-margin-vertical"
                    >
                        <!-- Fechas -->
                        <f7-list-input
                            label="Fecha"
                            type="date"
                            clear-button
                            :input-attrs="{
                                autocomplete: 'off',
                            }"
                            v-model:value="fecha"
                        />

                        <!-- Tipo de informe -->
                        <f7-list-item
                            title="Tipo de informe"
                            smart-select
                            :smart-select-params="{
                                openIn: 'popover',
                                closeOnSelect: true,
                            }"
                        >
                            <select v-model="tipoInforme">
                                <option value="detalle">Detallado</option>
                                <option value="resumen">
                                    Resumen por predio
                                </option>
                            </select>
                        </f7-list-item>
                    </f7-list>

                    <f7-block class="gde-filters-actions">
                        <div class="gde-buttons-row">
                            <f7-button
                                large
                                fill
                                class="col-btn"
                                :disabled="loading"
                                @click="filtrar"
                            >
                                {{ loading ? "Filtrando…" : "Aplicar" }}
                            </f7-button>
                            <f7-button
                                large
                                outline
                                class="col-btn"
                                :disabled="loading"
                                @click="limpiar"
                            >
                                {{ loading ? "Limpiando…" : "Limpiar" }}
                            </f7-button>
                        </div>
                    </f7-block>
                </f7-accordion-content>
            </f7-list-item>
        </f7-list>

        <!-- Loading -->
        <f7-block v-if="loading">
            <f7-skeleton-block
                style="height: 16px; width: 60%; margin-bottom: 8px"
            />
            <f7-skeleton-block style="height: 120px; border-radius: 8px" />
        </f7-block>

        <!-- Nada cargado aún -->
        <f7-block v-else-if="!informe" strong inset class="text-align-center">
            <p class="no-margin">Seleccione una fecha y aplique filtros.</p>
        </f7-block>

        <!-- Encabezado general + contenido -->
        <div v-else>
            <!-- Encabezado general -->

            <!-- Sin grupos para la fecha -->
            <f7-block
                v-if="gruposActuales.length === 0"
                strong
                inset
                class="text-align-center"
            >
                <p class="no-margin">
                    No hay despachos para {{ formatFecha(fecha) }}.
                </p>
            </f7-block>

            <!-- Grupos -->
            <div v-else>
                <f7-block-title>Opciones disponibles</f7-block-title>
                <f7-list inset strong>
                    <f7-list-item
                        link
                        v-if="hasPrinter"
                        @click="onImprimir"
                        title="Imprimir"
                    >
                        <template #media>
                            <f7-icon
                                ios="f7:printer_fill"
                                md="material:print"
                            ></f7-icon>
                        </template>
                    </f7-list-item>
                    <f7-block strong v-if="!hasPrinter" class="alert-wrapper">
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
                            <strong>Configuración</strong> y selecciona una
                            impresora Bluetooth para poder imprimir.
                            <f7-link @click="goConfig" class="ml-1"
                                >Ir a Configuración</f7-link
                            >
                        </div>
                    </f7-block>
                </f7-list>

                <f7-block-title>
                    {{
                        tipoInforme === "detalle"
                            ? "Despacho diario"
                            : "Resumen por predio"
                    }}
                </f7-block-title>

                <f7-block inset strong class="mb-2">
                    <div class="grid grid-cols-2 grid-gap">
                        <div>
                            <div class="text-color-gray">Empresa</div>
                            <div class="font-medium">
                                {{ informe.meta.empresaNombre }}
                            </div>
                        </div>
                        <div class="text-align-right">
                            <div class="text-color-gray">Fecha</div>
                            <div class="font-medium">
                                {{
                                    informe.meta.fechaLarga?.larga ||
                                    informe.meta.fechaISO
                                }}
                            </div>
                        </div>
                    </div>
                </f7-block>

                <div v-for="(g, idx) in gruposActuales" :key="idx" class="mb-3">
                    <!-- Encabezado del grupo -->
                    <encabezado
                        :encabezado="g.encabezado"
                        :tipoInforme="tipoInforme"
                    />

                    <TablaGDVolumen
                        :filas="g.filas"
                        :unidad="g.encabezado.unidad"
                        :subtotal="g.subtotal"
                    />

                    <!-- (Luego acá insertas la tabla GD / Volumen con f7-data-table) -->
                </div>

                <!-- Total día -->
                <f7-block inset strong>
                    <div class="display-flex justify-content-space-between">
                        <div>Total despacho día</div>
                        <div>
                            <b>{{ formateaVolumen(totalDiaActual) }}</b>
                            {{ unidadSugerida }}
                        </div>
                    </div>
                </f7-block>
            </div>
        </div>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import { generarInforme } from "@/app/services/GdeInformeService";
import Encabezado from "@/pages/informe/Components/Encabezado.vue";
import TablaGDVolumen from "@/pages/informe/Components/TablaGDVolumen.vue";
import { printInformeDespacho } from "@/js/Utils/InformeGdePrinter";

export default {
    name: "Informe",
    components: { Encabezado, TablaGDVolumen },
    data() {
        return {
            fecha: new Date().toISOString().slice(0, 10),
            tipoInforme: "detalle", // 'detalle' | 'resumen'
            loading: false,
            informe: null,
        };
    },

    computed: {
        user() {
            return store.state.user;
        },
        empId() {
            return this.user?.empresa ?? this.user?.empId;
        },
        rut() {
            return String(this.user?.rut || "");
        },
        gruposActuales() {
            if (!this.informe) return [];
            return this.tipoInforme === "detalle"
                ? this.informe.detalleDiario?.grupos || []
                : this.informe.resumenPorPredio?.grupos || [];
        },
        totalDiaActual() {
            if (!this.informe) return 0;
            return this.tipoInforme === "detalle"
                ? this.informe.detalleDiario?.totalDia || 0
                : this.informe.resumenPorPredio?.totalDia || 0;
        },
        // Si todos los grupos comparten unidad, muestro esa; si no, vacío (la unidad ya va por grupo/subtotal).
        unidadGlobal() {
            // si mezclas unidades entre grupos, puedes dejarlo vacío o mostrar g.encabezado.unidad por-subtotal
            const g = this.informe?.detalleDiario?.grupos?.[0];
            return g?.encabezado?.unidad || "";
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
    },
    mounted() {
        this.mostrarFiltros();
        //await this.$nextTick();
        this.filtrar();
    },

    methods: {
        async filtrar() {
            if (!this.fecha) {
                f7.dialog.alert(
                    "Debe ingresar la fecha para generar el informe",
                    "Informe"
                );
            } else {
                this.loading = true;
                try {
                    this.informe = await generarInforme(
                        this.empId,
                        this.rut,
                        this.fecha
                    );
                    console.log(this.informe);
                } catch (ex) {
                    f7.dialog.alert(
                        e?.message || "No fue posible generar el informe",
                        "Informe"
                    );
                } finally {
                    this.loading = false;
                }
            }
        },
        async limpiar() {
            this.fecha = new Date().toISOString().slice(0, 10);
            this.tipoInforme = "detalle";
            this.informe = null;
            this.$nextTick();
            this.filtrar();
        },

        mostrarFiltros() {
            const ref = this.$refs.filtrosInforme;
            const el = ref?.$el || ref?.el || ref; // el DOM real
            if (el) f7.accordion.open(el);
        },
        // Helpers presentación
        tituloGrupo(h) {
            // Detallado: ORIGEN + PRODUCTO
            // Resumen: Predio + Producto
            if (this.tipoInforme === "detalle") {
                return `${h.origen || "-"} · ${h.producto || "-"}`;
            }
            return `${h.predio || "-"} · ${h.producto || "-"}`;
        },
        subtituloGrupo(h) {
            // Detallado: Código + Destino + UM
            // Resumen: Rol + Código + Destino + UM
            if (this.tipoInforme === "detalle") {
                const parts = [h.codigo, h.destino, h.unidad].filter(Boolean);
                return parts.join(" · ");
            }
            const parts = [h.rol, h.codigo, h.destino, h.unidad].filter(
                Boolean
            );
            return parts.join(" · ");
        },

        async onImprimir() {
            f7.dialog.preloader("Imprimiendo…");
            try {
                await printInformeDespacho(this.informe, {
                    modo: this.tipoInforme, // 'detalle' | 'resumen'
                    tituloCabecera: "DESPACHO DIARIO",
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
                f7.dialog.close();
            }
        },

        goConfig() {
            // Ruta de tu pantalla de configuración de impresora
            f7.views.main?.router?.navigate("/configuracion/");
        },

        back() {
            f7.views.main?.router?.navigate("/home/", {
                reloadAll: true,
            });
        },
    },
};
</script>

<style scoped>
.gde-filters-actions {
    margin: 8px 0;
}
.gde-buttons-row {
    display: flex;
    width: 100%;
    gap: 8px;
}
.col-btn {
    flex: 1;
    text-align: center;
}
</style>
