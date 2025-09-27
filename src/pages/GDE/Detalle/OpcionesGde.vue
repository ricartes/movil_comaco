<template>
    <f7-list inset strong>
        <f7-list-button
            title="Emitir guía"
            color="green"
            fill
            @click="onEmitir"
        >
        </f7-list-button>

        <f7-list-button
            title="Descartar borrador"
            color="red"
            outline
            @click="onDescartar"
        >
        </f7-list-button>
    </f7-list>
</template>

<script>
import { f7 } from "framework7-vue";

export default {
    name: "OpcionesGde",
    props: {
        doc: { type: Object, required: true },
        loading: { type: Boolean, default: false }, // para deshabilitar mientras procesa
    },
    emits: ["emitir", "descartar"],
    methods: {
        onEmitir() {
            // puedes validar this.doc acá si quieres
            this.$emit("emitir", this.doc);
        },
        onDescartar() {
            f7.dialog.confirm(
                "¿Seguro que deseas descartar este borrador?",
                "Confirmar",
                () => this.$emit("descartar", this.doc)
            );
        },
    },
};
</script>

<style scoped>
.mb-0 {
    margin-bottom: 0;
}
</style>
