<template>
    <f7-list inset strong>
        <f7-list-item
            link
            @click="onEmitir"
            title="Emitir guía"
            class="text-green-600"
        >
            <template #media>
                <f7-icon ios="f7:paperplane_fill" md="material:send"></f7-icon>
            </template>
        </f7-list-item>

        <f7-list-item
            link
            @click="onGenerarPDF"
            title="Generar PDF"
            class="text-green-600"
        >
            <template #media>
                <f7-icon
                    ios="f7:doc_text_fill"
                    md="material:picture_as_pdf"
                ></f7-icon>
            </template>
        </f7-list-item>

        <f7-list-item
            link
            @click="onDescartar"
            title="Descartar borrador"
            class="text-red-600"
        >
            <template #media>
                <f7-icon ios="f7:trash_fill" md="material:delete"></f7-icon>
            </template>
        </f7-list-item>
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

        onGenerarPDF() {
            this.$emit("generar-pdf", this.doc);
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
