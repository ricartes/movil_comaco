// src/app/mappers/Forestruck/ForestruckImportSummary.js

export const FORESTRUCK_IMPORT_SUMMARY = [
    {
        group: "Producto",
        fields: [
            { path: "producto.codProducto", label: "Código" },
            { path: "producto.nombreProducto", label: "Nombre" },
            { path: "largoProducto", label: "Largo (m)", fmt: (v) => (v == null ? "—" : `${v} m`) },
        ],
    },
    {
        group: "Transporte",
        fields: [
            { path: "transportista.rutTransportista", label: "RUT" },
            { path: "transportista.nomTransportista", label: "Nombre" },
            { path: "patenteCamion.patCamion", label: "Patente Camión" },
            { path: "patenteCarro.patCarro", label: "Patente Carro" },
        ],
    },
    {
        group: "Conductor",
        fields: [
            { path: "conductor.rutChofer", label: "RUT" },
            { path: "conductor.nomChofer", label: "Nombre" },
        ],
    },
    {
        group: "Totales",
        fields: [
            { path: "totales.ton", label: "Toneladas", fmt: (v) => (v == null ? "—" : String(v)) },
            { path: "totales.m3", label: "m³", fmt: (v) => (v == null ? "—" : String(v)) },
            { path: "totales.mr", label: "MR", fmt: (v) => (v == null ? "—" : String(v)) },
        ],
    },
];
