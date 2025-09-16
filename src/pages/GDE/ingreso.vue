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
                <select :value="form.zonaCodigo" @change="handleZonaChange">
                    <option value="" disabled>Seleccione una zona…</option>
                    <option
                        v-for="z in zonas"
                        :key="z.codigo"
                        :value="z.codigo"
                    >
                        {{ z.descripcion }}
                    </option>
                </select>
            </f7-list-item>

            <!-- TRANSPORTISTA (sin “agregar nuevo”) -->
            <f7-list-item
                v-if="form.zonaCodigo"
                title="Transportista"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.transportista"
                    @change="handleTransportistaChange"
                >
                    <option value="" disabled>
                        {{
                            transportistas.length
                                ? "Seleccione un transportista…"
                                : "No hay transportistas"
                        }}
                    </option>
                    <option v-for="t in transportistas" :key="t" :value="t">
                        {{ t }}
                    </option>
                </select>
            </f7-list-item>
        </f7-list>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import { nextTick } from "vue";
import { listarPorEmpresa } from "@/app/services/Parametros/ZonaService";
import store from "@/js/store";

export default {
    name: "GDEIngreso",
    data() {
        return {
            ssParams: {
                openIn: "popup",
                searchbar: true,
                closeOnSelect: true,
                sheetCloseLinkText: "Listo",
                searchbarPlaceholder: 'Buscar',
            },
            zonas: [],
            transportistas: [], // ← vacío por ahora
            form: {
                zonaCodigo: "",
                zona: null, // objeto completo de zona
                transportista: "", // string seleccionado
            },
            _prevZonaCodigo: "",
            _prevTransportista: "",
        };
    },
    computed: {
        usuarioActivo() {
            return store.state.user;
        },
    },
    async created() {
        await this.getZonas();
    },
    methods: {
        async getZonas() {
            this.zonas = await listarPorEmpresa(this.usuarioActivo.empresa);
            if (this.form.zonaCodigo) this.syncZona(this.form.zonaCodigo);
        },

        syncZona(codigo) {
            this.form.zonaCodigo = codigo || "";
            this.form.zona =
                this.zonas.find((z) => z.codigo === codigo) || null;
        },

        async forceRebindZona(codigo) {
            const v = codigo;
            this.syncZona(""); // limpia (evita re-montaje raro del smart select)
            await nextTick();
            this.syncZona(v);
            this._prevZonaCodigo = v;
        },

        resetDependencias() {
            // por ahora solo limpiar selección y lista
            this.form.transportista = "";
            this._prevTransportista = "";
            this.transportistas = []; // seguirá vacío hasta que cargues desde API
        },

        // --- ZONA
        async handleZonaChange(e) {
            const nuevoCodigo = e.target.value;

            if (this.form.transportista) {
                f7.dialog.confirm(
                    "Cambiar la zona limpiará el transportista seleccionado. ¿Desea continuar?",
                    async () => {
                        this.resetDependencias();
                        await this.forceRebindZona(nuevoCodigo);
                        // cuando tengas backend:
                        // this.transportistas = await TransportistaService.listarPorZona(nuevoCodigo)
                    },
                    async () => {
                        await this.forceRebindZona(this._prevZonaCodigo); // revertir
                    }
                );
                return;
            }

            this.resetDependencias();
            await this.forceRebindZona(nuevoCodigo);
            // cuando tengas backend:
            // this.transportistas = await TransportistaService.listarPorZona(nuevoCodigo)
        },

        // --- TRANSPORTISTA (simple, sin “nuevo”)
        handleTransportistaChange(e) {
            const val = e.target.value;
            this.form.transportista = val;
            this._prevTransportista = val;
        },
    },
    mounted() {
        this._prevZonaCodigo = this.form.zonaCodigo;
        this._prevTransportista = this.form.transportista;
    },
};
</script>
