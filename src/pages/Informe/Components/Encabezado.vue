<template>
    <f7-card>
        <f7-card-content>
            <div class="section">
                <dl class="kv">
                    <template v-if="tipoInforme === 'detalle'">
                        <dt>ORIGEN</dt>
                        <dd>
                            {{ encabezado.origen || "-" }}
                        </dd>

                        <dt>PRODUCTO</dt>
                        <dd>
                            {{ encabezado.producto || "-" }}
                        </dd>
                        <dt>DESTINO</dt>
                        <dd>
                            {{ encabezado.destino || "-" }}
                        </dd>
                    </template>

                    <template v-else>
                        <dt>PREDIO</dt>
                        <dd>
                            {{ encabezado.predio || "-" }}
                        </dd>
                        <dt>ROL</dt>
                        <dd>{{ encabezado.rol || "-" }}</dd>

                        <dt>GIRO</dt>
                        <dd>-</dd>
                        <!-- TODO: COLOCAR GIRO CLIENTE -->
                        <dt>CLIENTE</dt>
                        <dd>
                            {{ encabezado.cctRut || "-" }}
                            <!-- TODO: COLOCAR NOMBRE CLIENTE CLIENTE -->
                        </dd>
                        <dt>PRODUCTO</dt>
                        <dd>
                            {{ encabezado.producto || "-" }}
                        </dd>
                        <dt>DESTINO</dt>
                        <dd>
                            {{ encabezado.destino || "-" }}
                        </dd>
                    </template>
                </dl>
            </div>
        </f7-card-content>
    </f7-card>
</template>

<script>
export default {
    name: "Encabezado",
    props: {
        encabezado: { type: Object, required: true },
        tipoInforme: { type: String, default: "detalle" },
    },
};
</script>

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