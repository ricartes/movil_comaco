<template>
    <f7-navbar title="Dashboard" />

    <!-- Header contextual -->
    <f7-block strong inset class="hero">
        <div class="hero-row">
            <div class="hero-col">
                <div class="hi">
                    Hola,
                    <span class="name">{{ user?.nombre || "Usuario" }}</span> 👋
                </div>
                <div class="sub">{{ todayStr }}</div>

                <div v-if="offline" class="offline">
                    <f7-icon ios="f7:wifi_slash" md="material:wifi_off" />
                    Estás en modo offline
                </div>
            </div>

            <div class="hero-avatar">
                <div class="avatar">{{ initials }}</div>
            </div>
        </div>

        <!-- Texto contextual -->

        <div class="desc">
            Aquí podrás visualizar un resumen de tus guías de despacho
            recientes: su estado, distribución por unidad de medida y evolución
            diaria.
        </div>
    </f7-block>

    <!-- Acciones rápidas -->
    <f7-block-title>Acciones rápidas</f7-block-title>
    <f7-list inset strong>
        <!-- Nueva guía -->
        <f7-list-item link title="Nueva guía" @click="nuevaGuia" color="green">
            <template #media>
                <f7-icon f7="plus_circle_fill" color="green"></f7-icon>
            </template>
        </f7-list-item>

        <f7-list-item
            link
            title="Generar informe"
            @click="abrirInforme"
            color="blue"
        >
            <template #media>
                <f7-icon f7="doc_text_fill" color="blue"></f7-icon>
            </template>
        </f7-list-item>
    </f7-list>

    <DashboardPrincipal />
</template>

<script>
import { f7 } from "framework7-vue";
import store from "@/js/store";
import DashboardPrincipal from "@/pages/Home/Dashboard/DashboardPrincipal.vue";

export default {
    name: "DashboardPage",
    components: { DashboardPrincipal },
    data() {
        return {
            // no hace falta más, todo viene del store
        };
    },
    computed: {
        user() {
            return store.state.user;
        },
        offline() {
            return store.state.offline;
        },
    },
    methods: {
        nuevaGuia() {
            f7.views.main?.router?.navigate("/gde/ingreso/?tab=home");
        },
        abrirInforme() {
            f7.views.main?.router?.navigate("/informe/");
        },
    },
};
</script>
