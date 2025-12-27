<template>
    <f7-page name="importar-forestruck-preview">
        <f7-navbar title="Preview Forestruck" back-link="Volver" />

        <!-- ALERTA: no hay payload en store -->
        <f7-block v-if="!preview" strong class="alert-wrapper">
            <div class="alert alert-danger">
                <i class="f7-icons">exclamationmark_circle</i>
                No hay un archivo cargado para previsualizar. Vuelve y
                selecciona uno.
            </div>
            <div class="text-align-right" style="margin-top: 8px">
                <f7-button small outline color="red" @click="volver">
                    Volver
                </f7-button>
            </div>
        </f7-block>

        <template v-else>
            <!-- Info archivo -->
            <f7-block strong inset>
                <div style="display: flex; align-items: center; gap: 10px">
                    <f7-icon
                        :f7="
                            preview.imported
                                ? 'checkmark_circle_fill'
                                : 'doc_text_fill'
                        "
                        :color="preview.imported ? 'red' : 'green'"
                    />
                    <div style="flex: 1">
                        <div>
                            <b>{{ preview.file?.name || "Archivo" }}</b>
                        </div>
                        <div
                            class="text-color-gray"
                            style="font-size: 12px; margin-top: 4px"
                        >
                            Tamaño:
                            {{ (preview.file?.size || 0).toLocaleString() }}
                            bytes • Modificado:
                            {{
                                new Date(
                                    preview.file?.lastModified || 0
                                ).toLocaleString()
                            }}
                        </div>

                        <div style="margin-top: 4px">
                            <span
                                :class="
                                    preview.imported
                                        ? 'text-color-red'
                                        : 'text-color-green'
                                "
                            >
                                {{
                                    preview.imported ? "Integrado" : "Pendiente"
                                }}
                            </span>
                        </div>
                    </div>
                </div>
            </f7-block>

            <f7-block strong v-if="mappingOk && importSummary.length">
                <div class="text-color-gray">
                    Campos importados desde Forestruck
                </div>

                <div
                    v-for="g in importSummary"
                    :key="g.group"
                    style="margin-top: 10px"
                >
                    <div style="font-weight: 600; margin-bottom: 6px">
                        {{ g.group }}
                    </div>

                    <ul style="margin: 0; padding-left: 18px">
                        <li v-for="f in g.fields" :key="f.path">
                            <b>{{ f.label }}:</b> {{ formatSummaryField(f) }}
                        </li>
                    </ul>
                </div>
            </f7-block>

            <f7-block strong v-if="mappingOk">
                <div class="text-color-gray">JSON origen (debug)</div>
                <pre style="white-space: pre-wrap; font-size: 12px">{{
                    pretty(sourceJson)
                }}</pre>
            </f7-block>

            <f7-block strong v-if="mappingOk">
                <div class="text-color-gray">GDE draft mapeado</div>
                <pre style="white-space: pre-wrap; font-size: 12px">{{
                    pretty(form)
                }}</pre>
            </f7-block>

            <!-- Info directorio -->
            <f7-block class="mb-0" v-if="mappingOk && comboPlan?.length">
                <div class="text-color-gray">
                    Debe completar los siguientes datos para generar avanzar en
                    la importación de la Guía:
                </div>
            </f7-block>

            <f7-list no-hairlines-md form v-if="mappingOk && comboPlan?.length">
                <f7-list-item
                    v-for="c in comboPlan"
                    :key="c.key"
                    :title="comboRegistry[c.entity]?.title || c.key"
                    :class="`select-${c.key}`"
                    smart-select
                    :smart-select-params="ssParams"
                >
                    <select
                        :value="getComboValue(c.key, c.entity)"
                        @change="(e) => handleComboChange(c.key, c.entity, e)"
                    >
                        <option value="" disabled>
                            {{
                                comboRegistry[c.entity]?.placeholder ||
                                "Seleccione…"
                            }}
                        </option>

                        <option
                            v-for="it in comboOptions[c.entity] || []"
                            :key="comboRegistry[c.entity]?.value(it)"
                            :value="comboRegistry[c.entity]?.value(it)"
                        >
                            {{ comboRegistry[c.entity]?.label(it) }}
                        </option>
                    </select>
                </f7-list-item>
            </f7-list>

            <f7-block
                v-if="mappingOk && faltanCombos.length"
                strong
                class="alert-wrapper"
            >
                <div class="alert alert-info">
                    <i class="f7-icons">info_circle</i>
                    Faltan datos para continuar:
                    <b>
                        {{
                            faltanCombos
                                .map(
                                    (c) =>
                                        comboRegistry[c.entity]?.title || c.key
                                )
                                .join(", ")
                        }}
                    </b>
                </div>
            </f7-block>

            <f7-block v-if="mappingOk" class="text-align-center">
                <f7-button
                    fill
                    large
                    color="blue"

                    @click="importar"
                >
                    {{
                        preview.imported ? "Ya importada" : "Importar y Guardar"
                    }}
                </f7-button>
            </f7-block>

            <f7-block v-if="mappingLoading" strong class="alert-wrapper">
                <div class="alert alert-info">
                    <i class="f7-icons">hourglass</i>
                    Cargando mapping Forestruck…
                </div>
            </f7-block>

            <f7-block v-else-if="!mappingOk" strong class="alert-wrapper">
                <div class="alert alert-danger">
                    <i class="f7-icons">exclamationmark_circle</i>
                    {{ mappingErrorMsg }}
                </div>
            </f7-block>
        </template>
    </f7-page>
</template>

<script>
import store from "@/js/store";
import { f7 } from "framework7-vue";
import { FORESTRUCK_IMPORT_SUMMARY } from "@/app/mappers/Forestruck/ForestruckImportLabels";
import { buildForestruckImportSummary } from "@/app/mappers/Forestruck/ForestruckImportSummaryBuilder";

import {
    buildGdeDraftFromForestruck,
    getComboPlan,
} from "@/app/mappers/Forestruck/ForestruckMappingApplier";

import {
    listarParametrosGenerales,
    generarPorcentajeIva,
    obtenerParametroJSON,
} from "@/app/services/Parametros/ParametrosGeneralService";
import config from "@/Common/json/config.json"; // parametrosGenerales.forestruckMapping = 8
import { obtenerEmpresa } from "@/app/services/Parametros/EmpresaService";
import { FORESTRUCK_COMBO_REGISTRY } from "@/app/mappers/Forestruck/ForestruckComboRegistry";
import {
    registrarImportacionExitosa,
    registrarImportacionFallida,
} from "@/app/services/ForestruckImportService";

export default {
    name: "ImportarForestruckPreviewPage",

    data() {
        return {
            comboRegistry: FORESTRUCK_COMBO_REGISTRY,
            sourceJson: null,
            form: null,
            comboPlan: [],
            importSummary: [],
            ssParams: {
                openIn: "popup",
                searchbar: true,
                closeOnSelect: true,
                sheetCloseLinkText: "Listo",
                searchbarPlaceholder: "Buscar",
            },
            mappingLoading: false,
            mappingOk: false,
            mappingErrorMsg:
                "No se pudo cargar el mapping Forestruck (parámetro general ID 8).",
            mappingValue: null,
            combosLoading: false,
            comboOptions: {}, // { cliente: [...], transportista: [...] }
        };
    },

    computed: {
        preview() {
            return store.state?.forestruckPreview || null;
        },

        usuarioActivo() {
            return store.state?.user || null;
        },
        faltanCombos() {
            if (!this.mappingOk || !this.form) return [];
            const plan = Array.isArray(this.comboPlan) ? this.comboPlan : [];

            return plan.filter((c) => {
                const entity = c.entity;
                const def = this.comboRegistry?.[entity];
                if (!def?.value) return true; // si no tengo cómo evaluar, lo considero faltante

                const current = this.form?.[c.key];
                const v = current ? String(def.value(current) ?? "") : "";
                return !v; // vacío => falta
            });
        },

        puedeGuardar() {
            return (
                !!this.preview &&
                this.mappingOk &&
                !this.mappingLoading &&
                !this.combosLoading &&
                !!this.form &&
                this.faltanCombos.length === 0
            );
        },
    },

    async mounted() {
        await this.init();
    },

    methods: {
        volver() {
            f7.views.main?.router?.back();
        },

        async init() {
            // si no hay preview, no seguimos
            if (!this.preview) return;

            // 1) cargar mapping (ID 8)
            await this.cargarParametrosMapping();
            if (!this.mappingOk) return;

            // 2) construir draft
            await this.cargarPreview();
            // 3) generar datos emisor
            this.generarDatosEmisor();
            this.form.empresa = await obtenerEmpresa(
                this.usuarioActivo.empresa
            );
            this.form.parametrosGenerales = await listarParametrosGenerales(
                this.usuarioActivo.empresa
            );
            this.form.ivaPct = await generarPorcentajeIva(
                this.usuarioActivo.empresa
            );

            await this.cargarCombos();
        },

        generarDatosEmisor() {
            this.form.emisor = {
                rut: this.usuarioActivo.rut,
                empresa: this.usuarioActivo.empresa,
                nombre: this.usuarioActivo.nombre,
                email: this.usuarioActivo.email,
                rol: this.usuarioActivo.rol,
            };
        },

        async cargarParametrosMapping() {
            this.mappingLoading = true;
            this.mappingOk = false;
            this.mappingValue = null;
            this.mappingErrorMsg = null;

            try {
                const empresaId = this?.usuarioActivo?.empresa ?? 1;

                const parametros = await listarParametrosGenerales(empresaId);

                const mappingId =
                    config?.parametrosGenerales?.forestruckMapping ?? 8;

                const res = obtenerParametroJSON(
                    parametros,
                    empresaId,
                    mappingId,
                    {
                        glosa: "FORESTRUCK_MAPPING",
                        nombre: "parámetro general Forestruck Mapping",
                        validate: (m) => {
                            if (!m.blocks || typeof m.blocks !== "object")
                                return "El mapping no contiene 'blocks'.";
                            return null;
                        },
                    }
                );

                if (!res.ok) {
                    this.mappingErrorMsg = res.error;
                    return;
                }

                this.mappingValue = res.value;
                this.mappingOk = true;
            } catch (e) {
                console.error("cargarParametrosMapping:", e);
                this.mappingErrorMsg =
                    e?.message ||
                    "No se pudo cargar el mapping Forestruck (ID 8).";
            } finally {
                this.mappingLoading = false;
            }
        },

        async cargarPreview() {
            const preview = this.preview;

            this.sourceJson = preview?.json || null;

            // ✅ importante: mappingValue ya está cargado y validado
            this.form = buildGdeDraftFromForestruck(
                this.sourceJson,
                this.mappingValue
            );

            this.importSummary = buildForestruckImportSummary(
                this.mappingValue,
                FORESTRUCK_IMPORT_SUMMARY
            );

            // UI only
            this.comboPlan = getComboPlan(this.mappingValue);
        },

        async cargarCombos() {
            this.combosLoading = true;
            try {
                const entities = [
                    ...new Set(
                        (this.comboPlan || [])
                            .map((c) => c.entity)
                            .filter(Boolean)
                    ),
                ];

                const pairs = await Promise.all(
                    entities.map(async (entity) => {
                        const def = this.comboRegistry?.[entity];
                        if (!def?.list) return [entity, []];
                        const arr = await def.list();
                        return [entity, Array.isArray(arr) ? arr : []];
                    })
                );

                this.comboOptions = Object.fromEntries(pairs);
            } finally {
                this.combosLoading = false;
            }
        },

        getComboValue(key, entity) {
            const def = this.comboRegistry?.[entity];
            if (!def?.value) return "";
            const current = this.form?.[key];
            return current ? String(def.value(current) ?? "") : "";
        },

        handleComboChange(key, entity, e) {
            const def = this.comboRegistry?.[entity];
            if (!def?.value) return;

            const raw = String(e?.target?.value ?? "");
            const list = this.comboOptions?.[entity] || [];

            if (!raw) {
                this.form[key] = null;
                return;
            }

            const selected =
                list.find((it) => String(def.value(it)) === raw) || null;

            this.form[key] = selected;

            // 👇 Homologado: actualizar texto del SmartSelect como haces en Ingreso
            this.$nextTick(() => {
                try {
                    const ss = f7.smartSelect.get(
                        `.select-${key} .smart-select`
                    );
                    if (ss && selected) ss.setValueText(def.label(selected));
                } catch {}
            });
        },

        getByPath(obj, path) {
            if (!obj || !path) return undefined;
            return String(path)
                .split(".")
                .reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
        },

        formatSummaryField(field) {
            const v = this.getByPath(this.form, field?.path);
            if (typeof field?.fmt === "function") return field.fmt(v);
            return v == null ? "—" : String(v);
        },

        async importar() {
            if (!this.puedeGuardar) return;

            const preview = this.preview;
            const fileKey = preview?.fileKey || null;
            const file = preview?.file || null; // { name, uri, size, lastModified }
            const origenForestruck =
                config?.parametros?.origenGde?.forestruck ?? 2;

            f7.dialog.preloader("Guardando GDE importada…");

            try {
                // 1) ORIGEN
                this.form.gdeOrigen = origenForestruck;

                // 2) Homologar UM
                if (this.form?.producto) {
                    this.form.producto.unidadMedida =
                        this.homologarUnidadMedida(
                            this.form.producto.unidadMedida
                        );
                }

                // 3) Ubicación
                const ubicacion = await getLocationOnce();
                if (
                    !ubicacion ||
                    typeof ubicacion.lat !== "number" ||
                    typeof ubicacion.lng !== "number"
                ) {
                    throw new Error(
                        "No se pudo obtener la ubicación del dispositivo."
                    );
                }
                this.form.ubicacion = ubicacion;

                // 4) Guardar GDE
                const gdeInsertada = await ingresarGde(this.form);

                // 5) Registrar log exitoso (SERVICE)
                try {
                    await registrarImportacionExitosa({
                        fileKey,
                        file,
                        meta: {
                            gdeId: gdeInsertada?._id || null,
                            gdeOrigen: origenForestruck,
                            empId: this.usuarioActivo?.empresa ?? null,
                            rut: this.usuarioActivo?.rut ?? null,
                        },
                    });
                } catch (logErr) {
                    console.warn(
                        "No se pudo registrar log de importación:",
                        logErr
                    );
                    // no bloquea el éxito del guardado
                }

                // 6) UI
                try {
                    store.state.forestruckPreview.imported = true;
                } catch {}

                f7.dialog.alert("GDE importada correctamente.", "Éxito", () => {
                    f7.views.main?.router?.navigate(
                        `/gde/detalle/${gdeInsertada._id}`,
                        { reloadAll: true }
                    );
                });
            } catch (err) {
                console.error(err);

                // Log fallido (SERVICE)
                try {
                    await registrarImportacionFallida({
                        fileKey,
                        file,
                        error: err,
                        meta: {
                            gdeOrigen: origenForestruck,
                            empId: this.usuarioActivo?.empresa ?? null,
                            rut: this.usuarioActivo?.rut ?? null,
                        },
                    });
                } catch (logErr) {
                    console.warn("No se pudo registrar log fallido:", logErr);
                }

                f7.dialog.alert(
                    err?.message || "Ocurrió un error al importar la GDE.",
                    "Error"
                );
            } finally {
                try {
                    f7.dialog.close();
                } catch {}
            }
        },
    },

    watch: {
        preview: {
            deep: true,
            async handler() {
                await this.init();
            },
        },
    },
};
</script>


<style scoped>
.alert-wrapper {
    margin-top: 10px;
    margin-bottom: 10px;
}
.alert {
    width: 100%;
    box-sizing: border-box;
    border-radius: 6px;
    padding: 10px 15px;
    font-size: 14px;
    display: flex;
    align-items: center;
}
.alert i {
    font-size: 16px;
    margin-right: 6px;
}
.alert-danger {
    border: 1px solid #ebccd1;
    background: #f2dede;
    color: #a94442;
}

.json-box {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.35;
    background: #111;
    color: #eee;
    padding: 12px;
    border-radius: 8px;
    overflow: auto;
    max-height: 55vh;
}
</style>
