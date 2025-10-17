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
                    <tr v-if="isNula">
                        <td class="label-cell"><b>Motivo anulación:</b></td>
                        <td>{{ doc.motivoAnulacion ?? "-" }}</td>
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
import config from "@/Common/json/config.json";
export default {
    name: "EncabezadoGde",
    props: { doc: Object, required: true },
    computed: {
        st() {
            return this.doc?.estado?.id;
        },
        EG() {
            return config?.parametros?.estadosGuia || {};
        },
        ID_NULA() {
            return this.EG.NULA?.id ?? this.EG.NULA;
        },
        isNula() {
            return this.st === this.ID_NULA;
        },
    },
};
</script>