<template>
    <f7-page data-name="gde">
        <f7-navbar title="Ingreso GDE" />

        <f7-list no-hairlines-md form>
            <!-- ZONA -->
            <f7-list-item
                title="Zona"
                smart-select
                :smart-select-params="ssParams"
            >
                <select :value="form.zonaId" @change="handleZonaChange">
                    <option value="" disabled>Seleccione una zona…</option>
                    <option v-for="z in zonas" :key="z.id" :value="z.id">
                        {{ z.nombre }}
                    </option>
                </select>
            </f7-list-item>

            <!-- PATENTE -->
            <f7-list-item
                title="Patente"
                smart-select
                :smart-select-params="ssParams"
                v-if="form.zonaId"
            >
                <select :value="form.patente" @change="handlePatenteChange">
                    <option value="" disabled>Seleccione una patente…</option>
                    <option v-for="p in patentes" :key="p" :value="p">
                        {{ p }}
                    </option>
                    <option value="__new">➕ Ingresar patente…</option>
                </select>
            </f7-list-item>
        </f7-list>

        <!-- Campos dependientes -->
        <f7-list v-if="extrasVisible">
            <f7-list-input label="Conductor" v-model:value="form.conductor" />
            <f7-list-input label="Observación" v-model:value="form.obs" />
        </f7-list>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import { nextTick } from "vue";

export default {
    name: "GDEIngreso",
    data() {
        return {
            ssParams: { openIn: "sheet", searchbar: true, closeOnSelect: true },
            zonas: [],
            patentes: ["ABCJ45", "JKLF12", "PQRS89"],
            form: {
                zonaId: "",
                patente: "",
                conductor: "",
                obs: "",
            },
            extrasVisible: false,
            _prevZona: "",
            _prevPatente: "",
        };
    },
    async created() {
        await this.getZonas();
    },
    methods: {


        async getZonas(){


        },
        // ---- util: forzar re-render del select de zona
        async forceRebindZona(id) {
            const v = id; // guardar nuevo valor
            this.form.zonaId = null; // 1) blanquear
            await nextTick(); // 2) esperar re-render
            this.form.zonaId = v; // 3) reasignar
            this._prevZona = v;
        },

        resetDependencias() {
            this.form.patente = "";
            this.form.conductor = "";
            this.form.obs = "";
            this.extrasVisible = false;
            this._prevPatente = "";
        },

        // ---- ZONA
        async handleZonaChange(e) {
            const newZona = e.target.value;

            // si ya hay patente o extras visibles, pedir confirmación
            if (this.form.patente || this.extrasVisible) {
                f7.dialog.confirm(
                    "Cambiar la zona limpiará los datos (patente y campos). ¿Desea continuar?",
                    async () => {
                        this.resetDependencias();
                        await this.forceRebindZona(newZona);
                    },
                    async () => {
                        // cancelar: rebind con la zona anterior para “volver atrás”
                        await this.forceRebindZona(this._prevZona);
                    }
                );
                return;
            }

            // no hay dependencias -> solo rebind
            await this.forceRebindZona(newZona);
        },

        // ---- PATENTE
        handlePatenteChange(e) {
            const val = e.target.value;

            const setPatente = (v) => {
                this.form.patente = v;
                this._prevPatente = v;
                this.extrasVisible = !!v; // mostrar campos al tener patente
            };

            // opción de crear nueva patente
            if (val === "__new") {
                f7.dialog.prompt(
                    "Ingrese la patente",
                    (pat) => {
                        const clean = (pat || "")
                            .toUpperCase()
                            .replace(/\s+/g, "");
                        if (!clean) return;
                        if (!this.patentes.includes(clean))
                            this.patentes.unshift(clean);
                        setPatente(clean);
                    },
                    () => {
                        // canceló prompt -> volver a la anterior
                        setPatente(this._prevPatente);
                    }
                );
                return;
            }

            // si ya hay extras visibles y cambia a otra patente, confirmar limpieza
            if (this.extrasVisible && val !== this._prevPatente) {
                f7.dialog.confirm(
                    "Cambiar la patente limpiará los campos dependientes. ¿Desea continuar?",
                    () => {
                        this.form.conductor = "";
                        this.form.obs = "";
                        setPatente(val);
                    },
                    () => {
                        // cancelar -> revertir
                        setPatente(this._prevPatente);
                    }
                );
                return;
            }

            // asignación directa
            setPatente(val);
        },
    },
    mounted() {
        // inicial para “volver atrás” si cancela
        this._prevZona = this.form.zonaId;
        this._prevPatente = this.form.patente;
    },
};
</script>
