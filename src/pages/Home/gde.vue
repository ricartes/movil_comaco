<template>
    <f7-page
        name="gde"
        ptr
        @ptr:refresh="onRefresh"
        :infinite="hasMore"
        :infinite-preloader="loadingMore"
        :infinite-distance="100"
        @infinite="onInfinite"
    >
        <f7-navbar title="Guias de despacho" />
        <!-- Empty state -->
        <div v-if="!loading && items.length === 0" class="empty">
            <f7-icon f7="doc_text" size="48"></f7-icon>
            <div class="empty-title">No se encuentran guías registradas</div>
            <div class="empty-sub">
                Desliza hacia abajo para actualizar o crea una nueva guía.
            </div>
        </div>

        <!-- Lista -->
        <f7-list media-list v-else>
            <f7-list-item
                v-for="g in items"
                :key="g._id || g.folio"
                :title="`Folio ${g.folio ?? '—'}`"
                :subtitle="g.estado?.texto ?? 'SIN ESTADO'"
                @click="openDetalle(g)"
            >
                <!-- Ícono a la izquierda -->
                <template #media>
                    <f7-icon f7="doc_text_fill"></f7-icon>
                </template>

                <!-- Línea principal -->
                <template #text>
                    <div class="row-line">
                        <span class="chip color-blue">{{
                            g.producto?.unidadMedida ?? ""
                        }}</span>
                        <span class="muted"
                            >Producto:
                            {{ g.producto?.nombreProducto ?? "" }}</span
                        >
                        <span class="muted"
                            >Largo: {{ g.largoProducto ?? "" }}</span
                        >
                    </div>

                    <div class="row-line">
                        <span class="muted"
                            >Zona: {{ g.zona?.descripcion ?? "" }}</span
                        >
                        <span class="muted"
                            >Cliente:
                            {{ g.cliente?.razonSocialCliente ?? "" }}</span
                        >
                    </div>

                    <div class="row-line">
                        <span class="muted"
                            >Transportista:
                            {{ g.transportista?.nomTransportista ?? "" }}</span
                        >
                        <span class="muted"
                            >Camión:
                            {{ g.patenteCamion?.patCamion ?? "" }}</span
                        >
                        <span class="muted"
                            >Carro: {{ g.patenteCarro ?? "" }}</span
                        >
                    </div>

                    <div class="row-line">
                        <span class="muted"
                            >Conductor: {{ g.conductor?.nomChofer ?? "" }}</span
                        >
                    </div>

                    <div class="row-line">
                        <span class="muted"
                            >Destino:
                            {{ g.destino?.destinoCliente ?? "" }}</span
                        >
                    </div>

                    <div class="row-line">
                        <span class="muted"
                            >Fecha: {{ formatFecha(g.createdAt) }}</span
                        >
                    </div>
                </template>
            </f7-list-item>
        </f7-list>

        <!-- FAB crear -->
        <f7-fab position="right-bottom" @click="onCrear">
            <f7-icon ios="f7:plus" md="material:add" />
        </f7-fab>
    </f7-page>
</template>

<script>
import { onMounted, ref, computed } from "vue";
import { f7 } from "framework7-vue";
import store from "@/js/store";
import {
    listarPorEmpresaYRutPaginado,
    listarPorEmpresaYRut,
} from "@/app/services/GdeService";

const PAGE_SIZE = 20;

export default {
    name: "GdePage",
    setup() {
        const user = computed(() => store.state.user);
        const empId = computed(() => user.value?.empresa ?? user.value?.empId); // por si aún usas "empresa"
        const rut = computed(() => String(user.value?.rut || ""));

        const items = ref([]);
        const loading = ref(true);
        const loadingMore = ref(false);
        const hasMore = ref(true);
        const skip = ref(0);

        // cache para fallback (si DAO no tiene paginado)
        let fullCache = null;

        async function fetchPage({ reset = false } = {}) {
            if (!empId.value || !rut.value) return;

            if (reset) {
                items.value = [];
                skip.value = 0;
                hasMore.value = true;
                fullCache = null;
            }

            // 1) Si el DAO ofrece método paginado, úsalo
            if (typeof listarPorEmpresaYRutPaginado === "function") {
                const page =
                    (await listarPorEmpresaYRutPaginado(
                        Number(empId.value),
                        rut.value,
                        { limit: PAGE_SIZE, skip: skip.value }
                    )) || [];

                if (reset) items.value = page;
                else items.value = items.value.concat(page);

                hasMore.value = page.length === PAGE_SIZE;
                skip.value += page.length;
                return;
            }

            // 2) Fallback: cargar todo una vez y paginar en memoria
            if (!fullCache) {
                fullCache = await listarPorEmpresaYRut(
                    Number(empId.value),
                    rut.value
                );
            }
            const slice = fullCache.slice(skip.value, skip.value + PAGE_SIZE);
            if (reset) items.value = slice;
            else items.value = items.value.concat(slice);

            hasMore.value = skip.value + slice.length < fullCache.length;
            skip.value += slice.length;
        }

        async function onRefresh(done) {
            try {
                await fetchPage({ reset: true });
            } catch (e) {
                f7.toast
                    .create({
                        text: e.message || "Error al actualizar",
                        closeTimeout: 2000,
                    })
                    .open();
            } finally {
                done?.();
            }
        }

        async function onInfinite() {
            if (loadingMore.value || !hasMore.value) return;
            loadingMore.value = true;
            try {
                await fetchPage();
            } catch (e) {
                f7.toast
                    .create({
                        text: e.message || "Error al cargar más",
                        closeTimeout: 2000,
                    })
                    .open();
            } finally {
                loadingMore.value = false;
            }
        }

        function onCrear() {
            // Navega a tu flujo de creación de GDE (ajusta la ruta)
            f7.views.main?.router?.navigate("/gde/ingreso/");
        }

        function openDetalle(g) {
            // Ajusta la ruta al detalle si la tienes
            f7.views.main?.router?.navigate(`/gde/${g.folio}`);
        }

        function formatFecha(ymd) {
            // ymd = "YYYY-MM-DD"
            if (!ymd) return "-";
            // muestra en formato DD-MM-YYYY
            const [Y, M, D] = ymd.split("-");
            return `${D}-${M}-${Y}`;
        }

        function formatMoney(n) {
            const v = Number(n || 0);
            return v.toLocaleString("es-CL", {
                style: "currency",
                currency: "CLP",
                maximumFractionDigits: 0,
            });
        }

        function formatVolumen(n) {
            const v = Number(n || 0);
            return v.toLocaleString("es-CL", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
            });
        }

        onMounted(async () => {
            try {
                await fetchPage({ reset: true });
            } catch (e) {
                f7.toast
                    .create({
                        text: e.message || "Error cargando guías",
                        closeTimeout: 2500,
                    })
                    .open();
            } finally {
                loading.value = false;
            }
        });

        return {
            items,
            loading,
            loadingMore,
            hasMore,
            onRefresh,
            onInfinite,
            onCrear,
            openDetalle,
            formatFecha,
            formatMoney,
            formatVolumen,
        };
    },
};
</script>

<style scoped>
.empty {
    display: grid;
    place-items: center;
    text-align: center;
    padding: 48px 16px;
    color: #6b7280;
}
.empty-title {
    margin-top: 8px;
    font-weight: 600;
}
.empty-sub {
    font-size: 13px;
    margin-top: 2px;
}
.row-line {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}
.muted {
    color: #6b7280;
    font-size: 12px;
}
.list-footer {
    text-align: center;
    padding: 12px 0 18px;
    color: #6b7280;
    font-size: 13px;
}
</style>
