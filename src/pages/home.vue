<template>
    <f7-page>
        <f7-navbar title="Home" />

        <f7-block strong>
            <div>Hola, {{ user?.nombre || "Usuario" }}</div>
            <div v-if="offline">Estás en modo offline</div>
        </f7-block>
    </f7-page>
</template>


<script>
import { computed, onMounted } from "vue";
import store from "@/js/store";

export default {
    setup() {
        const user = computed(() => store.state.user);
        const offline = computed(() => store.state.offline);

        onMounted(() => {
            console.log("user(state) =", user.value);
            console.log("offline(state) =", offline.value);
        });

        return { user, offline };
    },
};
</script>


