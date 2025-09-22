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
                class="select-predio"
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
                class="select-cliente"
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
                class="select-producto"
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
                v-if="form.producto && form.precioProducto"
            >
                <f7-accordion-content>
                    <InformacionProducto
                        v-if="form.producto && form.precioProducto"
                        :producto="form.producto"
                        :precioProducto="form.precioProducto"
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
                    @change="handleLargoProductoChange"
                >
                    <option value="" disabled>
                        Seleccione un Largo (Metros)
                    </option>
                    <option v-for="p in largosProducto" :key="p" :value="p">
                        {{ p }} Metro(s)
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                v-if="form.largoProducto"
                :key="`${form.producto?.codProducto}${form.largoProducto}`"
                title="Transportista"
                class="transportista"
                ref="transportista"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.transportista?.rutTransportista || ''"
                    @change="handleTransportistaChange"
                >
                    <option value="" disabled>
                        Seleccione un Transportista
                    </option>
                    <option
                        v-for="p in transportistas"
                        :key="p.rutTransportista"
                        :value="p.rutTransportista"
                    >
                        {{ p.rutTransportista }} {{ p.nomTransportista }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                v-if="form.transportista"
                :key="`${form.transportista?.rutTransportista}`"
                title="Patente Camión"
                class="patente-camion"
                ref="patenteCamion"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.patenteCamion?.patCamion || ''"
                    @change="handlePatenteCamionChange"
                >
                    <option value="" disabled>Seleccione Patente camión</option>
                    <option
                        v-for="p in patentes"
                        :key="p.patCamion"
                        :value="p.patCamion"
                    >
                        {{ p.patCamion }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item v-if="patenteCamionNoVigente">
                <f7-block class="mb-2 no-margin-top">
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
                        La <strong>patente del camión</strong> no se encuentra
                        vigente. <strong>No podrá continuar</strong> en la
                        emisión de la GDE.
                    </div>
                </f7-block>
            </f7-list-item>

            <f7-list-item
                v-if="this.form.patenteCamion && !patenteCamionNoVigente"
                :key="`${form.transportista?.rutTransportista}${form.patenteCamion?.patCamion}`"
                title="Patente Carro"
                class="patente-carro"
                ref="patenteCarro"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.patenteCarro || ''"
                    @change="handlePatenteCarroChange"
                >
                    <option value="" disabled>Seleccione Patente carro</option>
                    <option v-for="p in patentesCarro" :key="p" :value="p">
                        {{ p }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                v-if="this.form.patenteCarro"
                :key="`${form.patenteCarro}`"
                title="Conductor"
                class="conductor-select"
                ref="conductor"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.conductor?.rutChofer || ''"
                    @change="handleConductorChange"
                >
                    <option value="" disabled>Seleccione Conductor</option>
                    <option
                        v-for="p in conductores"
                        :key="p.rutChofer"
                        :value="p.rutChofer"
                    >
                        {{ p.nomChofer }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                v-if="this.form.conductor"
                :key="`${form.conductor.rutChofer}`"
                :title="`Carguios (${maximoCarguios})`"
                class="carguio-select"
                ref="carguio"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    name="carguios"
                    multiple
                    :maxlength="maximoCarguios"
                    @change="handleCarguioChange"
                >
                    <option
                        v-for="p in carguios"
                        :key="p.rutCarguio"
                        :value="p.rutCarguio"
                    >
                        {{ p.nombreCarguio }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                v-if="this.form.carguios.length === maximoCarguios"
                :title="`Patentes carguios (${maximoCarguios})`"
                class="patente-carguio-select"
                ref="patenteCarguio"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    name="patentes-carguios"
                    multiple
                    :maxlength="maximoCarguios"
                    @change="handlePatentesCarguioChange"
                >
                    <option v-for="p in patentesCarguio" :key="p" :value="p">
                        {{ p }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                v-if="
                    this.form.predio &&
                    this.form.patentesCarguio.length === maximoCarguios
                "
                :title="`Rodal`"
                class="rodal-select"
                ref="rodal"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.rodal?.codrodal || ''"
                    @change="handleRodalChange"
                >
                    <option value="" disabled>Seleccione Rodal</option>
                    <option
                        v-for="p in rodales"
                        :key="p.codrodal"
                        :value="p.codrodal"
                    >
                        {{ p.nomrodal }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                accordion-item
                accordion-opened
                title="Información del rodal"
                class="rodal-info"
                ref="rodalAccordion"
                v-if="form.rodal"
            >
                <f7-accordion-content>
                    <InformacionRodal v-if="form.rodal" :rodal="form.rodal" />
                </f7-accordion-content>
            </f7-list-item>

            <f7-list-item
                v-if="this.form.rodal"
                :title="`Empresa contratista`"
                class="empresa-contratista-select"
                ref="empresaContratista"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.empresaContratista?.rutContratista || ''"
                    @change="handleEmpresacontratistaChange"
                >
                    <option value="" disabled>
                        Seleccione Empresa contratista
                    </option>
                    <option
                        v-for="p in empresasContratista"
                        :key="p.rutContratista"
                        :value="p.rutContratista"
                    >
                        {{ p.nombreContratista }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                v-if="this.form.empresaContratista"
                :title="`Línea`"
                class="linea-contratista-select"
                ref="lineaContratista"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.linea?.codLinea || ''"
                    @change="handleLineacontratistaChange"
                >
                    <option value="" disabled>Seleccione Línea</option>
                    <option
                        v-for="p in lineasContratista"
                        :key="p.codLinea"
                        :value="p.codLinea"
                    >
                        {{ p.nombreLinea }}
                    </option>
                </select>
            </f7-list-item>
        </f7-list>

        <f7-block v-if="form.linea" class="text-align-center">
            <f7-button fill large color="blue" @click="ingresar">
                Ingresar
            </f7-button>
        </f7-block>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import { listarPorEmpresa } from "@/app/services/Parametros/ZonaService";
import { listarProveedoresPorZona } from "@/app/services/Parametros/ProveedorService";
import { listarPrediosPorProveedor } from "@/app/services/Parametros/PredioService";
import { listarClientesPorPredio } from "@/app/services/Parametros/ClienteService";
import {
    listarEmpresasContratistasPorOrigen,
    listarLineasPorOrigenYEmpresaContratista,
} from "@/app/services/Parametros/EmpresaContratistaService";
import {
    listarCarguios,
    listarPatentesCarguioPorRut,
} from "@/app/services/Parametros/CarguioService";
import {
    listarTransportistas,
    listarPatentesPorTransportista,
    listarPatentesCarroPorTransportistaCamion,
    listarConductoresPorCamionYCarro,
} from "@/app/services/Parametros/TransportistaService";
import {
    listarProductosPorClienteDestino,
    listarLargosPorProducto,
    obtenerPrecioProducto,
} from "@/app/services/Parametros/ProductoService";

import { obtenerOrdenCompra } from "@/app/services/Parametros/OrdenCompraService";

import InformacionCliente from "@/pages/GDE/Ingreso/InformacionCliente.vue";
import InformacionDestino from "@/pages/GDE/Ingreso/InformacionDestino.vue";
import InformacionProducto from "@/pages/GDE/Ingreso/InformacionProducto.vue";
import InformacionRodal from "@/pages/GDE/Ingreso/InformacionRodal.vue";
import store from "@/js/store";
import {
    listarDestinosPorCliente,
    clienteEsEmisor,
} from "@/app/services/Parametros/ClienteService";
import { listarRodalesPorOrigen } from "@/app/services/Parametros/RodalService";
import { obtenerEmpresa } from "@/app/services/Parametros/EmpresaService";
import { ingresarGde } from "@/app/services/GdeService";
import config from "@/Common/json/config.json";

export default {
    name: "GDEIngreso",
    components: {
        InformacionCliente,
        InformacionDestino,
        InformacionProducto,
        InformacionRodal,
    },
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
            transportistas: [],
            patentes: [],
            patentesCarro: [],
            conductores: [],
            carguios: [],
            patentesCarguio: [],
            rodales: [],
            empresasContratista: [],
            lineasContratista: [],
            form: {
                emisor: null,
                estado: config.parametros.estadosGuia.BORRADOR,
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
                precioProducto: null,
                largoProducto: null,
                transportista: null,
                patenteCamion: null,
                patenteCarro: null,
                conductor: null,
                carguios: [],
                patentesCarguio: [],
                rodal: null,
                empresaContratista: null,
                linea: null,
                ordenCompra: null,
                totales: {
                    mr: { volumen: 0, valor: 0 },
                    m3: { volumen: 0, valor: 0 },
                    ton: { volumen: 0, valor: 0 },
                },
            },
        };
    },
    computed: {
        patenteCamionNoVigente() {
            return (
                this.form?.patenteCamion != null &&
                this.form.patenteCamion.vigencia === false
            );
        },

        usuarioActivo() {
            return store.state.user;
        },
        indicadoresTraslado() {
            return config.parametros.indicadoresTraslado;
        },
        maximoCarguios() {
            return config.parametros.maximoCarguios;
        },
    },
    async created() {
        this.generarDatosEmisor();
        this.form.empresa = await obtenerEmpresa(this.usuarioActivo.empresa);
        this.zonas = await listarPorEmpresa(this.usuarioActivo.empresa);
        this.transportistas = await listarTransportistas();
        this.carguios = await listarCarguios();
    },
    methods: {
        generarDatosEmisor() {
            this.form.emisor = {
                rut: this.usuarioActivo.rut,
                empresa: this.usuarioActivo.empresa,
                nombre: this.usuarioActivo.nombre,
                email: this.usuarioActivo.email,
                rol: this.usuarioActivo.rol,
            };
        },
        async handleZonaChange(e) {
            const nuevoCodigo = e.target.value;
            const nuevaZona =
                this.zonas.find((z) => z.codigo === nuevoCodigo) || null;

            const aplicarCambio = async () => {
                this.resetDesde("zona"); // 👈 limpia todo
                this.form.zona = nuevaZona;

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

            this.resetDesde("proveedor"); // limpia desde proveedor en adelante
            this.form.proveedor = nuevoProv;
            await this.$nextTick(); // re-render del smart-select "Predio"

            this.predios = nuevoProv
                ? await listarPrediosPorProveedor(
                      this.form.zona.codigo,
                      nuevoProv.rutProveedor
                  )
                : [];

            if (this.predios.length === 1) {
                this.form.predio = this.predios[0];
                await this.$nextTick();
                this.cargarClientes();
                this.cargarRodales();
                f7.smartSelect
                    .get(".select-predio .smart-select")
                    .setValueText(this.form.predio.predio);
            }
        },

        async handlePredioChange(e) {
            const nuevoPredio = e.target.value;
            this.form.predio =
                this.predios.find((p) => p.rolPredio === nuevoPredio) || null;

            await this.$nextTick();
            this.resetDesde("predio"); // limpia desde predio en adelante
            this.cargarRodales();
            this.cargarClientes();
        },

        async cargarClientes() {
            this.form.cliente = null;
            this.clientes = this.form.predio
                ? await listarClientesPorPredio(
                      this.form.zona.codigo,
                      this.form.proveedor.rutProveedor,
                      this.form.predio.rolPredio
                  )
                : [];

            if (this.clientes.length === 1) {
                this.form.cliente = this.clientes[0];
                await this.$nextTick();
                this.cargarDestinosCliente();
                f7.smartSelect
                    .get(".select-cliente .smart-select")
                    .setValueText(
                        `${this.form.cliente.rutCliente} ${this.form.cliente.razonSocialCliente}`
                    );
            }
        },

        async handleClienteChange(e) {
            const nuevoCliente = e.target.value;
            this.form.cliente =
                this.clientes.find((p) => p.rutCliente === nuevoCliente) ||
                null;

            this.resetDesde("cliente"); // limpia desde predio en adelante
            await this.$nextTick();
        },

        async cargarDestinosCliente() {
            this.destinos = this.form.cliente
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
                clienteEsEmisor(
                    this.form.cliente.rutCliente,
                    this.form.empresa.rut
                )
            ) {
                this.indicadorTraslado = this.indicadoresTraslado.TRASLADO;
            }
        },
        async handleDestinoChange(e) {
            const nuevoDestino = e.target.value;
            this.form.destino =
                this.destinos.find((p) => p.destino === nuevoDestino) || null;
            await this.$nextTick();
            this.resetDesde("destino"); // limpia desde destino en adelante
            this.cargarInformacionDestino();
            this.cargarProductos();
        },

        async handleProductoChange(e) {
            const nuevoProducto = Number(e.target.value);
            this.form.producto =
                this.productos.find((p) => p.codProducto === nuevoProducto) ||
                null;

            await this.$nextTick();
            this.resetDesde("producto"); // limpia desde producto en adelante
            this.cargarPrecioProducto();
            this.cargarLargosProducto();
            await this.$nextTick();
            this.cargarInformacionProducto();
        },

        async obtenerOrdenCompra() {
            this.form.ordenCompra = await obtenerOrdenCompra(
                this.form.zona.codigo,
                this.form.proveedor.rutProveedor,
                this.form.predio.rolPredio,
                this.form.cliente.rutCliente,
                this.form.destino.destinoCliente,
                this.form.producto.codProducto,
                this.form.largoProducto
            );
        },

        async handleLargoProductoChange(e) {
            await this.obtenerOrdenCompra();
        },

        async cargarPrecioProducto() {
            if (this.form.producto) {
                this.form.precioProducto = await obtenerPrecioProducto(
                    this.usuarioActivo.empresa,
                    this.form.producto.codProducto,
                    this.form.cliente.rutCliente
                );
            } else {
                this.form.precioProducto = null;
            }
        },

        async cargarLargosProducto() {
            this.largosProducto = this.form.destino
                ? await listarLargosPorProducto(
                      this.form.zona.codigo,
                      this.form.proveedor.rutProveedor,
                      this.form.predio.rolPredio,
                      this.form.cliente.rutCliente,
                      this.form.destino.destinoCliente,
                      this.form.producto.codProducto
                  )
                : [];

            if (this.largosProducto.length === 1) {
                this.form.largoProducto = this.largosProducto[0];
                await this.obtenerOrdenCompra();
                await this.$nextTick();
                f7.smartSelect
                    .get(".largo-producto .smart-select")
                    .setValueText(this.form.largoProducto);
            }
        },

        async handleTransportistaChange(e) {
            const nuevoTransportista = e.target.value;
            this.form.transportista =
                this.transportistas.find(
                    (p) => p.rutTransportista === nuevoTransportista
                ) || null;

            await this.$nextTick();
            this.resetDesde("transportista"); // limpia desde transportista en adelante

            this.patentes = this.form.transportista
                ? await listarPatentesPorTransportista(nuevoTransportista)
                : [];
        },

        async handlePatenteCamionChange(e) {
            const nuevaPatente = e.target.value;
            this.form.patenteCamion =
                this.patentes.find((p) => p.patCamion === nuevaPatente) || null;

            await this.$nextTick();
            this.resetDesde("patCamion"); // limpia desde patente camion en adelante

            this.patentesCarro =
                await listarPatentesCarroPorTransportistaCamion(
                    this.form.transportista.rutTransportista,
                    nuevaPatente
                );

            if (this.patentesCarro.length === 1) {
                this.form.patenteCarro = this.patentesCarro[0];
                await this.$nextTick();
                f7.smartSelect
                    .get(".patente-carro .smart-select")
                    .setValueText(this.form.patenteCarro);
                this.cargarConductores();
            }
        },

        async handlePatenteCarroChange(e) {
            this.resetDesde("patCarro"); // limpia desde patente carro en adelante
            this.cargarConductores();
        },

        async cargarConductores() {
            this.conductores = this.form.patenteCarro
                ? await listarConductoresPorCamionYCarro(
                      this.form.transportista.rutTransportista,
                      this.form.patenteCamion.patCamion,
                      this.form.patenteCarro
                  )
                : [];

            if (this.conductores.length === 1) {
                this.form.conductor = this.conductores[0];
                await this.$nextTick();
                f7.smartSelect
                    .get(".conductor-select .smart-select")
                    .setValueText(this.form.conductor.nomChofer);
            }
        },

        async handleConductorChange(e) {
            const nuevoConductor = e.target.value;
            this.form.conductor =
                this.conductores.find((p) => p.rutChofer === nuevoConductor) ||
                null;

            await this.$nextTick();
        },

        async handleCarguioChange(e) {
            // array de valores seleccionados
            const values = Array.from(e.target.selectedOptions).map(
                (o) => o.value
            );
            // buscar los objetos carguio correspondientes
            this.form.carguios = values
                .map((v) => this.carguios.find((p) => p.rutCarguio === v))
                .filter(Boolean); // descarta nulls*/

            await this.$nextTick();
            this.resetDesde("carguio"); // limpia dependencias
            this.cargarPatentesCarguio();
        },

        async handlePatentesCarguioChange(e) {
            const values = Array.from(e.target.selectedOptions).map(
                (o) => o.value
            );
            // buscar los objetos carguio correspondientes
            this.form.patentesCarguio = values
                .map((v) => this.patentesCarguio.find((p) => p === v))
                .filter(Boolean); // descarta nulls*/

            await this.$nextTick();
            this.resetDesde("patenteCarguio"); // limpia dependencias
        },

        async cargarPatentesCarguio() {
            // si no hay carguios seleccionados, resetea
            if (!this.form.carguios?.length) {
                this.patentesCarguio = [];
                return;
            }

            // array de ruts seleccionados
            const ruts = this.form.carguios.map((c) => c.rutCarguio);

            // obtener las patentes de todos los ruts seleccionados
            const resultados = await Promise.all(
                ruts.map((rut) => listarPatentesCarguioPorRut(rut))
            );

            // aplanar y quitar duplicados
            const set = new Set();
            this.patentesCarguio = resultados.flat().filter((p) => {
                if (set.has(p)) return false;
                set.add(p);
                return true;
            });
        },

        async handleRodalChange(e) {
            const nuevoRodal = Number(e.target.value);
            this.form.rodal =
                this.rodales.find((p) => p.codrodal === nuevoRodal) || null;

            await this.$nextTick();
            this.resetDesde("rodal"); // limpia desde rodal en adelante
            this.cargarInformacionRodal();
            this.cargarEmpresasContratistas();
        },

        async handleEmpresacontratistaChange(e) {
            const nuevaEmpresa = e.target.value;
            this.form.empresaContratista =
                this.empresasContratista.find(
                    (p) => p.rutContratista === nuevaEmpresa
                ) || null;
            await this.$nextTick();
            this.resetDesde("empresaContratista"); // limpia desde empresa contratista en adelante
            this.cargarLineasContratistas();
        },

        async handleLineacontratistaChange(e) {
            const nuevaLinea = Number(e.target.value);
            this.form.linea =
                this.lineasContratista.find((p) => p.codLinea === nuevaLinea) ||
                null;
            await this.$nextTick();
        },
        cargarInformacionRodal() {
            const ref = this.$refs.rodalAccordion;
            const el = ref?.$el || ref?.el || ref; // el DOM real
            if (el) f7.accordion.open(el);
        },
        async cargarInformacionProducto() {
            await this.$nextTick();
            const ref = this.$refs.productoAccordion;
            const el = ref?.$el || ref?.el || ref;
            if (el) f7.accordion.open(el);
        },
        // .

        async cargarRodales() {
            this.rodales = this.form.predio
                ? await listarRodalesPorOrigen(this.form.predio.rolPredio)
                : [];
        },

        async cargarEmpresasContratistas() {
            this.empresasContratista = this.form.predio
                ? await listarEmpresasContratistasPorOrigen(
                      this.form.predio.rolPredio
                  )
                : [];
        },

        async cargarLineasContratistas() {
            this.lineasContratista = this.form.empresaContratista
                ? await listarLineasPorOrigenYEmpresaContratista(
                      this.form.predio.rolPredio,
                      this.form.empresaContratista.rutContratista
                  )
                : [];
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

            if (this.productos.length === 1) {
                this.form.producto = this.productos[0];
                await this.$nextTick();
                f7.smartSelect
                    .get(".select-producto .smart-select")
                    .setValueText(this.form.producto.nombreProducto);
                await this.cargarPrecioProducto();
                await this.cargarLargosProducto();
                await this.$nextTick();
                this.cargarInformacionProducto();
            }
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

        resetDesde(nivel) {
            // Orden de dependencia: zona → proveedor → predio → cliente → destino → producto → largo → transportista → patCamion → patCarro → conductor
            if (nivel === "zona") {
                this.form.proveedor = null;
                this.proveedores = [];
                // sigue
                nivel = "proveedor";
            }
            if (nivel === "proveedor") {
                this.form.predio = null;
                this.predios = [];
                // sigue
                nivel = "predio";
            }
            if (nivel === "predio") {
                this.form.cliente = null;
                this.form.rodal = null;
                this.clientes = [];
                this.rodales = [];
                // sigue
                nivel = "cliente";
            }
            if (nivel === "cliente") {
                this.form.destino = null;
                this.destinos = [];
                // sigue
                nivel = "destino";
            }
            if (nivel === "destino") {
                this.form.producto = null;
                this.productos = [];
                this.form.largoProducto = null;
                this.largosProducto = [];
                // sigue
                nivel = "producto";
            }
            if (nivel === "producto") {
                this.form.largoProducto = null;
                this.largosProducto = [];
                // sigue
                nivel = "largo";
            }
            if (nivel === "largo") {
                this.form.transportista = null; // puedes mantener transportistas globales si quieres
                this.patentes = [];
                // sigue
                nivel = "transportista";
            }
            if (nivel === "transportista") {
                this.form.patenteCamion = null;
                this.patentes = [];
                // sigue
                nivel = "patCamion";
            }
            if (nivel === "patCamion") {
                this.form.patenteCarro = null;
                this.patentesCarro = [];
                // sigue
                nivel = "patCarro";
            }
            if (nivel === "patCarro") {
                this.form.conductor = null;
                this.conductores = [];
                nivel = "conductor";
            }
            if (nivel === "conductor") {
                this.form.carguios = [];
                nivel = "carguio";
            }
            if (nivel === "carguio") {
                this.patentesCarguio = [];
                this.form.patentesCarguio = [];
                nivel = "patenteCarguio";
            }
            if (nivel === "patenteCarguio") {
                this.form.rodal = null;
                nivel = "rodal";
            }
            if (nivel === "rodal") {
                this.form.empresaContratista = null;
                this.empresasContratista = [];
                nivel = "empresaContratista";
            }
            if (nivel === "empresaContratista") {
                this.form.linea = null;
                this.lineasContratista = [];
                nivel = "lineaContratista";
            }
        },

        async ingresar() {
            // guardar form en store
            //store.commit("setGDEForm", this.form);

            const gdeInsertada = await ingresarGde(this.form);
            f7.dialog.alert("GDE ingresada correctamente", "Éxito", () => {
                f7.views.main?.router?.navigate(
                    `/gde/detalle/${gdeInsertada._id}`,
                    {
                        //TODO: IR AL DETALLE
                        reloadAll: true,
                    }
                );
            });
            // navegar a ingreso detalles
            //f7.views.main.router.navigate("/gde/ingreso-detalles");
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
