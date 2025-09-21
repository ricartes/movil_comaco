<template>
    <f7-block strong inset>
        <div class="section-title">Ingreso de Volumen</div>

        <f7-list no-hairlines-md>
            <f7-list-input
                label="Volumen (m³)"
                type="number"
                placeholder="Ingrese volumen"
                clear-button
                v-model="volumen"
                @input="onVolumenChange"
            />
        </f7-list>
    </f7-block>
</template>

<script>
export default {
    name: "IngresoVolumen",
    props: {
        doc: Object, // si quieres saber a qué guía pertenece
    },
    data() {
        return {
            volumen: "",
        };
    },
    methods: {
        onVolumenChange() {
            console.log(
                "Volumen ingresado:",
                this.volumen,
                "para doc:",
                this.doc?._id
            );
        },
    },
};
</script>

<style scoped>
.section-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 8px;
}
</style>
