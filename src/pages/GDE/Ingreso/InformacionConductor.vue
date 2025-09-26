<template>
    <f7-card>
        <f7-card-content padding>
            <f7-block class="margin-top">
                <div
                    class="alert"
                    style="
                        border: 1px solid #bce8f1;
                        background-color: #d9edf7;
                        color: #31708f;
                        border-radius: 6px;
                        padding: 10px 15px;
                        font-size: 14px;
                    "
                >
                    <i
                        class="f7-icons"
                        style="font-size: 16px; margin-right: 6px"
                        >info_circle</i
                    >
                    ¿No encuentras al conductor en la lista? Puedes
                    <strong>editar sus datos</strong> desde aquí. Asegúrate de
                    ingresar un <strong>RUT válido</strong> y el
                    <strong>Nombre</strong>.
                </div>
            </f7-block>

            <f7-list strong inset dividers-ios class="mb-4 margin-top">
                <!-- RUT -->
                <f7-list-input
                    label="RUT"
                    type="text"
                    placeholder="12.345.678-5"
                    :value="local.rutChofer"
                    :error-message="rutValido ? '' : 'RUT inválido'"
                    :error="!rutValido"
                    clear-button
                    maxlength="12"
                    @input="onRutInput($event.target.value)"
                />

                <!-- Nombre -->
                <f7-list-input
                    label="Nombre"
                    type="text"
                    placeholder="Nombre del conductor"
                    :value="local.nomChofer"
                    clear-button
                    @input="onNombreInput($event.target.value)"
                />
            </f7-list>
        </f7-card-content>
    </f7-card>
</template>

<script>
export default {
    name: "InformacionConductor",
    props: {
        conductor: { type: Object, required: true },
    },
    emits: ["update:conductor", "validez"],
    data() {
        return {
            local: { ...this.conductor }, // copia editable
            rutValido: true,
            nombreValido: true,
        };
    },
    watch: {
        // si el padre cambia, resincronizamos
        conductor: {
            deep: true,
            handler(n) {
                console.log(this.conductor);
                this.local = { ...n };
                this.rutValido = this.validarRut(this.local.rutChofer);
            },
        },
    },
    methods: {
        // ---- entradas ----
        onRutInput(v) {
            const formateado = this.formatearRut(v);
            this.local.rutChofer = formateado;
            this.rutValido = this.validarRut(formateado);
            this.emitir();
        },
        onNombreInput(v) {
            this.local.nomChofer = v;
            this.nombreValido = this.local.nomChofer.length > 0 ? true : false;
            this.emitir();
        },

        emitir() {
            const valido = this.rutValido && this.nombreValido;
            console.log("emitir", valido);

            this.$emit("validez", valido);
            this.$emit("update:conductor", { ...this.local });
        },

        // ---- utilidades RUT (Chile) ----
    },
};
</script>
