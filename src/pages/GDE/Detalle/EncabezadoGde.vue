<template>
    <f7-card>
        <f7-card-content>
            <table class="data-table" style="width: 100%">
                <tbody>
                    <tr>
                        <td class="label-cell"><b>Folio:</b></td>
                        <td>{{ doc.folio ?? "Sin folio" }}</td>
                    </tr>
                    <tr>
                        <td class="label-cell"><b>Estado:</b></td>
                        <td>
                            <f7-badge :color="doc.estado?.color || 'gray'">
                                {{ doc.estado?.texto ?? "—" }}
                            </f7-badge>
                        </td>
                    </tr>
                    <tr>
                        <td class="label-cell"><b>Creada:</b></td>
                        <td>{{ formatFecha(doc.createdAt) }}</td>
                    </tr>
                </tbody>
            </table>
        </f7-card-content>
    </f7-card>
</template>

<script>
export default {
    name: "EncabezadoGde",
    props: { doc: Object, required: true },
};
</script>