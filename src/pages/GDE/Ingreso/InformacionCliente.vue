<template>
    <div class="card data-table data-table-init">
        <div class="card-content">
            <table>
                <tbody>
                    <tr>
                        <td class="label-cell">Indicador de traslado</td>
                        <td class="label-cell">
                            <span
                                class="badge"
                                :class="{
                                    'color-green':
                                        indicadorTraslado.id ===
                                        indicadoresTraslado.VENTA.id,
                                    'color-blue':
                                        indicadorTraslado.id ===
                                        indicadoresTraslado.TRASLADO.id,
                                }"
                            >
                                {{ indicadorTraslado.texto }}
                            </span>
                        </td>
                    </tr>

                    <tr>
                        <td class="label-cell">RUT</td>
                        <td class="label-cell">{{ cliente.rutCliente }}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Razón Social</td>
                        <td class="label-cell">
                            {{ cliente.razonSocialCliente }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Dirección</td>
                        <td class="label-cell">{{ cliente.direccionCliente }}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Comuna</td>
                        <td class="label-cell">{{ cliente.comunaCliente }}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Ciudad</td>
                        <td class="label-cell">{{ cliente.ciudadCliente }}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Giro</td>
                        <td class="label-cell">{{ cliente.giroCliente }}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Teléfono</td>
                        <td class="label-cell">
                            {{ cliente.telefonoCliente || "—" }}
                        </td>
                    </tr>

                    <!-- Slot opcional para filas extra -->
                    <slot />
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import config from "@/Common/json/config.json";

export default {
    name: "ClienteInfo",
    props: {
        cliente: { type: Object, required: true },
        // { id: 'V' | 'T', texto: string }
        indicadorTraslado: { type: Object, required: true },
        // Mapa para colorear el badge según el id del indicador
    },
    computed: {
        indicadoresTraslado() {
            return config.parametros.indicadoresTraslado;
        },
    },
};
</script>
