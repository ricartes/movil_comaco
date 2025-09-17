<template>
    <f7-page data-name="gde">
        <f7-navbar>
            <f7-nav-left>
                <f7-link @click="back">
                    <f7-icon icon="icon-back" />
                </f7-link>
            </f7-nav-left>
            <f7-nav-title>Ingreso GDE</f7-nav-title>
        </f7-navbar>

        <f7-list no-hairlines-md form>
            <!-- ZONA -->
            <f7-list-item
                title="Zona"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.zona?.codigo || ''"
                    @change="handleZonaChange"
                >
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

            <!-- PROVEEDOR -->

            <!-- PROVEEDOR: depende de zona -->
            <f7-list-item
                v-if="form.zona"
                :key="form.zona?.codigo"
                title="Proveedor"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.proveedor?.rutProveedor || ''"
                    @change="handleProveedorChange"
                >
                    <option value="" disabled>Seleccione un Proveedor…</option>
                    <option
                        v-for="p in proveedores"
                        :key="p.rutProveedor"
                        :value="p.rutProveedor"
                    >
                        {{ p.nomProveedor }}
                    </option>
                </select>
            </f7-list-item>

            <!-- PREDIO: depende de proveedor -->
            <f7-list-item
                v-if="form.proveedor"
                :key="form.proveedor?.rutProveedor"
                title="Predio"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.predio?.rolPredio || ''"
                    @change="handlePredioChange"
                >
                    <option value="" disabled>Seleccione un Predio</option>
                    <option
                        v-for="p in predios"
                        :key="p.rolPredio"
                        :value="p.rolPredio"
                    >
                        {{ p.predio }}
                    </option>
                </select>
            </f7-list-item>

            <!-- CLIENTE: depende de predio -->
            <f7-list-item
                v-if="form.predio"
                :key="form.predio?.rolPredio"
                title="Cliente"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.cliente?.rutCliente || ''"
                    @change="handleClienteChange"
                >
                    <option value="" disabled>Seleccione un Cliente</option>
                    <option
                        v-for="p in clientes"
                        :key="p.rutCliente"
                        :value="p.rutCliente"
                    >
                        {{ p.rutCliente }} {{ p.razonSocialCliente }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                accordion-item
                :accordion-opened="true"
                title="Información del cliente"
                v-if="form.cliente"
            >
                <f7-accordion-content>
                    <div class="card data-table data-table-init">
                        <div class="card-content">
                            <table>
                                <tbody>
                                    <tr>
                                        <td class="label-cell">RUT</td>
                                        <td class="numeric-cell">
                                            {{ form.cliente.rutCliente }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="label-cell">Razón Social</td>
                                        <td class="numeric-cell">
                                            {{
                                                form.cliente.razonSocialCliente
                                            }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="label-cell">Comuna</td>
                                        <td class="numeric-cell">
                                            {{ form.cliente.comunaCliente }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="label-cell">Ciudad</td>
                                        <td class="numeric-cell">
                                            {{ form.cliente.ciudadCliente }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="label-cell">Giro</td>
                                        <td class="numeric-cell">
                                            {{ form.cliente.giroCliente }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="label-cell">Teléfono</td>
                                        <td class="numeric-cell">
                                            {{
                                                form.cliente.telefonoCliente ||
                                                "—"
                                            }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </f7-accordion-content>
            </f7-list-item>

            <f7-list-item
                v-if="form.cliente"
                :key="form.cliente?.rutCliente"
                title="Destino"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.cliente?.destinoCliente || ''"
                    @change="handleDestinoChange"
                >
                    <option value="" disabled>Seleccione un Destino</option>
                    <option
                        v-for="p in destinos"
                        :key="p.destinoCliente"
                        :value="p.destinoCliente"
                    >
                        {{ p.destinoCliente }}
                    </option>
                </select>
            </f7-list-item>
        </f7-list>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import { listarPorEmpresa } from "@/app/services/Parametros/ZonaService";
import { listarProveedoresPorZona } from "@/app/services/Parametros/ProveedorService";
import { listarPrediosPorProveedor } from "@/app/services/Parametros/PredioService";
import { listarClientesPorPredio } from "@/app/services/Parametros/ClienteService";
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
                searchbarPlaceholder: "Buscar",
            },
            zonas: [],
            proveedores: [],
            predios: [],
            clientes: [],
            destinos: [],
            form: {
                zona: null, // objeto zona seleccionado
                proveedor: null, // objeto proveedor seleccionado
                predio: null, // objeto predio seleccionado
                cliente: null, // objeto cliente seleccionado
                destino: null,
            },
        };
    },
    computed: {
        usuarioActivo() {
            return store.state.user;
        },
    },
    async created() {
        this.zonas = await listarPorEmpresa(this.usuarioActivo.empresa);
    },
    methods: {
        async handleZonaChange(e) {
            const nuevoCodigo = e.target.value;
            const nuevaZona =
                this.zonas.find((z) => z.codigo === nuevoCodigo) || null;

            const aplicarCambio = async () => {
                this.form.zona = nuevaZona;

                // limpiar dependientes
                this.form.proveedor = null;
                this.proveedores = [];
                this.form.predio = null;
                this.predios = [];

                await this.$nextTick(); // fuerza re-render de los smart-select dependientes

                // cargar proveedores de la zona seleccionada
                this.proveedores = nuevaZona
                    ? await listarProveedoresPorZona(nuevaZona.codigo)
                    : [];
            };

            if (this.form.proveedor || this.form.predio) {
                f7.dialog.confirm(
                    "Cambiar la zona limpiará Proveedor y Predio. ¿Desea continuar?",
                    aplicarCambio
                );
            } else {
                await aplicarCambio();
            }
        },

        async handleProveedorChange(e) {
            const nuevoRut = e.target.value;
            const nuevoProv =
                this.proveedores.find((p) => p.rutProveedor === nuevoRut) ||
                null;

            // limpiar predio antes de recargar lista
            this.form.proveedor = nuevoProv;
            this.form.predio = null;
            this.form.cliente = null;
            this.predios = [];
            this.clientes = [];

            await this.$nextTick(); // re-render del smart-select "Predio"

            this.predios = nuevoProv
                ? await listarPrediosPorProveedor(
                      this.form.zona.codigo,
                      nuevoProv.rutProveedor
                  )
                : [];
        },

        async handlePredioChange(e) {
            const nuevoPredio = e.target.value;
            this.form.predio =
                this.predios.find((p) => p.rolPredio === nuevoPredio) || null;

            this.form.cliente = null;
            this.clientes = [];
            await this.$nextTick();

            this.clientes = nuevoPredio
                ? await listarClientesPorPredio(
                      this.form.zona.codigo,
                      this.form.proveedor.rutProveedor,
                      nuevoPredio.rolPredio
                  )
                : [];
        },

        async handleClienteChange(e) {
            const nuevoCliente = e.target.value;
            this.form.cliente =
                this.clientes.find((p) => p.rutCliente === nuevoCliente) ||
                null;

            this.form.destino = null;
            this.destinos = [];
            await this.$nextTick();
        },

        async handleDestinoChange(e) {
            const nuevoDestino = e.target.value;
            this.form.destino =
                this.destinos.find((p) => p.destino === nuevoDestino) || null;
        },

        back() {
            f7.dialog.confirm(
                "¿Desea cancelar el ingreso de GDE?",
                "Confirmar",
                () => {
                    this.$f7.views.main?.router?.navigate("/home/", {
                        reloadAll: true,
                    });
                }
            );
        },
    },
};
</script>
