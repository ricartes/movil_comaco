<template>
    <f7-navbar title="Dasboard" />

    <f7-block strong>
        <div>Hola, {{ user?.nombre || "Usuario" }}</div>
        <div v-if="offline">Estás en modo offline</div>
    </f7-block>
</template>

<script setup>
import { computed } from "vue";
import store from "@/js/store";
const user = computed(() => store.state.user);
const offline = computed(() => store.state.offline);
</script>
