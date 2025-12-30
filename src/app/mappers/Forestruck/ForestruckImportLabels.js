// src/app/mappers/Forestruck/ForestruckImportSummary.js

export const FORESTRUCK_IMPORT_SUMMARY = [
    {
        group: "Zona",
        fields: [
            { path: "zona.codigo", label: "Código" },
            { path: "zona.descripcion", label: "Descripción" },
            { path: "zona.sector", label: "Sector" },
            { path: "zona.empId", label: "Empresa ID" },
        ],
    },
    {
        group: "Proveedor",
        fields: [
            { path: "proveedor.rutProveedor", label: "RUT" },
            { path: "proveedor.nomProveedor", label: "Nombre" },
            { path: "proveedor.codEncargado", label: "Cod. Encargado" },
        ],
    },

    {
        group: "Predio",
        fields: [
            { path: "predio.rolPredio", label: "ROL Predio" },
            { path: "predio.rolComuna", label: "ROL Comuna" },
            { path: "predio.predio", label: "Predio" },
        ],
    },
    {
        group: "Cliente",
        fields: [
            { path: "cliente.rutCliente", label: "RUT" },
            { path: "cliente.razonSocialCliente", label: "Razón social" },
        ],
    },
    {
        group: "Destino",
        fields: [
            { path: "destino.destinoCliente", label: "Destino" },
            { path: "destino.direccionDestinoCliente", label: "Dirección" },
            { path: "destino.comunaDestinoCliente", label: "Comuna" },
            { path: "destino.ciudadDestinoCliente", label: "Ciudad" },
        ],
    },
    {
        group: "Producto",
        fields: [
            { path: "producto.codProducto", label: "Código" },
            { path: "producto.nombreProducto", label: "Nombre" },
            { path: "producto.unidadMedida", label: "UM" },
            { path: "producto.categoria", label: "Categoría" },
            { path: "largoProducto", label: "Largo (m)", type: "number", fmt: (v) => (v == null ? "—" : `${v} m`) },
        ],
    },
    {
        group: "Precio",
        fields: [
            {
                path: "precioProducto.precio",
                label: "Precio",
                fmt: (v) => (v == null ? "—" : String(v)),
            }
        ],
    },
    {
        group: "Transportista",
        fields: [
            { path: "transportista.rutTransportista", label: "RUT" },
            { path: "transportista.nomTransportista", label: "Nombre" },
        ],
    },
    {
        group: "Patentes",
        fields: [
            { path: "patenteCamion.patCamion", label: "Patente Camión" },
            { path: "patenteCarro.patCarro", label: "Patente Carro" }, // requiere el fix del mapping
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
