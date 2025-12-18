<template>
    <div class="card data-table data-table-init">
        <div class="card-content">
            <table>
                <tbody>
                    <tr>
                        <td class="label-cell">Ancho Bancos Camión</td>
                        <td class="label-cell">
                            {{ camion.anchoCamion }} Metros.
                        </td>
                    </tr>

                    <tr>
                        <td class="label-cell">Ancho Bancos Carro</td>
                        <td class="label-cell">
                            {{ carro.anchoCarro }} Metros.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
export default {
    name: "InformacionCamion",
    props: {
        camion: { type: Object, required: true },
        carro: { type: Object, required: true },
    },
};
</script>
