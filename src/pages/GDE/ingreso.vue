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
                accordion-opened
                title="Información del cliente"
                class="cliente-info"
                ref="clienteAccordion"
                v-if="form.cliente"
            >
                <f7-accordion-content>
                    <informacion-cliente
                        v-if="form.cliente"
                        :cliente="form.cliente"
                        :indicador-traslado="form.indicadorTraslado"
                    >
                    </informacion-cliente>
                </f7-accordion-content>
            </f7-list-item>

            <f7-list-item
                v-if="form.cliente"
                :key="form.cliente?.rutCliente"
                title="Destino"
                class="destino-cliente"
                ref="destinoCliente"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.destino?.destinoCliente || ''"
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

            <f7-list-item
                accordion-item
                accordion-opened
                title="Información del destino"
                class="destino-info"
                ref="destinoAccordion"
                v-if="form.destino"
            >
                <f7-accordion-content>
                    <InformacionDestino
                        v-if="form.destino"
                        :destino="form.destino"
                    />
                </f7-accordion-content>
            </f7-list-item>

            <f7-list-item
                v-if="form.destino"
                checkbox
                checkbox-icon="end"
                title="Trasvasije"
                v-model:checked="form.trasvasije"
                :disabled="form.ventaPiso"
                @change="handleTrasvasijeChange"
            />

            <f7-list-item
                v-if="form.destino"
                checkbox
                checkbox-icon="end"
                title="Venta en piso"
                v-model:checked="form.ventaPiso"
                :disabled="form.trasvasije"
                @change="handleVentaPisoChange"
            />

            <f7-list-item v-if="form.destino">
                <f7-block class="mb-2 no-margin-top">
                    <div
                        class="alert alert-info"
                        style="
                            border: 1px solid #bce8f1;
                            background-color: #d9edf7;
                            color: #31708f;
                            border-radius: 6px;
                            padding: 10px 15px;
                            font-size: 14px;
                        "
                    >
                        <i
                            class="f7-icons"
                            style="font-size: 16px; margin-right: 6px"
                            >info_circle</i
                        >
                        Seleccionar entre <strong>Trasvasije</strong> o
                        <strong>Venta en piso</strong>. Al elegir una opción, la
                        otra se deshabilitará automáticamente.
                    </div></f7-block
                >
            </f7-list-item>

            <f7-list-item
                v-if="form.destino"
                :key="form.destino?.destinoCliente"
                title="Producto"
                class="rroducto"
                ref="producto"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.producto?.codProducto || ''"
                    @change="handleProductoChange"
                >
                    <option value="" disabled>Seleccione un Producto</option>
                    <option
                        v-for="p in productos"
                        :key="p.codProducto"
                        :value="p.codProducto"
                    >
                        {{ p.nombreProducto }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                accordion-item
                accordion-opened
                title="Información del producto"
                class="producto-info"
                ref="productoAccordion"
                v-if="form.producto"
            >
                <f7-accordion-content>
                    <InformacionProducto
                        v-if="form.producto"
                        :producto="form.producto"
                    />
                </f7-accordion-content>
            </f7-list-item>

            <f7-list-item
                v-if="form.producto"
                :key="form.producto?.codProducto"
                title="Largo (Metros)"
                class="largo-producto"
                ref="largoProducto"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.largoProducto || ''"
                    v-model.number="form.largoProducto"
                >
                    <option value="" disabled>
                        Seleccione un Largo (Metros)
                    </option>
                    <option v-for="p in largosProducto" :key="p" :value="p">
                        {{ p }} Metro(s)
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
import {
    listarProductosPorClienteDestino,
    listarLargosPorProducto,
} from "@/app/services/Parametros/ProductoService";
import InformacionCliente from "@/pages/GDE/Ingreso/InformacionCliente.vue";
import InformacionDestino from "@/pages/GDE/Ingreso/InformacionDestino.vue";
import InformacionProducto from "@/pages/GDE/Ingreso/InformacionProducto.vue";
import store from "@/js/store";
import {
    listarDestinosPorCliente,
    clienteEsEmisor,
} from "@/app/services/Parametros/ClienteService";
import { obtenerEmpresa } from "@/app/services/Parametros/EmpresaService";
import config from "@/Common/json/config.json";

export default {
    name: "GDEIngreso",
    components: { InformacionCliente, InformacionDestino, InformacionProducto },
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
            productos: [],
            largosProducto: [],
            form: {
                empresa: null,
                zona: null, // objeto zona seleccionado
                proveedor: null, // objeto proveedor seleccionado
                predio: null, // objeto predio seleccionado
                cliente: null, // objeto cliente seleccionado
                destino: null,
                indicadorTraslado: config.parametros.indicadoresTraslado.VENTA,
                trasvasije: false,
                ventaPiso: false,
                producto: null,
                largoProducto: null,
            },
        };
    },
    computed: {
        usuarioActivo() {
            return store.state.user;
        },
        indicadoresTraslado() {
            return config.parametros.indicadoresTraslado;
        },
    },
    async created() {
        this.empresa = await obtenerEmpresa(this.usuarioActivo.empresa);
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

            this.destinos = nuevoCliente
                ? await listarDestinosPorCliente(
                      this.form.zona.codigo,
                      this.form.proveedor.rutProveedor,
                      this.form.predio.rolPredio,
                      this.form.cliente.rutCliente
                  )
                : [];

            if (this.destinos.length === 1) {
                this.form.destino = this.destinos[0];
                await this.$nextTick();
                f7.smartSelect
                    .get(".destino-cliente .smart-select")
                    .setValueText(this.form.destino.destinoCliente);
                this.cargarInformacionDestino();
                this.cargarProductos();
            }

            this.obtenerIndicadorTraslado();

            const ref = this.$refs.clienteAccordion;
            const el = ref?.$el || ref?.el || ref; // el DOM real
            if (el) f7.accordion.open(el);
        },

        obtenerIndicadorTraslado() {
            if (
                clienteEsEmisor(this.form.cliente.rutCliente, this.empresa.rut)
            ) {
                this.indicadorTraslado = this.indicadoresTraslado.TRASLADO;
            }
        },
        async handleDestinoChange(e) {
            const nuevoDestino = e.target.value;
            this.form.destino =
                this.destinos.find((p) => p.destino === nuevoDestino) || null;
            await this.$nextTick();
            this.cargarInformacionDestino();
            this.cargarProductos();
        },

        async handleProductoChange(e) {
            const nuevoProducto = Number(e.target.value);
            this.form.producto =
                this.productos.find((p) => p.codProducto === nuevoProducto) ||
                null;

            await this.$nextTick();

            this.largosProducto = this.form.destino
                ? await listarLargosPorProducto(
                      this.form.zona.codigo,
                      this.form.proveedor.rutProveedor,
                      this.form.predio.rolPredio,
                      this.form.cliente.rutCliente,
                      this.form.destino.destinoCliente,
                      nuevoProducto
                  )
                : [];

            if (this.largosProducto.length === 1) {
                this.form.largoProducto = this.largosProducto[0];
                await this.$nextTick();
                f7.smartSelect
                    .get(".largo-producto .smart-select")
                    .setValueText(this.form.largoProducto);
            }

            this.cargarInformacionProducto();
        },

        cargarInformacionProducto() {
            const ref = this.$refs.productoAccordion;
            const el = ref?.$el || ref?.el || ref; // el DOM real
            if (el) f7.accordion.open(el);
        },

        async cargarProductos() {
            this.productos = this.form.destino
                ? await listarProductosPorClienteDestino(
                      this.form.zona.codigo,
                      this.form.proveedor.rutProveedor,
                      this.form.predio.rolPredio,
                      this.form.cliente.rutCliente,
                      this.form.destino.destinoCliente
                  )
                : [];
        },

        cargarInformacionDestino() {
            const ref = this.$refs.destinoAccordion;
            const el = ref?.$el || ref?.el || ref; // el DOM real
            if (el) f7.accordion.open(el);
        },

        handleTrasvasijeChange(val) {
            if (val) {
                this.form.ventaPiso = false; // al marcar trasvasije, desmarca venta piso
            }
        },
        handleVentaPisoChange(val) {
            if (val) {
                this.form.trasvasije = false; // al marcar venta piso, desmarca trasvasije
            }
        },

        back() {
            f7.dialog.confirm(
                "¿Desea cancelar el ingreso de GDE?",
                "Confirmar",
                () => {
                    f7.views.main?.router?.navigate("/home/", {
                        reloadAll: true,
                    });
                }
            );
        },
    },
};
</script>
