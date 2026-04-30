<template>
    <div class="card data-table data-table-init">
        <div class="card-content">
            <table>
                <tbody>
                    <tr>
                        <td class="label-cell">Dirección</td>
                        <td class="label-cell">
                            {{ destino.direccionCliente }}
                        </td>
                    </tr>

                    <tr>
                        <td class="label-cell">Comuna</td>
                        <td class="label-cell">
                            {{ destino.comunaDestinoCliente }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Ciudad</td>
                        <td class="label-cell">
                            {{ destino.ciudadDestinoCliente }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
export default {
    name: "InformacionDestino",
    props: {
        destino: { type: Object, required: true },
    },
};
</script>
