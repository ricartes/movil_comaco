<script setup lang="ts">
// Con F7-Vue no hace falta importar <f7-block>, está auto-registrado.
// Si quieres tipar el prop, puedes declarar una interfaz parcial:
interface GdeDoc {
    zona?: { descripcion?: string };
    proveedor?: { nomProveedor?: string };
    predio?: { predio?: string };
    cliente?: { razonSocialCliente?: string };
    destino?: { destinoCliente?: string };
    producto?: {
        nombreProducto?: string;
        unidadMedida?: string;
        categoria?: string;
    };
    largoProducto?: number | string;
    transportista?: { nomTransportista?: string };
    patenteCamion?: { patCamion?: string };
    patenteCarro?: string;
    conductor?: { nomChofer?: string };
    empresaContratista?: {
        nombreContratista?: string;
        rutContratista?: string;
    };
    rodal?: {
        codOrigen?: string;
        codrodal?: number | string;
        nomrodal?: string;
    };
    linea?: { codLinea?: number | string; nombreLinea?: string };
    folio?: number | string;
    estado?: { texto?: string };
    createdAt?: string;
}

const props = defineProps<{
    doc: GdeDoc | null | undefined;
}>();

function formatFecha(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d as any)
        ? "—"
        : d.toLocaleDateString("es-CL", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
          });
}
</script>

<template>
    <f7-card>
        <f7-card-content>
            <div class="section">
                <div class="section-title">Origen</div>
                <dl class="kv">
                    <dt>Zona</dt>
                    <dd>{{ props.doc?.zona?.descripcion ?? "—" }}</dd>
                    <dt>Proveedor</dt>
                    <dd>{{ props.doc?.proveedor?.nomProveedor ?? "—" }}</dd>
                    <dt>Predio</dt>
                    <dd>{{ props.doc?.predio?.predio ?? "—" }}</dd>
                </dl>
            </div>

            <div class="section">
                <div class="section-title">Destino</div>
                <dl class="kv">
                    <dt>Cliente</dt>
                    <dd>{{ props.doc?.cliente?.razonSocialCliente ?? "—" }}</dd>
                    <dt>Destino</dt>
                    <dd>{{ props.doc?.destino?.destinoCliente ?? "—" }}</dd>
                </dl>
            </div>

            <div class="section">
                <div class="section-title">Producto</div>
                <dl class="kv">
                    <dt>Nombre</dt>
                    <dd>{{ props.doc?.producto?.nombreProducto ?? "—" }}</dd>
                    <dt>UM</dt>
                    <dd>{{ props.doc?.producto?.unidadMedida ?? "—" }}</dd>
                    <dt>Largo</dt>
                    <dd>{{ props.doc?.largoProducto ?? "—" }}</dd>
                    <dt>Categoría</dt>
                    <dd>{{ props.doc?.producto?.categoria ?? "—" }}</dd>
                </dl>
            </div>

            <div class="section">
                <div class="section-title">Transporte</div>
                <dl class="kv">
                    <dt>Transportista</dt>
                    <dd>
                        {{ props.doc?.transportista?.nomTransportista ?? "—" }}
                    </dd>
                    <dt>Camión</dt>
                    <dd>{{ props.doc?.patenteCamion?.patCamion ?? "—" }}</dd>
                    <dt>Carro</dt>
                    <dd>{{ props.doc?.patenteCarro ?? "—" }}</dd>
                    <dt>Conductor</dt>
                    <dd>{{ props.doc?.conductor?.nomChofer ?? "—" }}</dd>
                </dl>
            </div>

            <div class="section">
                <div class="section-title">Empresa Contratista</div>
                <dl class="kv">
                    <dt>Contratista</dt>
                    <dd>
                        {{
                            props.doc?.empresaContratista?.nombreContratista ??
                            "—"
                        }}
                    </dd>
                    <dt>RUT</dt>
                    <dd>
                        {{
                            props.doc?.empresaContratista?.rutContratista ?? "—"
                        }}
                    </dd>
                </dl>
            </div>

            <div class="section">
                <div class="section-title">Rodal</div>
                <dl class="kv">
                    <dt>Origen</dt>
                    <dd>{{ props.doc?.rodal?.codOrigen ?? "—" }}</dd>
                    <dt>Código Rodal</dt>
                    <dd>{{ props.doc?.rodal?.codrodal ?? "—" }}</dd>
                    <dt>Nombre Rodal</dt>
                    <dd>{{ props.doc?.rodal?.nomrodal ?? "—" }}</dd>
                </dl>
            </div>

            <div class="section">
                <div class="section-title">Línea</div>
                <dl class="kv">
                    <dt>Código</dt>
                    <dd>{{ props.doc?.linea?.codLinea ?? "—" }}</dd>
                    <dt>Nombre</dt>
                    <dd>{{ props.doc?.linea?.nombreLinea ?? "—" }}</dd>
                </dl>
            </div>

            <div class="section meta">
                <dl class="kv">
                    <dt>Folio</dt>
                    <dd>{{ props.doc?.folio ?? "Sin folio" }}</dd>
                    <dt>Estado</dt>
                    <dd>{{ props.doc?.estado?.texto ?? "—" }}</dd>
                    <dt>Creada</dt>
                    <dd>{{ formatFecha(props.doc?.createdAt) }}</dd>
                </dl>
            </div>
        </f7-card-content>
    </f7-card>
</template>

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
    grid-template-columns: 120px 1fr;
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
</style>
