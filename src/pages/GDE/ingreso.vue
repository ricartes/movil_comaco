<template>
    <f7-page data-name="gde" @page:beforein="onPageBeforeIn">
        <f7-navbar>
            <f7-nav-left>
                <f7-link @click="back">
                    <f7-icon icon="icon-back" />
                </f7-link>
            </f7-nav-left>
            <f7-nav-title>Ingreso GDE</f7-nav-title>
        </f7-navbar>

        <f7-block strong class="alert-wrapper">
            <div class="alert alert-info">
                <i class="f7-icons">info_circle</i>
                Si conoce el Número de Orden, puede seleccionarla para
                autocompletar los datos relacionados.
            </div>
        </f7-block>

        <f7-list no-hairlines-md>
            <!-- OC -->

            <f7-list-item
                title="Número Orden"
                class="select-orden-compra"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :value="ordenCompraSeleccionada?.numOc || ''"
                    @change="handleOrdenCompraChange"
                >
                    <option value="" disabled>
                        Seleccione Número de Orden
                    </option>
                    <option
                        v-for="z in ordenesCompra"
                        :key="z.numOc"
                        :value="z.numOc"
                    >
                        {{ z.numOc }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                title="Zona"
                class="select-zona"
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

            <!-- PROVEEDOR: depende de zona -->
            <f7-list-item
                v-if="form.zona"
                :key="form.zona?.codigo"
                title="Proveedor"
                class="select-proveedor"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :key="'sel-proveedor-' + (form.zona?.codigo || '')"
                    :value="form.proveedor?.rutProveedor || ''"
                    @change="handleProveedorChange"
                >
                    <option value="" disabled>Seleccione un Proveedor…</option>
                    <option
                        v-for="p in proveedores"
                        :key="p.rutProveedor"
                        :value="p.rutProveedor"
                    >
                        {{ p.rutProveedor }} {{ p.nomProveedor }}
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
                    :key="'sel-predio-' + (form.proveedor?.rutProveedor || '')"
                    :value="form.predio?.rolPredio || ''"
                    @change="handlePredioChange"
                >
                    <option value="" disabled>Seleccione un Predio</option>
                    <option
                        v-for="p in predios"
                        :key="p.rolPredio"
                        :value="p.rolPredio"
                    >
                        {{ p.rolPredio }} {{ p.predio }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item v-if="mostrarMensajeInfo" class="li-alert no-padding">
                <div class="alert alert-info">
                    <i class="f7-icons">info_circle</i>
                    {{ form.datosGeocerca.mensajeValidacion }}
                </div>
            </f7-list-item>

            <f7-block
                strong
                v-if="this.form.predio && form.datosGeocerca.validada === false"
                class="alert-wrapper"
            >
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
                    {{ form.datosGeocerca.mensajeValidacion }}
                </div>

                <div class="text-align-right" style="margin-top: 8px">
                    <f7-button
                        small
                        outline
                        color="red"
                        :disabled="reintentandoGeocerca"
                        @click="reintentarGeocerca"
                    >
                        <span v-if="!reintentandoGeocerca"
                            >Reintentar validación de geocerca</span
                        >
                        <span v-else>Reintentando…</span>
                    </f7-button>
                </div>
            </f7-block>

            <!-- CLIENTE: depende de predio -->
            <f7-list-item
                v-if="
                    this.form.predio &&
                    this.form.datosGeocerca.validada === true
                "
                :key="form.predio?.rolPredio"
                title="Cliente"
                class="select-cliente"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :key="'sel-cliente-' + (form.predio?.rolPredio || '')"
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
                    :key="'sel-destino-' + (form.cliente?.rutCliente || '')"
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

            <f7-list-item v-if="form.destino" class="li-alert no-padding">
                <div class="alert alert-info">
                    <i class="f7-icons">info_circle</i>
                    Seleccionar entre Trasvasije o Venta en piso. Al elegir una
                    opción, la otra se deshabilitará automáticamente.
                </div>
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
                    :key="
                        'sel-producto-' + (form.destino?.destinoCliente || '')
                    "
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
                    :key="'sel-largo-' + (form.producto?.codProducto || '')"
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
                    :key="`sel-transportista-${form.producto?.codProducto}-${form.largoProducto}`"
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
                :key="`pc-${form.transportista?.rutTransportista}`"
                title="Patente Camión"
                class="patente-camion"
                ref="patenteCamion"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :key="`sel-pc-${form.transportista?.rutTransportista}`"
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

            <f7-block
                strong
                v-if="patenteCamionNoVigente"
                class="alert-wrapper"
            >
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
                    vigente. <strong>No podrá continuar</strong> en la emisión
                    de la GDE.
                </div>
            </f7-block>

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
                    :key="`sel-pcarro-${form.transportista?.rutTransportista}-${form.patenteCamion?.patCamion}`"
                    :value="form.patenteCarro?.patCarro || ''"
                    @change="handlePatenteCarroChange"
                >
                    <option value="" disabled>Seleccione Patente carro</option>
                    <option
                        v-for="p in patentesCarro"
                        :key="p.patCarro"
                        :value="p.patCarro"
                    >
                        {{ p.patCarro }}
                    </option>
                </select>
            </f7-list-item>

            <f7-list-item
                accordion-item
                accordion-opened
                title="Información del Camión/Carro"
                class="camion-info"
                ref="camionAccordion"
                v-if="form.patenteCarro"
            >
                <f7-accordion-content>
                    <InformacionCamion
                        v-if="form.patenteCarro"
                        :camion="form.patenteCamion"
                        :carro="form.patenteCarro"
                    />
                </f7-accordion-content>
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
                    :key="`sel-conductor-${form.patenteCarro || ''}`"
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
                accordion-item
                accordion-opened
                title="Información del Conductor"
                class="conductor-info"
                ref="conductorAccordion"
                v-if="form.conductor"
            >
                <f7-accordion-content>
                    <InformacionConductor
                        v-if="form.conductor"
                        :conductor="form.conductor"
                        @validez="onValidezConductor"
                        @update:conductor="onUpdateConductor"
                    />
                </f7-accordion-content>
            </f7-list-item>

            <f7-list-item
                v-if="this.form.conductor && this.conductorValido"
                :key="`${form.conductor.rutChofer}`"
                :title="textoCarguio"
                class="carguio-select"
                ref="carguio"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :key="`sel-carguio-${form.conductor?.rutChofer || ''}`"
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
                v-if="form.conductor && conductorValido && carguioEsObligatorio"
                class="li-alert no-padding"
            >
                <div class="alert alert-info">
                    <i class="f7-icons">info_circle</i>
                    Este campo es obligatorio. Debes seleccionar 1 carguío.
                </div>
            </f7-list-item>

            <f7-list-item
                v-if="this.form.carguios.length > 0"
                :key="`pcarg-${(form.carguios || [])
                    .map((c) => c.rutCarguio)
                    .join(',')}`"
                :title="`Patentes carguios (Ingrese ${maximoCarguios})`"
                class="patente-carguio-select"
                ref="patenteCarguio"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :key="`sel-pcarg-${(form.carguios || [])
                        .map((c) => c.rutCarguio)
                        .join(',')}`"
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
                    (form.carguios?.length || 0) > 0 &&
                    (form.patentesCarguio?.length || 0) !==
                        (form.carguios?.length || 0)
                "
                class="li-alert no-padding"
            >
                <div class="alert alert-danger">
                    <i class="f7-icons">exclamationmark_circle</i>
                    Debes seleccionar {{ form.carguios.length }} patente(s) de
                    carguío para continuar.
                </div>
            </f7-list-item>

            <f7-list-item
                v-if="
                    this.form.predio &&
                    this.form.conductor &&
                    this.conductorValido &&
                    this.puedeContinuarDespuesDeCarguio
                "
                :key="`rodal-${form.predio?.rolPredio || ''}-${(
                    form.patentesCarguio || []
                ).join(',')}`"
                :title="`Rodal`"
                class="rodal-select"
                ref="rodal"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :key="`sel-rodal-${form.predio?.rolPredio || ''}-${(
                        form.patentesCarguio || []
                    ).join(',')}`"
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
                :key="`empcont-${form.rodal?.codrodal || ''}`"
                v-if="this.form.rodal"
                :title="`Empresa contratista`"
                class="empresa-contratista-select"
                ref="empresaContratista"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :key="`sel-empcont-${form.rodal?.codrodal || ''}`"
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
                :key="`linea-${form.empresaContratista?.rutContratista || ''}`"
                v-if="this.form.empresaContratista"
                :title="`Línea`"
                class="linea-contratista-select"
                ref="lineaContratista"
                smart-select
                :smart-select-params="ssParams"
            >
                <select
                    :key="`sel-linea-${
                        form.empresaContratista?.rutContratista || ''
                    }`"
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

        <f7-block
            v-if="form.linea && form.datosGeocerca.validada === true"
            class="text-align-center"
        >
            <f7-button fill large color="blue" @click="ingresar">
                Ingresar
            </f7-button>
        </f7-block>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import { reportException } from "@/js/Utils/crashlytics.util";
import { getLocationOnce } from "@/app/helpers/GeolocationHelpers";
import {
    ensureLocationPermissionOnce,
    tryGetLocation,
    openAppSettings,
} from "@/app/helpers/geo-permissions";
import { listarPorEmpresa } from "@/app/services/Parametros/ZonaService";
import { listarProveedoresPorZona } from "@/app/services/Parametros/ProveedorService";
import {
    listarPrediosPorProveedor,
    validarGeocercaPredio,
} from "@/app/services/Parametros/PredioService";
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

import { obtenerConfiguracionOrigenPorCodigo } from "@/app/services/Parametros/OrigenConfiguracionService";

import {
    listarOrdenesCaompra,
    obtenerOrdenCompra,
} from "@/app/services/Parametros/OrdenCompraService";

import InformacionCliente from "@/pages/GDE/Ingreso/InformacionCliente.vue";
import InformacionDestino from "@/pages/GDE/Ingreso/InformacionDestino.vue";
import InformacionProducto from "@/pages/GDE/Ingreso/InformacionProducto.vue";
import InformacionRodal from "@/pages/GDE/Ingreso/InformacionRodal.vue";
import InformacionConductor from "@/pages/GDE/Ingreso/InformacionConductor.vue";
import InformacionCamion from "@/pages/GDE/Ingreso/InformacionCamion.vue";
import store from "@/js/store";
import {
    listarDestinosPorCliente,
    clienteEsEmisor,
} from "@/app/services/Parametros/ClienteService";
import { listarRodalesPorOrigen } from "@/app/services/Parametros/RodalService";
import { obtenerEmpresa } from "@/app/services/Parametros/EmpresaService";
import {
    listarParametrosGenerales,
    generarPorcentajeIva,
} from "@/app/services/Parametros/ParametrosGeneralService";
import { ingresarGde } from "@/app/services/GdeService";
import { createGdeDraftDefault } from "@/app/factory/GdeDraftFactory";
import config from "@/Common/json/config.json";

export default {
    name: "GDEIngreso",
    props: {
        f7route: Object,
        f7router: Object,
    },
    components: {
        InformacionCliente,
        InformacionDestino,
        InformacionProducto,
        InformacionCamion,
        InformacionConductor,
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
            aplicandoOc: false,
            reintentandoGeocerca: false,
            ordenesCompra: [],
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
            conductorValido: true,
            ordenCompraSeleccionada: null,
            form: createGdeDraftDefault(),
        };
    },
    computed: {
        mostrarMensajeInfo() {
            return (
                !!this.form.predio &&
                this.form.datosGeocerca.validada === true &&
                (this.form.datosGeocerca.mensajeValidacion || "").length > 0
            );
        },
        patenteCamionNoVigente() {
            return (
                this.form?.patenteCamion != null &&
                this.form.patenteCamion.vigencia === true
            );
        },

        usuarioActivo() {
            return store.state.user;
        },
        validaGeocerca() {
            return config.parametros.validaGeocerca;
        },
        indicadoresTraslado() {
            return config.parametros.indicadoresTraslado;
        },
        maximoCarguios() {
            return config.parametros.maximoCarguios;
        },

        parametrosGenerales() {
            return config.parametros.parametrosGenerales;
        },
        carguioEsObligatorio() {
            return this.form?.configuracionOrigen?.carguioObligatorio === true;
        },
        textoCarguio() {
            return this.carguioEsObligatorio
                ? `Carguíos (Obligatorio - Ingrese ${this.maximoCarguios})`
                : `Carguíos (Opcional - Ingrese ${this.maximoCarguios})`;
        },
        puedeContinuarDespuesDeCarguio() {
            // Regla: si es obligatorio -> debe haber al menos 1 carguío y patentes cuadradas
            // si es opcional -> puede pasar aunque no haya carguíos, pero si hay, deben cuadrar patentes
            const nC = this.form.carguios?.length || 0;
            const nP = this.form.patentesCarguio?.length || 0;

            if (this.carguioEsObligatorio) return nC > 0 && nP === nC;
            if (nC === 0) return true;
            return nP === nC;
        },
    },
    async created() {
        f7.dialog.preloader("Cargando...");
        try {
            this.generarDatosEmisor();
            await this.cargarOrdenesCompra();
            await this.cargarZonas();
            await this.cargarTransportistas();
            await this.cargarCarguios();
            this.form.empresa = await obtenerEmpresa(
                this.usuarioActivo.empresa
            );
            this.form.parametrosGenerales = await listarParametrosGenerales(
                this.usuarioActivo.empresa
            );
            this.form.ivaPct = await generarPorcentajeIva(
                this.usuarioActivo.empresa
            );
        } catch (ex) {
            alert(ex.message || "Error desconocido");
            f7.dialog.alert("Ha ocurrido un error al iniciar registro.");
        } finally {
            f7.dialog.close();
        }
    },
    mounted() {
        this._waitingLocationPermission = false; // inicialización
        this._resumeRemove = CapacitorApp.addListener("resume", async () => {
            if (this._waitingLocationPermission) {
                await this.ensureLocationGate();
            }
        });
    },
    beforeUnmount() {
        this._resumeRemove?.remove?.();
    },
    methods: {
        async onPageBeforeIn() {
            await this.ensureLocationGate();
        },
        async ensureLocationGate() {
            // 1) pedir permiso si hace falta
            let granted = await ensureLocationPermissionOnce();
            if (!granted) {
                this._waitingLocationPermission = true;
                await new Promise((resolve) => {
                    f7.dialog
                        .create({
                            title: "Ubicación necesaria",
                            text: "Para validar geocerca y continuar con el ingreso de la GDE, activa el permiso de ubicación.",
                            buttons: [
                                {
                                    text: "Abrir ajustes",
                                    bold: true,
                                    onClick: async () => {
                                        await openAppSettings();
                                        resolve();
                                    },
                                },
                                { text: "Cancelar", onClick: resolve },
                            ],
                            closeByBackdropClick: false,
                        })
                        .open();
                });
                // Al volver, el listener 'resume' volverá a llamar a ensureLocationGate
                return;
            }

            // 2) (opcional) probar que el GPS esté realmente disponible
            const pos = await tryGetLocation();
            if (!pos) {
                f7.dialog
                    .create({
                        title: "Ubicación desactivada",
                        text: "No se pudo obtener tu ubicación. Asegúrate de tener el GPS activado y con buena señal.",
                        buttons: [{ text: "Entendido", bold: true }],
                        closeByBackdropClick: false,
                    })
                    .open();
                return;
            }

            // OK: ya puedes seguir tu flujo normal (cargar combos, validar geocerca, etc.)
            this._waitingLocationPermission = false;
        },

        async reintentarGeocerca() {
            if (!this.form.predio) return; // seguridad

            this.reintentandoGeocerca = true;
            try {
                // Reutiliza toda tu lógica actual
                await this.obtenerConfiguracionOrigen();
                await this.validarGeocerca();

                // Si ahora quedó válida, seguimos el mismo flujo que al seleccionar predio
                if (this.form.datosGeocerca.validada === true) {
                    await this.cargarRodales();
                    await this.cargarClientes();

                    // Opcional: mover la vista hacia el siguiente paso (cliente/destino)
                    await this.scrollTo({
                        ref: "destinoCliente",
                        block: "start",
                        offset: 72,
                        behavior: "smooth",
                    });
                }
            } catch (err) {
                console.warn("Error reintentando geocerca:", err);
                f7.dialog.alert(
                    "Ocurrió un error al reintentar la validación de geocerca.",
                    "Error"
                );
            } finally {
                this.reintentandoGeocerca = false;
            }
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

        async cargarOrdenesCompra() {
            this.ordenesCompra = await listarOrdenesCaompra();
        },

        async cargarZonas() {
            this.zonas = await listarPorEmpresa(this.usuarioActivo.empresa);
            if (this.zonas.length === 1) {
                this.form.zona = this.zonas[0];
                await this.cargarProveedores();
                await this.$nextTick();
                f7.smartSelect
                    .get(".select-zona .smart-select")
                    .setValueText(this.form.zona.descripcion);
            }
        },

        async cargarTransportistas() {
            this.transportistas = await listarTransportistas();
        },

        async cargarCarguios() {
            this.carguios = await listarCarguios();
        },

        async cargarProveedores() {
            f7.dialog.preloader("Cargando...");
            try {
                this.proveedores = this.form.zona
                    ? await listarProveedoresPorZona(this.form.zona.codigo)
                    : [];

                if (this.proveedores.length === 1) {
                    this.form.proveedor = this.proveedores[0];
                    await this.$nextTick();
                    await this.cargarPredios();

                    f7.smartSelect
                        .get(".select-proveedor .smart-select")
                        .setValueText(
                            `${this.form.proveedor.rutProveedor} ${this.form.proveedor.nomProveedor}`
                        );
                }
            } catch (e) {
                f7.dialog.alert("Ha ocurrido un error al cargar proveedores.");
            } finally {
                f7.dialog.close();
            }
        },

        async handleOrdenCompraChange(e) {
            const nuevoNumero = e.target.value;

            this.ordenCompraSeleccionada =
                this.ordenesCompra.find((o) => o.numOc === nuevoNumero) || null;

            if (this.ordenCompraSeleccionada) {
                try {
                    this.aplicandoOc = true; // 👈 empieza modo “llenado automático”
                    f7.dialog.preloader("Aplicando Orden de Compra...");
                    await this.aplicarOrdenCompra(this.ordenCompraSeleccionada);
                } catch (err) {
                    console.error("Error aplicando OC:", err);
                    f7.dialog.alert(
                        "No fue posible aplicar los datos de la Orden de Compra seleccionada.",
                        "Error"
                    );
                } finally {
                    this.aplicandoOc = false; // 👈 fin modo automático
                    f7.dialog.close();
                }
            }
        },

        limpiarOrdenCompraSeleccionada() {
            this.ordenCompraSeleccionada = null;
            //this.form.ordenCompra = null; // opcional pero recomendado

            this.$nextTick(() => {
                try {
                    // Resetear el Smart Select de OC (texto)
                    const ss = f7.smartSelect.get(
                        ".select-orden-compra .smart-select"
                    );
                    ss && ss.setValueText("Seleccione una Orden de compra");
                } catch (e) {
                    console.warn(
                        "No se pudo actualizar smart-select de OC:",
                        e
                    );
                }

                // Resetear el <select> nativo (valor)
                const sel = this.$el.querySelector(
                    ".select-orden-compra select"
                );
                if (sel) {
                    sel.value = "";
                }
            });
        },

        async asignarZonaDesdeOc(oc) {
            // en tu OC: zona = codEncargado
            const nuevaZona =
                this.zonas.find((z) => z.codigo === oc.codEncargado) || null;

            if (!nuevaZona) {
                f7.dialog.alert(
                    `La zona ${oc.codEncargado} de la Orden de Compra no está configurada para esta empresa.`,
                    "Zona no encontrada"
                );
                return false;
            }

            // Limpia todo lo que depende de la zona
            this.resetDesde("zona");
            this.form.zona = nuevaZona;

            await this.$nextTick();

            // Actualizar texto del Smart Select de zona
            try {
                const ss = f7.smartSelect.get(".select-zona .smart-select");
                ss && ss.setValueText(this.form.zona.descripcion);
            } catch (e) {
                console.warn("No se pudo actualizar smart-select de zona:", e);
            }

            // Cargar proveedores de la nueva zona
            await this.cargarProveedores();

            return true;
        },

        async asignarProveedorDesdeOc(oc) {
            if (!this.proveedores?.length) {
                return false;
            }

            const nuevoProv =
                this.proveedores.find(
                    (p) => String(p.rutProveedor) === String(oc.rutProveedor)
                ) || null;

            if (!nuevoProv) {
                // No cortamos el flujo, solo devolvemos false
                console.warn(
                    "Proveedor de OC no encontrado en lista local:",
                    oc.rutProveedor
                );
                return false;
            }

            this.resetDesde("proveedor");
            this.form.proveedor = nuevoProv;

            await this.$nextTick();

            try {
                const texto = `${nuevoProv.rutProveedor} ${nuevoProv.nomProveedor}`;
                const ss = f7.smartSelect.get(
                    ".select-proveedor .smart-select"
                );
                ss && ss.setValueText(texto);
            } catch (e) {
                console.warn(
                    "No se pudo actualizar smart-select de proveedor:",
                    e
                );
            }

            await this.cargarPredios();

            return true;
        },

        async asignarPredioDesdeOc(oc) {
            if (!this.predios?.length) return false;

            const nuevoPredio =
                this.predios.find(
                    (p) => String(p.rolPredio) === String(oc.rolPredio)
                ) || null;

            if (!nuevoPredio) {
                console.warn(
                    "Predio de OC no encontrado en lista local:",
                    oc.rolPredio
                );
                return false;
            }

            this.resetDesde("predio");
            this.form.predio = nuevoPredio;

            await this.$nextTick();

            try {
                const txt = `${this.form.predio.rolPredio} ${this.form.predio.predio}`;
                const ss = f7.smartSelect.get(".select-predio .smart-select");
                ss && ss.setValueText(txt);
            } catch (e) {
                console.warn(
                    "No se pudo actualizar smart-select de predio:",
                    e
                );
            }

            // Mantener misma lógica que cuando el usuario selecciona predio
            await this.validarGeocerca();
            await this.obtenerConfiguracionOrigen();
            if (this.form.datosGeocerca.validada === true) {
                await this.cargarRodales();
                await this.cargarClientes();
            }

            return true;
        },

        async obtenerConfiguracionOrigen() {
            this.form.configuracionOrigen =
                await obtenerConfiguracionOrigenPorCodigo(
                    this.form.predio.rolPredio
                );
        },
        async asignarClienteDesdeOc(oc) {
            if (!this.clientes?.length) return false;

            const nuevoCliente =
                this.clientes.find(
                    (c) => String(c.rutCliente) === String(oc.rutCliente)
                ) || null;

            if (!nuevoCliente) {
                console.warn(
                    "Cliente de OC no encontrado en lista local:",
                    oc.rutCliente
                );
                return false;
            }

            this.resetDesde("cliente");
            this.form.cliente = nuevoCliente;

            await this.$nextTick();
            this.mostrarInformacionCliente();
            this.obtenerIndicadorTraslado();
            await this.cargarDestinosCliente();

            try {
                const txt = `${this.form.cliente.rutCliente} ${this.form.cliente.razonSocialCliente}`;
                const ss = f7.smartSelect.get(".select-cliente .smart-select");
                ss && ss.setValueText(txt);
            } catch (e) {
                console.warn(
                    "No se pudo actualizar smart-select de cliente:",
                    e
                );
            }

            return true;
        },

        async asignarDestinoDesdeOc(oc) {
            if (!this.destinos?.length) return false;

            const nuevoDestino =
                this.destinos.find(
                    (d) =>
                        String(d.destinoCliente) === String(oc.destinoCliente)
                ) || null;

            if (!nuevoDestino) {
                console.warn(
                    "Destino de OC no encontrado en lista local:",
                    oc.destinoCliente
                );
                return false;
            }

            this.resetDesde("destino");
            this.form.destino = nuevoDestino;

            await this.$nextTick();
            this.cargarInformacionDestino();
            await this.cargarProductos();

            try {
                const ss = f7.smartSelect.get(".destino-cliente .smart-select");
                ss && ss.setValueText(this.form.destino.destinoCliente);
            } catch (e) {
                console.warn(
                    "No se pudo actualizar smart-select de destino:",
                    e
                );
            }

            return true;
        },

        async asignarProductoYLargoDesdeOc(oc) {
            // productos ya cargados en cargarProductos()
            if (!this.productos?.length) return false;

            const nuevoProd =
                this.productos.find(
                    (p) => Number(p.codProducto) === Number(oc.codProducto)
                ) || null;

            if (!nuevoProd) {
                console.warn(
                    "Producto de OC no encontrado en lista local:",
                    oc.codProducto
                );
                return false;
            }

            this.resetDesde("producto");
            this.form.producto = nuevoProd;

            await this.$nextTick();

            try {
                const ss = f7.smartSelect.get(".select-producto .smart-select");
                ss && ss.setValueText(this.form.producto.nombreProducto);
            } catch (e) {
                console.warn(
                    "No se pudo actualizar smart-select de producto:",
                    e
                );
            }

            // Precio + largos + orden compra interna
            await this.cargarPrecioProducto();
            await this.cargarLargosProducto();
            await this.obtenerOrdenCompra();

            // Largo desde OC (largoTrozo)
            if (
                Array.isArray(this.largosProducto) &&
                this.largosProducto.length
            ) {
                const largoDesdeOc = this.largosProducto.find(
                    (l) => Number(l) === Number(oc.largoTrozo)
                );

                if (largoDesdeOc != null) {
                    this.form.largoProducto = largoDesdeOc;

                    await this.$nextTick();
                    try {
                        const ssLargo = f7.smartSelect.get(
                            ".largo-producto .smart-select"
                        );
                        ssLargo &&
                            ssLargo.setValueText(
                                `${this.form.largoProducto} Metro(s)`
                            );
                    } catch (e) {
                        console.warn(
                            "No se pudo actualizar smart-select de largo:",
                            e
                        );
                    }
                }
            }

            await this.$nextTick();
            this.cargarInformacionProducto();

            return true;
        },

        async aplicarOrdenCompra(oc) {
            // 1) Zona
            const okZona = await this.asignarZonaDesdeOc(oc);
            if (!okZona) return;

            const okProv = await this.asignarProveedorDesdeOc(oc);
            if (!okProv) return;

            // 3) Predio (depende de proveedor)
            const okPredio = await this.asignarPredioDesdeOc(oc);
            if (!okPredio) return;

            // 4) Cliente (depende de predio)
            const okCli = await this.asignarClienteDesdeOc(oc);
            if (!okCli) return;

            // 5) Destino (depende de cliente)
            const okDest = await this.asignarDestinoDesdeOc(oc);
            if (!okDest) return;

            // 6) Producto + largo (depende de destino)
            await this.asignarProductoYLargoDesdeOc(oc);
        },

        async handleZonaChange(e) {
            const nuevoCodigo = e.target.value;
            const nuevaZona =
                this.zonas.find((z) => z.codigo === nuevoCodigo) || null;

            if (!this.aplicandoOc) {
                this.limpiarOrdenCompraSeleccionada();
            }

            const aplicarCambio = async () => {
                this.resetDesde("zona"); // 👈 limpia todo
                this.form.zona = nuevaZona;

                await this.$nextTick(); // fuerza re-render de los smart-select dependientes
                this.cargarProveedores();
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

        async cargarPredios() {
            f7.dialog.preloader("Cargando...");
            try {
                this.predios = this.form.proveedor
                    ? await listarPrediosPorProveedor(
                          this.form.zona.codigo,
                          this.form.proveedor.rutProveedor
                      )
                    : [];

                if (this.predios.length === 1) {
                    this.form.predio = this.predios[0];
                    await this.$nextTick();
                    await this.obtenerConfiguracionOrigen();
                    await this.validarGeocerca();
                    if (this.form.datosGeocerca.validada === true) {
                        this.cargarClientes();
                        this.cargarRodales();
                    }

                    f7.smartSelect
                        .get(".select-predio .smart-select")
                        .setValueText(
                            `${this.form.predio.rolPredio} ${this.form.predio.predio}`
                        );
                }
            } catch (e) {
                f7.dialog.alert("Ha ocurrido un error al cargar predios.");
            } finally {
                f7.dialog.close();
            }
        },

        async handleProveedorChange(e) {
            if (!this.aplicandoOc) {
                this.limpiarOrdenCompraSeleccionada();
            }
            const nuevoRut = e.target.value;
            const nuevoProv =
                this.proveedores.find((p) => p.rutProveedor === nuevoRut) ||
                null;

            this.resetDesde("proveedor"); // limpia desde proveedor en adelante
            this.form.proveedor = nuevoProv;
            await this.$nextTick(); // re-render del smart-select "Predio"

            await this.cargarPredios();
        },

        async handlePredioChange(e) {
            if (!this.aplicandoOc) {
                this.limpiarOrdenCompraSeleccionada();
            }
            const nuevoPredio = e.target.value;
            this.form.predio =
                this.predios.find((p) => p.rolPredio === nuevoPredio) || null;

            await this.$nextTick();
            this.resetDesde("predio"); // limpia desde predio en adelante
            await this.obtenerConfiguracionOrigen();
            await this.validarGeocerca();
            if (this.form.datosGeocerca.validada === true) {
                this.cargarRodales();
                this.cargarClientes();
            }
        },

        async validarGeocerca() {
            if (this.validaGeocerca) {
                const ok = await ensureLocationPermissionOnce();
                if (!ok) {
                    this.form.datosGeocerca.validada = false;
                    this.form.datosGeocerca.mensajeValidacion =
                        "Debes otorgar el permiso de ubicación para validar la geocerca.";
                    return;
                } else {
                    f7.dialog.preloader("Espere por favor...");

                    // Intentar geolocalización (si falla, seguimos sin bloquear el flujo)
                    let ubicacion = null;
                    try {
                        ubicacion = await getLocationOnce();
                        if (!ubicacion) {
                            throw new Error("Ubicación no disponible");
                        }
                        const resultadoValidacion = await validarGeocercaPredio(
                            this.form.predio.rolPredio,
                            ubicacion.lat,
                            ubicacion.lng
                        );
                        this.form.datosGeocerca.validada =
                            resultadoValidacion.validada;
                        this.form.datosGeocerca.geocerca =
                            resultadoValidacion.geocerca;
                        this.form.datosGeocerca.mensajeValidacion =
                            resultadoValidacion.mensajeValidacion;
                    } catch (geoErr) {
                        this.form.datosGeocerca.validada = false;
                        this.form.datosGeocerca.mensajeValidacion =
                            "No podrá continuar con la emisión debido a un error al validar la geocerca. Compruebe si tiene el acceso a ubicación activado.";
                        console.warn("No se pudo obtener ubicación:", geoErr);

                        await reportException(geoErr, "Geocerca", {
                            rol_predio: this.form?.predio?.rolPredio ?? "N/A",
                        });
                    } finally {
                        f7.dialog.close();
                    }
                }
            } else {
                this.form.datosGeocerca.validada = true;
                this.form.datosGeocerca.mensajeValidacion =
                    "Validación geocerca desactivada desde configuración.";
            }
        },

        async cargarClientes() {
            this.form.cliente = null;
            f7.dialog.preloader("Cargando...");
            try {
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
                    this.mostrarInformacionCliente();
                    this.obtenerIndicadorTraslado();
                    this.cargarDestinosCliente();

                    await this.scrollTo({
                        ref: "destinoCliente",
                        block: "start",
                        offset: 72, // ajusta según tu navbar/header
                        behavior: "smooth",
                        // openAccordions: ".destino-info", // opcional: abrir acordeón de destino antes de scrollear
                    });
                    f7.smartSelect
                        .get(".select-cliente .smart-select")
                        .setValueText(
                            `${this.form.cliente.rutCliente} ${this.form.cliente.razonSocialCliente}`
                        );
                }
            } catch (e) {
                f7.dialog.alert("Ha ocurrido un error al cargar clientes.");
            } finally {
                f7.dialog.close();
            }
        },

        mostrarInformacionCliente() {
            const ref = this.$refs.clienteAccordion;
            const el = ref?.$el || ref?.el || ref; // el DOM real
            if (el) f7.accordion.open(el);
        },

        async handleClienteChange(e) {
            if (!this.aplicandoOc) {
                this.limpiarOrdenCompraSeleccionada();
            }
            const nuevoCliente = e.target.value;
            if (nuevoCliente) {
                this.form.cliente =
                    this.clientes.find((p) => p.rutCliente === nuevoCliente) ||
                    null;

                this.resetDesde("cliente"); // limpia desde predio en adelante
                await this.$nextTick();
                this.mostrarInformacionCliente();
                this.cargarDestinosCliente();
                this.obtenerIndicadorTraslado();
            }
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
        },

        obtenerIndicadorTraslado() {
            if (
                clienteEsEmisor(
                    this.form.cliente.rutCliente,
                    this.form.empresa.rut
                )
            ) {
                this.form.indicadorTraslado = this.indicadoresTraslado.TRASLADO;
            } else {
                this.form.indicadorTraslado = this.indicadoresTraslado.VENTA;
            }
        },
        async handleDestinoChange(e) {
            if (!this.aplicandoOc) {
                this.limpiarOrdenCompraSeleccionada();
            }
            const nuevoDestino = e.target.value;
            this.form.destino =
                this.destinos.find((p) => p.destinoCliente === nuevoDestino) ||
                null;

            await this.$nextTick();
            this.resetDesde("destino"); // limpia desde destino en adelante
            this.cargarInformacionDestino();
            this.cargarProductos();
        },

        async handleProductoChange(e) {
            if (!this.aplicandoOc) {
                this.limpiarOrdenCompraSeleccionada();
            }
            const nuevoProducto = Number(e.target.value);
            this.form.producto =
                this.productos.find((p) => p.codProducto === nuevoProducto) ||
                null;

            await this.$nextTick();
            this.resetDesde("producto"); // limpia desde producto en adelante
            await this.cargarPrecioProducto();
            await this.cargarLargosProducto();
            await this.obtenerOrdenCompra();
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
                this.form.producto.codProducto
            );
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
            this.largosProducto = this.form.producto
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
                    .setValueText(`${this.form.largoProducto} Metro(s)`);
            }
        },

        async cargarPatentesCamion() {
            this.patentes = this.form.transportista
                ? await listarPatentesPorTransportista(
                      this.form.transportista.rutTransportista
                  )
                : [];

            if (this.patentes.length === 1) {
                this.form.patenteCamion = this.patentes[0];

                await this.$nextTick();
                if (!this.patenteCamionNoVigente) {
                    await this.cargarPatentesCarro();
                }
                f7.smartSelect
                    .get(".patente-camion .smart-select")
                    .setValueText(this.form.patenteCamion.patCamion);
            }
        },

        async cargarPatentesCarro() {
            this.patentesCarro = this.form.patenteCamion
                ? await listarPatentesCarroPorTransportistaCamion(
                      this.form.transportista.rutTransportista,
                      this.form.patenteCamion.patCamion
                  )
                : [];

            if (this.patentesCarro.length === 1) {
                this.form.patenteCarro = this.patentesCarro[0];
                await this.$nextTick();
                f7.smartSelect
                    .get(".patente-carro .smart-select")
                    .setValueText(this.form.patenteCarro.patCarro);
                this.cargarConductores();
                this.cargarInformacionCamion();
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
            await this.cargarPatentesCamion();
        },

        async handlePatenteCamionChange(e) {
            const nuevaPatente = e.target.value;
            this.form.patenteCamion =
                this.patentes.find((p) => p.patCamion === nuevaPatente) || null;

            await this.$nextTick();
            this.resetDesde("patCamion"); // limpia desde patente camion en adelante

            if (!this.patenteCamionNoVigente) {
                await this.cargarPatentesCarro();
            }
        },

        async handlePatenteCarroChange(e) {
            const nueva = String(e.target.value || "")
                .trim()
                .toUpperCase();

            this.resetDesde("patCarro");

            this.form.patenteCarro =
                this.patentesCarro.find(
                    (p) =>
                        String(p.patCarro || "")
                            .trim()
                            .toUpperCase() === nueva
                ) || null;

            await this.$nextTick();

            // actualizar texto del smartselect (por si acaso)
            if (this.form.patenteCarro) {
                f7.smartSelect
                    .get(".patente-carro .smart-select")
                    .setValueText(this.form.patenteCarro.patCarro);
            }

            await this.cargarConductores();
            this.cargarInformacionCamion();
        },

        async cargarConductores() {
            this.conductores = this.form.patenteCarro
                ? await listarConductoresPorCamionYCarro(
                      this.form.transportista.rutTransportista,
                      this.form.patenteCamion.patCamion,
                      this.form.patenteCarro.patCarro
                  )
                : [];

            if (this.conductores.length === 1) {
                this.form.conductor = this.conductores[0];
                await this.$nextTick();
                this.cargarInformacionConductor();
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
            this.cargarInformacionConductor();
        },

        async handleCarguioChange(e) {
            // valores seleccionados
            let values = Array.from(e.target.selectedOptions).map(
                (o) => o.value
            );

            // limitar a maximoCarguios (nos quedamos con los últimos seleccionados)
            if (values.length > this.maximoCarguios) {
                values = values.slice(values.length - this.maximoCarguios);

                // reflejar límite en el DOM (desmarca lo extra)
                const allowed = new Set(values);
                Array.from(e.target.options).forEach((opt) => {
                    opt.selected = allowed.has(opt.value);
                });
            }

            // guardar objetos carguío
            this.form.carguios = values
                .map((v) => this.carguios.find((p) => p.rutCarguio === v))
                .filter(Boolean);

            // si cambian carguíos, las patentes ya no aplican
            this.form.patentesCarguio = [];

            await this.$nextTick();
            this.resetDesde("carguio"); // limpia dependencias posteriores
            await this.cargarPatentesCarguio();
        },

        async handlePatentesCarguioChange(e) {
            let values = Array.from(e.target.selectedOptions).map(
                (o) => o.value
            );

            // limitar a maximoCarguios
            if (values.length > this.maximoCarguios) {
                values = values.slice(values.length - this.maximoCarguios);

                const allowed = new Set(values);
                Array.from(e.target.options).forEach((opt) => {
                    opt.selected = allowed.has(opt.value);
                });
            }

            // guardar strings (patentes)
            this.form.patentesCarguio = values.filter(Boolean);

            await this.$nextTick();
            this.resetDesde("patenteCarguio"); // limpia dependencias posteriores
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
                await this.obtenerOrdenCompra();
                await this.$nextTick();
                this.cargarInformacionProducto();
            }
        },

        cargarInformacionConductor() {
            const ref = this.$refs.conductorAccordion;
            const el = ref?.$el || ref?.el || ref; // el DOM real
            if (el) f7.accordion.open(el);
        },

        cargarInformacionDestino() {
            const ref = this.$refs.destinoAccordion;
            const el = ref?.$el || ref?.el || ref; // el DOM real
            if (el) f7.accordion.open(el);
        },

        cargarInformacionCamion() {
            const ref = this.$refs.camionAccordion;
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
        reiniciarDatosGeocerca() {
            this.form.datosGeocerca.geocerca = null;
            this.form.datosGeocerca.validada = true;
            this.form.datosGeocerca.mensajeValidacion = "";
        },

        resetDesde(nivel) {
            // Orden de dependencia: zona → proveedor → predio → cliente → destino → producto → largo → transportista → patCamion → patCarro → conductor

            const nivelesQueRompenOc = [
                "zona",
                "proveedor",
                "predio",
                "cliente",
                "destino",
                "producto",
            ];
            if (nivelesQueRompenOc.includes(nivel)) {
                this.form.ordenCompra = null;
            }

            if (nivel === "zona") {
                this.form.proveedor = null;
                this.proveedores = [];
                this.clearSmartSelect(
                    ".select-proveedor",
                    "Seleccione un Proveedor…"
                );
                // sigue
                nivel = "proveedor";
            }
            if (nivel === "proveedor") {
                this.form.predio = null;
                this.predios = [];
                this.reiniciarDatosGeocerca();
                this.clearSmartSelect(".select-predio", "Seleccione un Predio");
                // sigue
                nivel = "predio";
            }
            if (nivel === "predio") {
                this.form.cliente = null;
                this.form.rodal = null;

                this.clientes = [];
                this.rodales = [];
                this.clearSmartSelect(
                    ".select-cliente",
                    "Seleccione un Cliente"
                );
                this.clearSmartSelect(".rodal-select", "Seleccione Rodal");
                // sigue
                nivel = "cliente";
            }
            if (nivel === "cliente") {
                this.form.destino = null;
                this.destinos = [];
                this.clearSmartSelect(
                    ".destino-cliente",
                    "Seleccione un Destino"
                );

                // sigue
                nivel = "destino";
            }
            if (nivel === "destino") {
                this.form.producto = null;
                this.productos = [];
                this.form.largoProducto = null;
                this.largosProducto = [];

                this.clearSmartSelect(
                    ".select-producto",
                    "Seleccione un Producto"
                );
                this.clearSmartSelect(
                    ".largo-producto",
                    "Seleccione un Largo (Metros)"
                );
                // sigue
                nivel = "producto";
            }
            if (nivel === "producto") {
                this.form.largoProducto = null;
                this.largosProducto = [];
                this.clearSmartSelect(
                    ".largo-producto",
                    "Seleccione un Largo (Metros)"
                );
                // sigue
                nivel = "largo";
            }
            if (nivel === "largo") {
                this.form.transportista = null; // puedes mantener transportistas globales si quieres
                this.patentes = [];
                this.clearSmartSelect(
                    ".transportista",
                    "Seleccione un Transportista"
                );

                // sigue
                nivel = "transportista";
            }
            if (nivel === "transportista") {
                this.form.patenteCamion = null;
                this.patentes = [];
                this.clearSmartSelect(
                    ".patente-camion",
                    "Seleccione Patente camión"
                );

                // sigue
                nivel = "patCamion";
            }
            if (nivel === "patCamion") {
                this.form.patenteCarro = null;
                this.patentesCarro = [];
                this.clearSmartSelect(
                    ".patente-carro",
                    "Seleccione Patente carro"
                );
                // sigue
                nivel = "patCarro";
            }
            if (nivel === "patCarro") {
                this.form.conductor = null;
                this.conductores = [];
                this.clearSmartSelect(
                    ".conductor-select",
                    "Seleccione Conductor"
                );

                nivel = "conductor";
            }
            if (nivel === "conductor") {
                this.form.carguios = [];
                this.form.patentesCarguio = [];
                this.patentesCarguio = [];

                this.clearSmartSelect(".carguio-select", "Seleccione Carguíos");
                this.clearSmartSelect(
                    ".patente-carguio-select",
                    "Seleccione Patentes carguío"
                );

                nivel = "carguio";
            }

            if (nivel === "carguio") {
                this.patentesCarguio = [];
                this.form.patentesCarguio = [];
                this.clearSmartSelect(
                    ".patente-carguio-select",
                    "Seleccione Patentes carguío"
                );

                nivel = "patenteCarguio";
            }
            if (nivel === "patenteCarguio") {
                this.form.rodal = null;
                this.clearSmartSelect(".rodal-select", "Seleccione Rodal");

                nivel = "rodal";
            }
            if (nivel === "rodal") {
                this.form.empresaContratista = null;
                this.empresasContratista = [];
                this.clearSmartSelect(
                    ".empresa-contratista-select",
                    "Seleccione Empresa contratista"
                );

                nivel = "empresaContratista";
            }
            if (nivel === "empresaContratista") {
                this.form.linea = null;
                this.lineasContratista = [];
                this.clearSmartSelect(
                    ".linea-contratista-select",
                    "Seleccione Línea"
                );

                nivel = "lineaContratista";
            }
        },
        async ingresar() {
            // Un solo preloader para todo el

            if (!this.validarCarguiosYPatentes()) {
                return false;
            }

            const origenLocal = config?.parametros?.origenGde?.local ?? 1;
            f7.dialog.preloader("Guardando GDE…");

            try {
                // 1) Obtener ubicación (obligatoria)
                let ubicacion = null;
                try {
                    ubicacion = await getLocationOnce();

                    // Validación básica
                    if (
                        !ubicacion ||
                        typeof ubicacion.lat !== "number" ||
                        typeof ubicacion.lng !== "number"
                    ) {
                        throw new Error("Ubicación inválida");
                    }
                } catch (geoErr) {
                    console.error("Error obteniendo ubicación:", geoErr);

                    // Mensaje específico por ubicación
                    f7.dialog.alert(
                        "No se pudo obtener la ubicación del dispositivo. " +
                            "Verifica que el GPS esté encendido y que la app tenga permisos de ubicación.",
                        "No se puede ingresar la GDE"
                    );

                    return; // ⛔️ No seguimos al guardado
                }

                // 2) Si llegamos aquí, tenemos ubicación válida -> guardar GDE
                this.form.gdeOrigen = origenLocal;
                this.form.ubicacion = ubicacion;

                const gdeInsertada = await ingresarGde(this.form);

                f7.dialog.alert("GDE ingresada correctamente.", "Éxito", () => {
                    f7.views.main?.router?.navigate(
                        `/gde/detalle/${gdeInsertada._id}`,
                        {
                            reloadAll: true,
                        }
                    );
                });
            } catch (err) {
                console.error(err);
                f7.dialog.alert(
                    err?.message || "Ocurrió un error al ingresar la GDE.",
                    "Error"
                );
            } finally {
                // Se ejecuta SIEMPRE, incluso si hubo `return` arriba
                try {
                    f7.dialog.close();
                } catch {}
            }
        },

        onUpdateConductor(nuevo) {
            this.form.conductor = nuevo;
            f7.smartSelect
                .get(".conductor-select .smart-select")
                .setValueText(this.form.conductor.nomChofer);
        },

        onValidezConductor(v) {
            // v = { rut: boolean, nombre: boolean, ok: boolean }
            this.conductorValido = v;
        },
        validarCarguiosYPatentes() {
            const nC = this.form.carguios?.length || 0;
            const nP = this.form.patentesCarguio?.length || 0;

            // Si es obligatorio, debe existir al menos 1 carguío
            if (this.carguioEsObligatorio && nC === 0) {
                f7.dialog.alert(
                    `Debes seleccionar al menos 1 carguío para continuar.`,
                    "Validación"
                );
                return false;
            }

            // Si hay carguíos (obligatorio u opcional), patentes deben cuadrar
            if (nC > 0 && nP !== nC) {
                f7.dialog.alert(
                    `Seleccionaste ${nC} carguío(s). Debes seleccionar ${nC} patente(s) de carguío para continuar.`,
                    "Validación"
                );
                return false;
            }

            return true;
        },

        async scrollTo(opts = {}) {
            const {
                target,
                ref,
                child,
                openAccordions,
                offset = 0,
                block = "center",
                behavior = "smooth",
                useScrollIntoView = true,
            } = opts;

            // 1) Abrir acordeones si se indican
            const openList = Array.isArray(openAccordions)
                ? openAccordions
                : openAccordions
                ? [openAccordions]
                : [];
            for (const sel of openList) {
                try {
                    f7.accordion.open(sel);
                } catch (_) {}
            }

            await this.$nextTick();

            // 2) Resolver elemento objetivo
            let el = null;

            // Por ref (prioritario)
            if (ref && this.$refs?.[ref]) {
                const base = this.$refs[ref].$el || this.$refs[ref];
                el = child ? base?.querySelector?.(child) : base;
            }

            // Por selector / Element directo
            if (!el) {
                if (target instanceof Element) el = target;
                else if (typeof target === "string")
                    el = document.querySelector(target);
            }

            // Fallback si nada se encontró
            if (!el) return;

            // 3) Hacer scroll
            if (useScrollIntoView && offset === 0) {
                el.scrollIntoView({ behavior, block, inline: "nearest" });
                return;
            }

            // Con offset (cálculo manual)
            const rect = el.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            window.scrollTo({
                top: absoluteTop - offset,
                behavior,
            });
        },

        back() {
            const url = f7.views.main?.router?.currentRoute?.url || "";
            const params = new URLSearchParams(url.split("?")[1] || "");
            const qtab = params.get("tab") ?? "gde";

            f7.dialog.confirm(
                "¿Desea cancelar el ingreso de GDE?",
                "Confirmar",
                () => {
                    f7.views.main?.router?.navigate(`/home/?tab=${qtab}`, {
                        reloadAll: true,
                    });
                }
            );
        },
    },
};
</script>

<style scoped>
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

/* variantes */
.alert-info {
    border: 1px solid #bce8f1;
    background: #d9edf7;
    color: #31708f;
}
.alert-danger {
    border: 1px solid #ebccd1;
    background: #f2dede;
    color: #a94442;
}
</style>
