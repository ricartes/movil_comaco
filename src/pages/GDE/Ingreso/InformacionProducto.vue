<template>
    <div class="card data-table data-table-init">
        <div class="card-content">
            <table>
                <tbody>
                    <tr>
                        <td class="label-cell">Producto</td>
                        <td class="label-cell">
                            {{ producto.nombreProducto }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Precio</td>
                        <td class="label-cell">
                            ${{ precioProducto.precio }}
                            <f7-badge v-if="precioProducto.indicadorPrecioPorDefecto" color="orange"
                                style="margin-left: 8px">
                                por defecto
                            </f7-badge>
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Unidad medida</td>
                        <td class="label-cell">
                            {{ producto.unidadMedida }}
                        </td>
                    </tr>

                    <tr>
                        <td class="label-cell">Resolución SAG</td>
                        <td class="label-cell">
                            {{ producto.sag ?? "" }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Tipo Certificación</td>
                        <td class="label-cell">
                            {{ producto.tipoCertificacion ?? "" }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Código Certificación</td>
                        <td class="label-cell">
                            {{ producto.codigoCertificacion ?? "" }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
export default {
    name: "InformacionProducto",
    props: {
        producto: { type: Object, required: true },
        precioProducto: { type: Object, required: true },
    },
};
</script>
