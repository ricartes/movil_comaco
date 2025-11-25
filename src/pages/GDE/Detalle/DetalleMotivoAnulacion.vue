<template>
    <f7-list no-hairlines-md form>
        <f7-list-item
            title="Motivo"
            class="select-motivo-anulacion"
            smart-select
            :smart-select-params="ssParams"
        >
            <select
                :value="motivoAnulacionSeleccionado?.id || ''"
                @change="handleMotivoAnulacionChange"
            >
                <option value="" disabled>Seleccionar Motivo</option>
                <option
                    v-for="z in motivosAnulacion"
                    :key="`${z.empId}${z.id}`"
                    :value="z.id"
                >
                    {{ z.glosa }}
                </option>
            </select>
        </f7-list-item>
    </f7-list>

    <!-- Bloque de glosa + botón, solo si hay motivo seleccionado -->
    <f7-list v-if="motivoAnulacionSeleccionado" no-hairlines-md form>
        <!-- Input de glosa solo si requiereGlosa === true -->
        <f7-list-input
            v-if="motivoAnulacionSeleccionado.requiereGlosa"
            label="Detalle del motivo"
            type="text"
            placeholder="Máx. 50 caracteres"
            :value="glosaAdicional"
            @input="handleGlosaChange"
            maxlength="50"
            clear-button
        >
            <template #info> {{ glosaAdicional.length }} / 50 </template>
        </f7-list-input>
    </f7-list>

    <f7-block v-if="puedeConfirmar">
        <f7-button fill large color="blue" @click="confirmarConDialogo">
            Anular
        </f7-button>
    </f7-block>
</template>

<script>
import store from "@/js/store";
import { listarMotivosAnulacion } from "@/app/services/Parametros/MotivoAnulacionService";
import { f7 } from "framework7-vue";

export default {
    name: "MotivoAnulacionSelect",

    emits: ["confirmar"],

    data() {
        return {
            motivosAnulacion: [],
            motivoAnulacionSeleccionado: null,
            glosaAdicional: "", // 👈 importante para evitar undefined.length
            ssParams: {
                openIn: "popup",
                searchbar: true,
                closeOnSelect: true,
                sheetCloseLinkText: "Listo",
                searchbarPlaceholder: "Buscar",
            },
        };
    },
    computed: {
        usuarioActivo() {
            return store.state.user;
        },
        puedeConfirmar() {
            if (!this.motivoAnulacionSeleccionado) return false;

            if (this.motivoAnulacionSeleccionado.requiereGlosa) {
                return this.glosaAdicional.trim().length > 0;
            }

            return true;
        },
    },

    async created() {
        await this.cargarMotivosAnulacion();
    },

    methods: {
        async cargarMotivosAnulacion() {
            this.motivosAnulacion = await listarMotivosAnulacion(
                this.usuarioActivo.empresa
            );
        },

        handleMotivoAnulacionChange(e) {
            const idSeleccionado = e.target.value;

            this.motivoAnulacionSeleccionado =
                this.motivosAnulacion.find(
                    (o) => String(o.id) === String(idSeleccionado)
                ) || null;

            if (this.motivoAnulacionSeleccionado?.requiereGlosa) {
                this.glosaAdicional = "";
            } else {
                // 👉 Autorellenar automáticamente
                this.glosaAdicional = this.motivoAnulacionSeleccionado.glosa;
            }
        },

        handleGlosaChange(e) {
            const val = (e.target.value || "").slice(0, 50);
            this.glosaAdicional = val;
        },

        confirmarConDialogo() {
            f7.dialog.confirm(
                "¿Estás seguro que deseas anular esta guía?",
                "Confirmación",
                () => {
                    // Si confirma, llamamos a onConfirmar()
                    this.onConfirmar();
                }
            );
        },

        onConfirmar() {
            if (!this.motivoAnulacionSeleccionado) {
                f7.dialog.alert("Debe seleccionar un motivo de anulación.");
                return;
            }

            if (
                this.motivoAnulacionSeleccionado.requiereGlosa &&
                !this.glosaAdicional.trim()
            ) {
                f7.dialog.alert(
                    "Debe ingresar el detalle del motivo de anulación."
                );
                return;
            }
            const glosaFinal = this.motivoAnulacionSeleccionado.requiereGlosa
                ? this.glosaAdicional.trim()
                : this.motivoAnulacionSeleccionado.glosa;

            // Emitimos al padre
            this.$emit("confirmar", {
                motivoSeleccionado: this.motivoAnulacionSeleccionado,
                glosaAdicional: glosaFinal,
            });
        },
    },
};
</script>
