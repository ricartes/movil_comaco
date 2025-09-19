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
                title="Carguio"
                class="carguio-select"
                ref="carguio"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.carguio?.rutCarguio || ''"
                    @change="handleCarguioChange"
                >
                    <option value="" disabled>Seleccione Carguio</option>
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
                v-if="this.form.carguio"
                :key="`${form.carguio.rutCarguio}`"
                title="Patente Carguio"
                class="patente-carguio-select"
                ref="patenteCarguio"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="form.patenteCarguio || ''"
                    @change="handleCarguioChange"
                >
                    <option value="" disabled>Seleccione Carguio</option>
                    <option v-for="p in patentesCarguio" :key="p" :value="p">
                        {{ p }}
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
            transportistas: [],
            patentes: [],
            patentesCarro: [],
            conductores: [],
            carguios: [],
            patentesCarguio: [],
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
                largoProducto: null,
                transportista: null,
                patenteCamion: null,
                patenteCarro: null,
                conductor: null,
                carguio: null,
                patenteCarguio: null,
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

            this.cargarLargosProducto();
            this.cargarInformacionProducto();
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
                this.cargarConductores();
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
            const nuevoCarguio = e.target.value;
            this.form.carguio =
                this.carguios.find((p) => p.rutCarguio === nuevoCarguio) ||
                null;

            await this.$nextTick();
            this.resetDesde("carguio"); // limpia desde carguio en adelante
            this.cargarPatentesCarguio();
        },

        async cargarPatentesCarguio() {
            this.patentesCarguio = this.form.carguio
                ? await listarPatentesCarguioPorRut(
                      this.form.carguio.rutCarguio
                  )
                : [];

            if (this.patentesCarguio.length === 1) {
                this.form.patenteCarguio = this.patentesCarguio[0];
                await this.$nextTick();
                f7.smartSelect
                    .get(".patente-carguio-select .smart-select")
                    .setValueText(this.form.patenteCarguio);
            }
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

            if (this.productos.length === 1) {
                this.form.producto = this.productos[0];
                await this.$nextTick();
                f7.smartSelect
                    .get(".select-producto .smart-select")
                    .setValueText(this.form.producto.nombreProducto);
                this.cargarLargosProducto();
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
                this.clientes = [];
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
                this.form.carguio = null;
                nivel = "carguio";
            }
            if (nivel === "carguio") {
                this.patentesCarguio = [];
                this.form.patenteCarguio = null;
                nivel = "patenteCarguio";
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
