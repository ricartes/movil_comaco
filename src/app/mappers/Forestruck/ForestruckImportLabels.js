// src/app/mappers/Forestruck/ForestruckImportSummary.js

import { getUM, getVolumenByUM } from "@/js/Utils/volumen"; // o donde los tengas


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
        group: "Carguío",
        fields: [
            { path: "carguios[0].rutCarguio", label: "RUT Empresa carguío" },
            { path: "carguios[0].nombreCarguio", label: "Nombre Empresa carguío" },
            { path: "carguios[0].patenteCarguio", label: "Patente carguío" },
        ],
    },

    // ✅ NUEVO: Patentes carguío (array simple)
    {
        group: "Patentes carguío",
        fields: [
            { path: "patentesCarguio[0]", label: "Equipo / Patente carguío" },
        ],
    },

    // ✅ NUEVO: Rodal
    {
        group: "Rodal",
        fields: [
            { path: "rodal.fechaPlantacion", label: "Fecha plantación" },
            { path: "rodal.planManejo", label: "Plan manejo" },
            { path: "rodal.nroaviso", label: "N° aviso" },
        ],
    },

    // ✅ NUEVO: Empresa contratista
    {
        group: "Empresa contratista",
        fields: [
            { path: "empresaContratista.rutContratista", label: "RUT contratista" },
            { path: "empresaContratista.nombreContratista", label: "Nombre contratista" },
        ],
    },

    // ✅ NUEVO: Orden de compra
    {
        group: "Orden de compra",
        fields: [
            { path: "ordenCompra.codProveedor", label: "Cod. proveedor" },
            { path: "ordenCompra.rutProveedor", label: "RUT proveedor" },
            { path: "ordenCompra.nomProveedor", label: "Nombre proveedor" },
            { path: "ordenCompra.rolPredio", label: "ROL predio" },
            { path: "ordenCompra.rolComuna", label: "ROL comuna" },
            { path: "ordenCompra.predio", label: "Predio" },
            { path: "ordenCompra.nombreProducto", label: "Producto (código)" },
            { path: "ordenCompra.diametroMin", label: "Diámetro min", type: "number", fmt: (v) => (v == null ? "—" : String(v)) },
            { path: "ordenCompra.diametroMax", label: "Diámetro max", type: "number", fmt: (v) => (v == null ? "—" : String(v)) },
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
            // ✅ NUEVO: Volumen según UM
            {
                path: "totales.volumen",
                label: "Volumen",
                fmt: (v, doc) => (v == null ? "—" : `${v} ${doc?.producto?.unidadMedida || ""}`.trim()),
            },
            { path: "totales.neto", label: "Neto", type: "number", fmt: (v) => (v == null ? "—" : String(v)) },
            { path: "totales.ivaPct", label: "% IVA", type: "number", fmt: (v) => (v == null ? "—" : String(v)) },
            { path: "totales.ivaMonto", label: "IVA", type: "number", fmt: (v) => (v == null ? "—" : String(v)) },
            { path: "totales.total", label: "Total", type: "number", fmt: (v) => (v == null ? "—" : String(v)) },
        ],
    },

];
