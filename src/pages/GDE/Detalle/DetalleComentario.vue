<template>
    <f7-card>
        <f7-card-content>
            <!-- switches -->
            <div class="row row-toggles">
                <div class="col">
                    <f7-list>
                        <f7-list-item
                            checkbox
                            name="cosechaPagada"
                            :checked="form.cosechaPagada"
                            title="Cosecha pagada"
                            :disabled="soloLectura"
                            @change="onToggle('cosechaPagada', $event)"
                        />
                    </f7-list>
                </div>
                <div class="col">
                    <f7-list>
                        <f7-list-item
                            checkbox
                            name="maderaPagada"
                            :checked="form.maderaPagada"
                            title="Madera pagada"
                            :disabled="soloLectura"
                            @change="onToggle('maderaPagada', $event)"
                        />
                    </f7-list>
                </div>
            </div>

            <f7-list no-hairlines-md inset>
                <f7-list-input
                    label="Hora llegada"
                    type="datetime-local"
                    :value="form.horaLlegada"
                    :disabled="soloLectura"
                    @input="onInput('horaLlegada', $event)"
                />

                <f7-list-input
                    label="Sector origen"
                    type="text"
                    :value="form.sectorOrigen"
                    :disabled="soloLectura"
                    @input="onInput('sectorOrigen', $event)"
                />
                <f7-list-input
                    label="Destino"
                    type="text"
                    :value="form.destino"
                    :disabled="soloLectura"
                    @input="onInput('destino', $event)"
                />
                <f7-list-input
                    label="Guía proveedor"
                    type="text"
                    :value="form.guiaProveedor"
                    :disabled="soloLectura"
                    @input="onInput('guiaProveedor', $event)"
                />
                <f7-list-input
                    :label="`Volumen proveedor (${unidadMedidaLabel})`"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    :value="form.volumenProveedor"
                    :disabled="soloLectura"
                    @input="onInputNum('volumenProveedor', $event)"
                />
                <f7-list-input
                    label="Fecha Corta"
                    type="date"
                    :value="form.anioCosecha"
                    :disabled="soloLectura"
                    :max="hoy"
                    @input="onInput('anioCosecha', $event)"
                />
                <!-- DESDE RODAL (semilla) — bloqueados -->
                <f7-list-input
                    label="Fecha Plantación"
                    type="text"
                    :value="fechaPlantacionFormateada"
                    disabled
                />

                <f7-list-input
                    label="Plan de Manejo"
                    type="text"
                    :value="form.planManejo"
                    disabled
                />

                <f7-list-input
                    label="Punto X"
                    type="number"
                    inputmode="decimal"
                    step="0.000001"
                    :value="form.puntoX"
                    disabled
                />
                <f7-list-input
                    label="Punto Y"
                    type="number"
                    inputmode="decimal"
                    step="0.000001"
                    :value="form.puntoY"
                    disabled
                />

                <f7-list-input
                    label="Número Guía Anterior"
                    type="number"
                    inputmode="numeric"
                    @keypress="soloEntero"
                    :value="form.numeroGuiaAnterior"
                    :disabled="soloLectura"
                    @input="onInputNum('numeroGuiaAnterior', $event)"
                />

                <f7-list-input
                    label="Comentarios"
                    type="textarea"
                    resizable
                    :value="form.comentarios"
                    :disabled="soloLectura"
                    @input="onInput('comentarios', $event)"
                />

                <f7-list-input
                    label="Hora Agendamiento"
                    type="time"
                    :value="form.horaAgendamiento"
                    :disabled="soloLectura"
                    @input="onInput('horaAgendamiento', $event)"
                />

                <f7-list-input
                    label="Número Agendamiento"
                    type="text"
                    :value="form.numeroAgendamiento"
                    :disabled="soloLectura"
                    @input="onInput('numeroAgendamiento', $event)"
                />
            </f7-list>
        </f7-card-content>
    </f7-card>
</template>

<script>
import { f7 } from "framework7-vue";

import {
    ensureComentariosInit,
    updateComentarios,
    COMENTARIOS_READONLY_KEYS,
} from "@/app/services/GdeComentarioService";


export default {
    name: "DetalleComentario",
    props: {
        doc: { type: Object, required: true },
        soloLectura: { type: Boolean, default: false },
    },

    data() {
        return {
            form: {
                cosechaPagada: false,
                maderaPagada: false,
                horaLlegada: null,
                horaSalida: null,
                sectorOrigen: "",
                destino: "",
                guiaProveedor: "",
                volumenProveedor: null,
                anioCosecha: null,
                fechaPlantacion: null, // ← semilla y bloqueado
                planManejo: "", // ← semilla y bloqueado
                puntoX: null,
                puntoY: null,
                comentarios: "",
                horaAgendamiento: null,
                numeroAgendamiento: null,
                numeroGuiaAnterior: null,
            },
            saving: false,
            pickerMesAnio: null,
        };
    },
    async mounted() {
        const base = await ensureComentariosInit(this.doc._id);
        this.form = { ...this.form, ...base };

        this.$emit("doc-updated", { comentarios: { ...base } });
    },

    beforeDestroy() {
        if (this.pickerMesAnio) {
            this.pickerMesAnio.destroy();
            this.pickerMesAnio = null;
        }
    },

    computed: {
        fechaPlantacionFormateada() {
            return this.formatFecha(this.form.fechaPlantacion);
        },
        anioCosechaVisual() {
            const norm = this.normalizeYYYYMM(this.form.anioCosecha);
            return norm ? this.formatMMYYYY(norm) : "";
        },
        unidadMedidaLabel() {
            const u = this.doc?.producto?.unidadMedida;

            return u ? String(u) : "m³/ton";
        },
        hoy() {
            return this.fechaActualYmd();
        },
    },
    methods: {
        openMesAnioPicker() {
            if (this.soloLectura) return;
            if (this.pickerMesAnio) this.pickerMesAnio.open();
        },

        soloEntero(e) {
            if ([".", ",", "e", "-"].includes(e.key)) {
                e.preventDefault();
            }
        },
        _val(eOrVal) {
            return typeof eOrVal === "object" ? eOrVal?.target?.value : eOrVal;
        },

        async _save(patch) {
            // no permitir actualizar campos solo-lectura
            for (const k of COMENTARIOS_READONLY_KEYS) delete patch[k];

            if (!Object.keys(patch).length) return; // nada que guardar
            if (this.saving) return;

            this.saving = true;
            try {
                const next = await updateComentarios(this.doc._id, patch);
                this.form = { ...this.form, ...patch };
                this.$emit("doc-updated", { comentarios: next });
            } finally {
                this.saving = false;
            }
        },

        onToggle(key, evt) {
            const checked = !!evt?.target?.checked;
            this._save({ [key]: checked });
        },
        onInput(key, evt) {
            this._save({ [key]: this._val(evt) ?? "" });
        },
        onInputNum(key, evt) {
            const n = Number(this._val(evt));
            this._save({ [key]: isNaN(n) ? null : n });
        },
        onInputInt(key, evt) {
            const n = parseInt(this._val(evt), 10);
            this._save({ [key]: isNaN(n) ? null : n });
        },
    },
};
</script>

<style scoped>
.row-toggles {
    margin-bottom: 8px;
}
</style>
