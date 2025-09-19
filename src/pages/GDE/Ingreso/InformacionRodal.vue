<template>
    <div class="card data-table data-table-init">
        <div class="card-content">
            <table>
                <tbody>
                    <tr>
                        <td class="label-cell">Rodal</td>
                        <td class="label-cell">
                            {{ rodal.nomrodal }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Fecha plantación</td>
                        <td class="label-cell">
                            {{ rodal.fechaPlantacion }}
                        </td>
                    </tr>

                    <tr>
                        <td class="label-cell">Plan manejo</td>
                        <td class="label-cell">
                            {{ rodal.planManejo }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell">Nro, aviso</td>
                        <td class="label-cell">
                            {{ rodal.nroaviso }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
export default {
    name: "InformacionRodal",
    props: {
        rodal: { type: Object, required: true },
    },
};
</script>
