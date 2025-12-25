<script setup lang="ts">
// Con F7-Vue no hace falta importar <f7-*> explícitamente.
import formatters from "../../../js/mixins/formatters";
// @ts-ignore: allow importing local JSON without changing tsconfig
import config from "../../../Common/json/config.json";
import { computed } from "vue";

// Saco solo lo que voy a usar
const { formatFecha, formatMoneyCLP } = formatters.methods;

// Saco solo lo que voy a usar
interface GdeDoc {
    // ya existentes
    zona?: { descripcion?: string };
    proveedor?: { nomProveedor?: string };
    predio?: { predio?: string };
    cliente?: { razonSocialCliente?: string };
    destino?: { destinoCliente?: string };
    producto?: {
        nombreProducto?: string;
        unidadMedida?: string;
        categoria?: string | null;
        fsc?: string | number | boolean | null;
        sag?: string | number | boolean | null;
    };
    largoProducto?: number | string;
    transportista?: { nomTransportista?: string };
    patenteCamion?: { patCamion?: string };
    patenteCarro?:
        | string
        | { patCarro?: string; anchoCarro?: number | null }
        | null;
    conductor?: { nomChofer?: string };
    empresaContratista?: {
        nombreContratista?: string;
        rutContratista?: string;
    };
    rodal?: {
        codOrigen?: string;
        codrodal?: number | string;
        nomrodal?: string;
        fechaPlantacion?: string | null;
        planManejo?: string | null;
        nroaviso?: string | null;
    };
    linea?: { codLinea?: number | string; nombreLinea?: string };
    folio?: number | string;
    estado?: { texto?: string };
    createdAt?: string;

    // nuevos según objeto
    emisor?: {
        rut?: number | string;
        empresa?: number;
        nombre?: string;
        email?: string;
        rol?: string;
    };
    empresa?: {
        id?: number;
        rut?: number;
        dv?: string;
        razonSocial?: string;
        direccion?: string;
        comuna?: string;
        ciudad?: string;
        giro?: string;
        correo?: string;
        actividadEconomica?: string;
        telefono?: string | null;
        fechaResolucion?: string | null;
        numeroResolucion?: number | null;
        codigoSII?: string | null;
        actividadSII?: string | null;
    };
    indicadorTraslado?: { id?: string; texto?: string };
    trasvasije?: boolean;
    ventaPiso?: boolean;
    precioProducto?: {
        precio?: number | null;
        indicadorPrecioPorDefecto?: boolean;
    };
    carguios?: {
        rutCarguio?: string;
        nombreCarguio?: string;
        patenteCarguio?: string;
    }[];
    patentesCarguio?: string[];
    ubicacion?: unknown | null;
    totales?: {
        neto: number;
        mr?: { volumen?: number; valor?: number };
        m3?: { volumen?: number; valor?: number };
        ton?: { volumen?: number; valor?: number };
        totalMr?: number;
        volMr?: number;
        ivaPct?: number;
        ivaMonto?: number;
        total?: number;
    };

    comentarios?: {
        cosechaPagada?: boolean;
        maderaPagada?: boolean;
        horaLlegada?: string | null;
        horaSalida?: string | null;
        sectorOrigen?: string;
        destino?: string;
        guiaProveedor?: string;
        volumenProveedor?: number | null;
        anioCosecha?: number | null;
        fechaPlantacion?: string | null;
        planManejo?: string | null;
        puntoX?: number | null;
        puntoY?: number | null;
        numeroGuiaAnterior?: number | null;
        comentarios?: string;
    };
    ordenCompra?: {
        glosaFormaPago?: string | null;
    };
}

const props = defineProps<{ doc: GdeDoc | null | undefined }>();

const unidadesMedida = config.parametros.unidadesMedida;

const unidadActual = computed(() =>
    (props.doc?.producto?.unidadMedida || "").trim().toUpperCase()
);

const showMR = computed(() => unidadActual.value === unidadesMedida.MR);
const showM3 = computed(() => unidadActual.value === unidadesMedida.M3);
const showTon = computed(() =>
    [unidadesMedida.TON, unidadesMedida.BDMT, unidadesMedida.M3ST].includes(
        unidadActual.value
    )
);

const patenteCarroTexto = computed(() => {
    const pc = props.doc?.patenteCarro as any;
    if (!pc) return "—";
    if (typeof pc === "string") return pc;
    return pc?.patCarro ?? "—";
});

const anchoCarro = computed(() => {
    const pc = props.doc?.patenteCarro as any;
    if (!pc || typeof pc === "string") return null;
    const n = Number(pc?.anchoCarro);
    return Number.isFinite(n) ? n : null;
});

function formatHora(h?: string | null) {
    if (!h) return "—";
    // acepta "HH:mm" o ISO; si es ISO extrae hora local
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(h)) return h.slice(0, 5);
    const d = new Date(h);
    return isNaN(d as any)
        ? "—"
        : d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatBool(v?: any) {
    if (v === null || v === undefined) return "—";
    // también interpreta "1"/1/"true"
    const b =
        typeof v === "string"
            ? ["1", "true", "sí", "si"].includes(v.toLowerCase())
            : !!v;
    return b ? "Sí" : "No";
}

function formatCLP(n?: number | null) {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
    });
}

function formatNum(n?: number | string | null) {
    if (n === null || n === undefined || n === "") return "—";
    const v = typeof n === "string" ? Number(n) : n;
    return isNaN(v as number) ? "—" : (v as number).toLocaleString("es-CL");
}

function formatCoord(n?: number | null) {
    if (n === null || n === undefined) return "—";
    return n.toFixed(6);
}
</script>

<template>
    <f7-card>
        <f7-card-content>
            <!-- Encabezado -->
            <div class="section">
                <div class="section-title">Encabezado</div>
                <dl class="kv">
                    <dt>Folio</dt>
                    <dd>{{ props.doc?.folio ?? "Sin folio" }}</dd>
                    <dt>Estado</dt>
                    <dd>{{ props.doc?.estado?.texto ?? "—" }}</dd>
                    <dt>Creada</dt>
                    <dd>{{ formatFecha(props.doc?.createdAt) }}</dd>
                </dl>
            </div>

            <!-- Emisor / Empresa -->
            <div class="section">
                <div class="section-title">Emisor</div>
                <dl class="kv">
                    <dt>Nombre</dt>
                    <dd>{{ props.doc?.emisor?.nombre ?? "—" }}</dd>
                    <dt>RUT</dt>
                    <dd>{{ props.doc?.emisor?.rut ?? "—" }}</dd>
                    <dt>Email</dt>
                    <dd>{{ props.doc?.emisor?.email ?? "—" }}</dd>
                </dl>
            </div>

            <div class="section">
                <div class="section-title">Empresa</div>
                <dl class="kv">
                    <dt>Razón Social</dt>
                    <dd>{{ props.doc?.empresa?.razonSocial ?? "—" }}</dd>
                    <dt>RUT</dt>
                    <dd>
                        {{ props.doc?.empresa?.rut ?? "—" }}-{{
                            props.doc?.empresa?.dv ?? ""
                        }}
                    </dd>
                    <dt>Giro</dt>
                    <dd>{{ props.doc?.empresa?.giro ?? "—" }}</dd>
                    <dt>Ciudad</dt>
                    <dd>{{ props.doc?.empresa?.ciudad ?? "—" }}</dd>
                </dl>
            </div>

            <!-- Origen -->
            <div class="section">
                <div class="section-title">Origen</div>
                <dl class="kv">
                    <dt>Zona</dt>
                    <dd>{{ props.doc?.zona?.descripcion ?? "—" }}</dd>
                    <dt>Proveedor</dt>
                    <dd>{{ props.doc?.proveedor?.nomProveedor ?? "—" }}</dd>
                    <dt>Predio</dt>
                    <dd>{{ props.doc?.predio?.predio ?? "—" }}</dd>
                </dl>
            </div>

            <!-- Destino -->
            <div class="section">
                <div class="section-title">Destino</div>
                <dl class="kv">
                    <dt>Cliente</dt>
                    <dd>{{ props.doc?.cliente?.razonSocialCliente ?? "—" }}</dd>
                    <dt>Destino</dt>
                    <dd>{{ props.doc?.destino?.destinoCliente ?? "—" }}</dd>
                </dl>
            </div>

            <!-- Producto -->
            <div class="section">
                <div class="section-title">Producto</div>
                <dl class="kv">
                    <dt>Nombre</dt>
                    <dd>{{ props.doc?.producto?.nombreProducto ?? "—" }}</dd>
                    <dt>UM</dt>
                    <dd>{{ props.doc?.producto?.unidadMedida ?? "—" }}</dd>
                    <dt>Largo</dt>
                    <dd>{{ props.doc?.largoProducto ?? "—" }} Metro(s)</dd>
                    <dt>Categoría</dt>
                    <dd>{{ props.doc?.producto?.categoria ?? "—" }}</dd>
                    <dt>FSC</dt>
                    <dd>{{ formatBool(props.doc?.producto?.fsc) }}</dd>
                    <dt>SAG</dt>
                    <dd>{{ formatBool(props.doc?.producto?.sag) }}</dd>
                </dl>
            </div>

            <!-- Precio e Indicadores -->
            <div class="section">
                <div class="section-title">Precio e Indicadores</div>
                <dl class="kv">
                    <dt>Precio Unitario</dt>
                    <dd>
                        {{
                            formatCLP(props.doc?.precioProducto?.precio ?? null)
                        }}
                        <template v-if="props.doc?.producto?.unidadMedida">
                            / {{ props.doc?.producto?.unidadMedida }}</template
                        >
                    </dd>
                    <dt>Precio por defecto</dt>
                    <dd>
                        {{
                            formatBool(
                                props.doc?.precioProducto
                                    ?.indicadorPrecioPorDefecto
                            )
                        }}
                    </dd>
                    <dt>Indicador Traslado</dt>
                    <dd>{{ props.doc?.indicadorTraslado?.texto ?? "—" }}</dd>
                    <dt>Trasvasije</dt>
                    <dd>{{ formatBool(props.doc?.trasvasije) }}</dd>
                    <dt>Venta en piso</dt>
                    <dd>{{ formatBool(props.doc?.ventaPiso) }}</dd>
                    <dt>Forma de pago</dt>
                    <dd>{{ props.doc?.ordenCompra?.glosaFormaPago ?? "—" }}</dd>
                </dl>
            </div>

            <!-- Transporte -->
            <div class="section">
                <div class="section-title">Transporte</div>
                <dl class="kv">
                    <dt>Transportista</dt>
                    <dd>
                        {{ props.doc?.transportista?.nomTransportista ?? "—" }}
                    </dd>
                    <dt>Camión</dt>
                    <dd>{{ props.doc?.patenteCamion?.patCamion ?? "—" }}</dd>
                    <dt>Carro</dt>
                    <dd>
                        {{ patenteCarroTexto }}
                        <template v-if="anchoCarro !== null">
                            <span class="pill">ancho: {{ anchoCarro }}</span>
                        </template>
                    </dd>

                    <dt>Conductor</dt>
                    <dd>{{ props.doc?.conductor?.nomChofer ?? "—" }}</dd>

                    <dt>Patentes de Carguío</dt>
                    <dd>
                        <template v-if="props.doc?.patentesCarguio?.length">
                            {{ props.doc?.patentesCarguio?.join(", ") }}
                        </template>
                        <template v-else>—</template>
                    </dd>

                    <dt>Carguíos</dt>
                    <dd>
                        <template v-if="props.doc?.carguios?.length">
                            <ul class="ul-compact">
                                <li
                                    v-for="c in props.doc?.carguios"
                                    :key="c.patenteCarguio"
                                >
                                    {{ c.nombreCarguio }} ({{
                                        c.patenteCarguio
                                    }})
                                </li>
                            </ul>
                        </template>
                        <template v-else>—</template>
                    </dd>
                </dl>
            </div>

            <!-- Empresa Contratista -->
            <div class="section">
                <div class="section-title">Empresa Contratista</div>
                <dl class="kv">
                    <dt>Contratista</dt>
                    <dd>
                        {{
                            props.doc?.empresaContratista?.nombreContratista ??
                            "—"
                        }}
                    </dd>
                    <dt>RUT</dt>
                    <dd>
                        {{
                            props.doc?.empresaContratista?.rutContratista ?? "—"
                        }}
                    </dd>
                </dl>
            </div>

            <!-- Rodal -->
            <div class="section">
                <div class="section-title">Rodal</div>
                <dl class="kv">
                    <dt>Origen</dt>
                    <dd>{{ props.doc?.rodal?.codOrigen ?? "—" }}</dd>
                    <dt>Código Rodal</dt>
                    <dd>{{ props.doc?.rodal?.codrodal ?? "—" }}</dd>
                    <dt>Nombre Rodal</dt>
                    <dd>{{ props.doc?.rodal?.nomrodal ?? "—" }}</dd>
                    <dt>Fecha Plantación</dt>
                    <dd>
                        {{
                            formatFecha(
                                props.doc?.rodal?.fechaPlantacion ?? null
                            )
                        }}
                    </dd>
                    <dt>Plan Manejo</dt>
                    <dd>{{ props.doc?.rodal?.planManejo ?? "—" }}</dd>
                </dl>
            </div>

            <!-- Línea -->
            <div class="section">
                <div class="section-title">Línea</div>
                <dl class="kv">
                    <dt>Código</dt>
                    <dd>{{ props.doc?.linea?.codLinea ?? "—" }}</dd>
                    <dt>Nombre</dt>
                    <dd>{{ props.doc?.linea?.nombreLinea ?? "—" }}</dd>
                </dl>
            </div>

            <!-- Totales -->
            <div class="section">
                <div class="section-title">Totales</div>
                <dl class="kv">
                    <!-- MR -->
                    <template v-if="showMR">
                        <dt>MR (vol/valor)</dt>
                        <dd>
                            {{ formatNum(props.doc?.totales?.mr?.volumen) }} /
                            {{
                                formatCLP(props.doc?.totales?.mr?.valor ?? null)
                            }}
                        </dd>
                    </template>

                    <!-- M3 -->
                    <template v-if="showM3">
                        <dt>M³ (vol/valor)</dt>
                        <dd>
                            {{ formatNum(props.doc?.totales?.m3?.volumen) }} /
                            {{
                                formatCLP(props.doc?.totales?.m3?.valor ?? null)
                            }}
                        </dd>
                    </template>

                    <!-- Astillas / Ton -->
                    <template v-if="showTon">
                        <dt>Astillas (vol/valor)</dt>
                        <dd>
                            {{ formatNum(props.doc?.totales?.ton?.volumen) }} /
                            {{
                                formatCLP(
                                    props.doc?.totales?.ton?.valor ?? null
                                )
                            }}
                        </dd>
                    </template>

                    <!-- Ajustados -->
                    <dt>Neto</dt>
                    <dd>{{ formatCLP(props.doc?.totales?.neto ?? null) }}</dd>

                    <dt>IVA</dt>
                    <dd>
                        {{ props.doc?.totales?.ivaPct ?? 19 }}% /
                        {{ formatCLP(props.doc?.totales?.ivaMonto ?? null) }}
                    </dd>

                    <dt>Total</dt>
                    <dd>{{ formatCLP(props.doc?.totales?.total ?? null) }}</dd>
                </dl>
            </div>

            <!-- Comentarios y Tiempos -->
            <div class="section">
                <div class="section-title">Comentarios / Tiempos</div>
                <dl class="kv">
                    <dt>Cosecha pagada</dt>
                    <dd>
                        {{ formatBool(props.doc?.comentarios?.cosechaPagada) }}
                    </dd>
                    <dt>Madera pagada</dt>
                    <dd>
                        {{ formatBool(props.doc?.comentarios?.maderaPagada) }}
                    </dd>
                    <dt>Hora llegada</dt>
                    <dd>
                        {{
                            formatHora(
                                props.doc?.comentarios?.horaLlegada ?? null
                            )
                        }}
                    </dd>
                    <dt>Hora salida</dt>
                    <dd>
                        {{
                            formatHora(
                                props.doc?.comentarios?.horaSalida ?? null
                            )
                        }}
                    </dd>
                    <dt>Sector origen</dt>
                    <dd>{{ props.doc?.comentarios?.sectorOrigen || "—" }}</dd>
                    <dt>Destino</dt>
                    <dd>{{ props.doc?.comentarios?.destino || "—" }}</dd>
                    <dt>Guía proveedor</dt>
                    <dd>{{ props.doc?.comentarios?.guiaProveedor || "—" }}</dd>
                    <dt>Vol. proveedor</dt>
                    <dd>
                        {{
                            formatNum(
                                props.doc?.comentarios?.volumenProveedor ?? null
                            )
                        }}
                    </dd>
                    <dt>Año cosecha</dt>
                    <dd>{{ props.doc?.comentarios?.anioCosecha ?? "—" }}</dd>
                    <dt>Punto X</dt>
                    <dd>
                        {{
                            formatCoord(props.doc?.comentarios?.puntoX ?? null)
                        }}
                    </dd>
                    <dt>Punto Y</dt>
                    <dd>
                        {{
                            formatCoord(props.doc?.comentarios?.puntoY ?? null)
                        }}
                    </dd>
                    <dt>Número guía anterior</dt>
                    <dd>
                        {{ props.doc?.comentarios?.numeroGuiaAnterior || "—" }}
                    </dd>
                    <dt>Comentarios</dt>
                    <dd>{{ props.doc?.comentarios?.comentarios || "—" }}</dd>
                </dl>
            </div>
        </f7-card-content>
    </f7-card>
</template>


<style scoped>
.section {
    padding: 8px 0 2px;
    border-bottom: 1px solid var(--f7-list-item-border-color, #ececec);
}
.section:last-child {
    border-bottom: 0;
}
.section-title {
    font-weight: 600;
    font-size: 13px;
    color: #374151;
    margin-bottom: 6px;
}
.kv {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 4px 12px;
    margin: 0;
}
.kv dt {
    margin: 0;
    color: #6b7280;
    font-size: 12px;
    font-weight: 500;
}
.kv dd {
    margin: 0;
    font-size: 13px;
}
.meta .kv dt {
    color: #4b5563;
}
.ul-compact {
    list-style: disc;
    padding-left: 18px;
    margin: 0;
}
</style>
