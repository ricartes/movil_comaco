<template>
    <f7-page data-name="folios" @page:back.prevent>
        <f7-navbar>
            <f7-nav-left>
                <f7-link @click="back">
                    <f7-icon icon="icon-back" />
                </f7-link>
            </f7-nav-left>
            <f7-nav-title>Listado de folios</f7-nav-title>
        </f7-navbar>

        <!-- Selector de Usuario Rango Folio -->
        <f7-list form strong inset dividers class="margin-top">
            <f7-list-item
                title="Rango asignado"
                class="select-rango-folio"
                smart-select
                :smart-select-params="{
                    openIn: 'popup',
                    closeOnSelect: true,
                    searchbar: true,
                    searchbarPlaceholder: 'Buscar…',
                }"
            >
                <select v-model="selectedUrfId" @change="onUrfChange">
                    <option v-for="u in urfs" :key="u._id" :value="u.urfId">
                        #{{ u.urfId }} · {{ u.folioInicial }}–{{
                            u.folioFinal
                        }}
                        ({{ u.cantidad ?? u.folioFinal - u.folioInicial + 1 }}
                        folios)
                    </option>
                </select>
            </f7-list-item>
        </f7-list>

        <!-- Estado vacío -->
        <div v-if="!loading && folios.length === 0" class="empty">
            <f7-icon f7="doc_text" size="44"></f7-icon>
            <div class="empty-title">Sin folios</div>
            <div class="empty-sub">Elige un rango para ver sus folios.</div>
        </div>

        <!-- Lista de folios -->
        <!-- Lista de folios -->
        <f7-list v-else media-list inset strong dividers>
            <f7-list-item
                v-for="f in foliosOrdenados"
                :key="f._id"
                swipeout
                :title="`Folio ${f.folio}`"
            >
                <template #media>
                    <f7-icon ios="f7:number" md="material:tag" />
                </template>

                <template #after>
                    <span class="chip chip-small" :class="chipClass(f.estado)">
                        <span class="chip-label">{{
                            estadoLabel(f.estado)
                        }}</span>
                    </span>
                </template>

                <template #text>
                    <div class="muted">
                        URF: {{ f.urfId }} · Empresa: {{ f.empId }}
                    </div>
                </template>

                <!-- Swipe actions (izquierda o derecha, como prefieras) -->
                <f7-swipeout-actions right> </f7-swipeout-actions>
            </f7-list-item>
        </f7-list>
    </f7-page>
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import config from "@/Common/json/config.json";
import {
    listarUsuarioRangoFolio,
    listarFoliosPorUrf,
} from "@/app/services/SiiFoliosService";

export default {
    data() {
        return {
            urfs: [], // docs URF locales
            selectedUrfId: null, // value del smart-select
            folios: [], // folios del URF seleccionado
            loading: false,
        };
    },
    computed: {
        user() {
            return store.state.user;
        },
        empId() {
            return this.user?.empresa ?? this.user?.empId;
        },
        rut() {
            return String(this.user?.rut || "");
        },
        foliosOrdenados() {
            // orden por número de folio asc
            return [...this.folios].sort(
                (a, b) => Number(a.folio) - Number(b.folio)
            );
        },
    },
    async mounted() {
        f7.dialog.preloader("Cargando...");
        try {
            await this.cargarUsuarioRangoFolio();
            // seleccionar el primero si existe
            if (this.urfs.length > 0) {
                this.selectedUrfId = String(this.urfs[0].urfId); // importante: string
                this.onUrfChange();
                // (Opcional) forzar sync visual si ya existe la instancia:
                const ss = f7.smartSelect.get(
                    ".select-rango-folio .smart-select"
                );
                ss?.setValue([this.selectedUrfId]); // NO uses setValueText
            }
        } catch (e) {
            f7.dialog.alert("Ha ocurrido un error al cargar los folios.");
        } finally {
            f7.dialog.close();
        }
    },
    methods: {
        back() {
            f7.views.main?.router?.navigate("/home/?tab=menu", {
                reloadAll: true,
            });
        },

        urfLabel(u) {
            const cant =
                u.cantidad ?? Number(u.folioFinal) - Number(u.folioInicial) + 1;
            return `#${u.urfId} · ${u.folioInicial}–${u.folioFinal} (${cant} folios)`;
        },
        // Si Smart Select necesita formatear el texto mostrado del valor seleccionado:
        formatUrfValueText(values, selectEl) {
            // values = array de values seleccionados; tomamos el primero
            const val = Array.isArray(values) ? values[0] : values;
            const opt = Array.from(selectEl.options).find(
                (o) => o.value === String(val)
            );
            return opt ? opt.textContent : "—";
        },

        estadoLabel(e) {
            // D/A/U desde config si lo tienes; si no, directamente:
            switch ((e || "").toUpperCase()) {
                case config.parametros.estadosFolio.disponible:
                    return "Disponible";
                case config.parametros.estadosFolio.asignado:
                    return "Asignado";
                case config.parametros.estadosFolio.usado:
                    return "Usado";
                case config.parametros.estadosFolio.liberado:
                    return "Liberado";
                default:
                    return "—";
            }
        },
        chipClass(e) {
            switch ((e || "").toUpperCase()) {
                case config.parametros.estadosFolio.disponible:
                    return "chip-outline color-green";
                case config.parametros.estadosFolio.asignado:
                    return "chip-outline color-blue";
                case config.parametros.estadosFolio.usado:
                    return "chip-outline color-red";
                case config.parametros.estadosFolio.liberado:
                    return "chip-outline color-yellow";
                default:
                    return "chip-outline color-gray";
            }
        },

        async cargarUsuarioRangoFolio() {
            // Trae todos los URF locales y filtra por empId/rut del usuario activo
            try {
                this.urfs = await listarUsuarioRangoFolio(
                    this.user.empresa,
                    this.user.rut
                );
            } catch (e) {
                f7.dialog.alert(
                    "Ha ocurrido un error al cargar el listado de folios."
                );
            }
        },

        async onUrfChange() {
            if (!this.selectedUrfId) {
                this.folios = [];
                return;
            }
            this.loading = true;
            try {
                this.folios = await listarFoliosPorUrf(
                    this.empId,
                    this.selectedUrfId
                );
            } finally {
                this.loading = false;
            }
        },

        onLiberarFolio(folio) {
            // TODO: implementar liberar folio
            // Por ahora, sólo mostramos un toast
            f7.toast
                .create({
                    text: `Liberar folio ${folio.folio} (pendiente)`,
                    closeTimeout: 1500,
                })
                .open();
        },
    },
};
</script>

<style scoped>
.empty {
    display: grid;
    place-items: center;
    text-align: center;
    padding: 32px 16px;
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

.muted {
    color: #6b7280;
    font-size: 12px;
}

/* chip peque */
.chip-small {
    --f7-chip-padding-horizontal: 8px;
    --f7-chip-height: 20px;
    font-size: 11px;
}
</style>
