// src/utils/gdePdfTemplate.js
import pdfMake from "pdfmake/build/pdfmake";
import "pdfmake/build/vfs_fonts";
import config from "@/Common/json/config.json";
// =============== Helpers ===============
const brand = { gray: "#4b4b4b", border: "#000" };

const PAGE_X = 6;            // 👈 márgenes laterales mínimos (~2 mm)
const HEADER_H = 128;        // altura reservada para el header
const PAGE_TOP = HEADER_H;   // contenido inicia bajo el header
const FIRST_BLOCK_TOP_GAP = 14;
const PAGE_BOTTOM = 60;
const PAGE_W = 595;          // ancho A4 en pt
const BOX_CONTENT_MIN = 70;


const getIvaPct = (doc) => {
    const n = Number(doc?.ivaPct);
    return Number.isFinite(n) && n > 0 ? n : config.parametros.ivaPorDefecto;
};


function fDate(x) {
    if (!x) return "—";
    const d = new Date(x);
    return isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fTime(x) {
    if (!x) return "—";
    const d = new Date(x);
    return isNaN(d.getTime())
        ? x
        : d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
function fStr(x) { return x == null ? "—" : String(x); }
function fCLP(n) {
    if (n == null) return "—";
    return Number(n).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}
const U = (s) => (s == null ? "—" : String(s).toUpperCase());

// línea clave/valor en una sola línea
function kvLine(label, value) {
    return { text: [{ text: `${U(label)}: `, bold: true }, { text: U(value) }], margin: [0, 0, 0, 2] };
}

// layouts
const boxedLayout = {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0.5),
    hLineColor: () => brand.border,
    vLineColor: () => brand.border,
    paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 6, paddingBottom: () => 6,
};
const boxedOuterOnly = {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0),
    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0),
    hLineColor: () => brand.border,
    vLineColor: () => brand.border,
    paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 6, paddingBottom: () => 6,
};
// 👇 solo borde exterior SIN el superior (para el primer bloque bajo el header)
const boxedOuterOnlyNoTop = {
    hLineWidth: (i, node) => (i === node.table.body.length ? 1 : 0), // solo línea inferior
    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0),
    hLineColor: () => brand.border,
    vLineColor: () => brand.border,
    paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 6, paddingBottom: () => 6,
};

const boxedLayoutTight = {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0.5),
    hLineColor: () => brand.border,
    vLineColor: () => brand.border,
    paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4,
};
// solo horizontales internas; SIN líneas verticales ni marco exterior
const gridNoOuterLayout = {
    hLineWidth: () => 0,          // sin horizontales
    vLineWidth: () => 0,          // sin verticales
    hLineColor: () => brand.border,
    vLineColor: () => brand.border,
    paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4,
};

const toNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// =============== Header ===============
function headerBoxRight(doc) {
    const rut = (doc?.empresa?.rut != null ? String(doc.empresa.rut) : "—") + (doc?.empresa?.dv ? "-" + doc.empresa.dv : "");
    const folio = doc?.folio != null ? String(doc.folio) : "—";
    const ciudad = U(doc?.empresa?.ciudad);

    return {
        stack: [
            {
                table: {
                    widths: ["*"],
                    body: [[{
                        stack: [
                            { text: rut, alignment: "center", fontSize: 12, bold: true, margin: [0, 6, 0, 6] },
                            { text: "GUÍA DE DESPACHO\nELECTRÓNICA", alignment: "center", fontSize: 13, bold: true, margin: [0, 2, 0, 6] },
                            { text: "N° " + folio, alignment: "center", fontSize: 12, bold: true, margin: [0, 2, 0, 6] },
                        ]
                    }]]
                },
                layout: {
                    hLineWidth: () => 1.4, vLineWidth: () => 1.4,
                    hLineColor: () => brand.border, vLineColor: () => brand.border,
                    paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 6, paddingBottom: () => 6,
                },
                margin: [0, 0, 0, 6],
            },
            { text: `S.I.I. - ${ciudad}`, alignment: "center", fontSize: 10, margin: [0, 2, 0, 0] },
        ]
    };
}

function buildHeaderHero(doc) {
    const left = {
        width: "*",
        stack: [
            { text: U(doc?.empresa?.razonSocial || ""), fontSize: 12, bold: true, alignment: "center", margin: [0, 0, 0, 4] },
            {
                text: U(doc?.empresa?.giro || doc?.empresa?.actividadSII || doc?.empresa?.actividadEconomica || ""),
                fontSize: 9, color: brand.gray, alignment: "center", lineHeight: 1.0, margin: [0, 0, 0, 6],
            },
            { text: U(doc?.empresa?.direccion), fontSize: 9, color: brand.gray, alignment: "center" },
            { text: U(doc?.empresa?.telefono ? `${doc.empresa.telefono} - FAX` : "FAX"), fontSize: 9, color: brand.gray, alignment: "center" },
            { text: U(doc?.empresa?.ciudad), fontSize: 9, color: brand.gray, alignment: "center" },
        ],
    };
    const right = { width: 260, stack: [headerBoxRight(doc)] };

    const band = { margin: [PAGE_X, 6, PAGE_X, 4], columns: [left, right], columnGap: 24 };
    const bottomLine = {
        canvas: [{ type: "line", x1: PAGE_X, x2: PAGE_W - PAGE_X, y1: 0, y2: 0, lineWidth: 1, lineColor: brand.border }],
        margin: [0, 6, 0, 0],   // antes [0, 3, 0, 0]
    };
    return { stack: [band, bottomLine] };
}

// =============== Box 1: Cliente vs Fechas/Traslado ===============
function buildBoxClienteFechas(doc) {
    const left = {
        stack: [
            kvLine("Nombre", doc?.cliente?.razonSocialCliente),
            kvLine("R.U.T", doc?.cliente?.rutCliente),
            kvLine("Giro", doc?.cliente?.giroCliente),
            kvLine("Dirección", doc?.destino?.direccionDestinoCliente || doc?.cliente?.direccionCliente),
            kvLine("Origen", `${U(doc?.predio?.predio)}${doc?.predio?.rolPredio ? `, ROL: ${U(doc.predio.rolPredio)}` : ""}${doc?.predio?.rolComuna ? `, COMUNA: ${U(doc.predio.rolComuna)}` : ""}`),
            kvLine("Destino", `${U(doc?.destino?.destinoCliente)}`),
        ],
    };
    const right = {
        stack: [
            kvLine("Fecha Emisión", fDate(doc?.createdAt)),
            kvLine("Fecha Vencimiento", "—"),
            kvLine("Forma Pago", "—"),
            kvLine("Ind. Traslado", doc?.indicadorTraslado?.texto),
            kvLine("Comuna", doc?.cliente?.comunaCliente || doc?.empresa?.comuna),
            kvLine("Ciudad", doc?.cliente?.ciudadCliente || doc?.empresa?.ciudad),
        ],
    };

    return {
        margin: [PAGE_X, FIRST_BLOCK_TOP_GAP, PAGE_X, 6], // antes [PAGE_X, 2, PAGE_X, 6]
        table: { widths: ["*", "*"], body: [[left, right]] },
        layout: boxedOuterOnly,
    };
}

// =============== Box 2: Operación ===============
function buildBoxOperacion(doc) {
    const left = {
        stack: [
            kvLine("Hora Llegada", doc?.comentarios?.horaLlegada ? `${fDate(doc.comentarios.horaLlegada)} ${fTime(doc.comentarios.horaLlegada)}` : "—"),
            kvLine("Contratista", doc?.empresaContratista?.nombreContratista),
            kvLine("Cargador", "—"),
            kvLine("Descargador", "—"),
            kvLine("Proveedor", doc?.proveedor?.nomProveedor),
            kvLine("Guía Proveedor", doc?.comentarios?.guiaProveedor),
            kvLine("Año Plantación", doc?.rodal?.fechaPlantacion ? fDate(doc.rodal.fechaPlantacion) : (doc?.comentarios?.anioCosecha ?? "—")),
            kvLine("Plan Manejo", doc?.comentarios?.planManejo ?? doc?.rodal?.planManejo),
            kvLine("Nro Aviso Corta", doc?.rodal?.nroaviso),
            kvLine("Punto Rescate X", doc?.comentarios?.puntoX),
        ],
    };
    const right = {
        stack: [
            kvLine("Hora Salida", doc?.comentarios?.horaSalida ? `${fDate(doc.comentarios.horaSalida)} ${fTime(doc.comentarios.horaSalida)}` : "—"),
            kvLine("OC", "—"),
            kvLine("Contrato Cliente", "—"),
            kvLine("Vol. Proveedor", doc?.comentarios?.volumenProveedor ?? 0),
            kvLine("Año Cosecha", doc?.comentarios?.anioCosecha ?? "—"),
            kvLine("Punto Rescate Y", doc?.comentarios?.puntoY),
        ],
    };

    return {
        margin: [PAGE_X, 3, PAGE_X, 6],
        table: { widths: ["*", "*"], body: [[left, right]] },
        layout: boxedOuterOnly,
    };
}

const isDraft = (d) =>
    (d?.estado?.id && String(d.estado.id).toUpperCase() === "B") ||
    (d?.estado?.texto && /BORRADOR/i.test(d.estado.texto));


function getUM(doc) {
    const um = (doc?.producto?.unidadMedida || "").toString().trim().toUpperCase();
    return um;
}

const boxedLayoutDetail = {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1 : 0.5),
    hLineColor: () => "#000",
    vLineColor: () => "#000",
    paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4,
};

// =============== Detalle (M3) ===============
function buildDetalleM3(doc) {
    const header = [
        { text: "DETALLE", bold: true, alignment: "left" },
        { text: "TROZOS", bold: true, alignment: "center" },
        { text: "CANTIDAD", bold: true, alignment: "center" },
        { text: "UND.", bold: true, alignment: "center" },
        { text: "P.UNITARIO", bold: true, alignment: "center" },
        { text: "P.TOTAL", bold: true, alignment: "center" },
    ];
    const body = [header, [
        { text: " ", noWrap: true },
        { text: " ", alignment: "center" },
        { text: " ", alignment: "center" },
        { text: " ", alignment: "center" },
        { text: " ", alignment: "center" },
        { text: " ", alignment: "center" },
    ]];

    return {
        margin: [PAGE_X, 10, PAGE_X, 4],
        table: { headerRows: 1, widths: ["*", 60, 70, 50, 70, 80], body },
        layout: boxedLayoutDetail,
    };
}

// =============== Detalle (MR) — 1 sola fila ===============
function buildDetalleMR(doc) {
    const header = [
        { text: "DETALLE", bold: true, alignment: "left" },
        { text: "CANTIDAD", bold: true, alignment: "center" },
        { text: "UND.", bold: true, alignment: "center" },
        { text: "P.UNITARIO", bold: true, alignment: "center" },
        { text: "P.TOTAL", bold: true, alignment: "center" },
    ];

    const descCell = { text: truncate(doc?.producto?.nombreProducto, 80), noWrap: true };

    const cantidad = (doc?.totales?.mr?.volumen ?? doc?.totales?.totalMr ?? doc?.totales?.volMr ?? null);
    const punit = doc?.precioProducto?.precio ?? null;
    const ptotal = (cantidad != null && punit != null) ? Math.round(Number(cantidad) * Number(punit)) : null;

    const body = [header, [
        descCell,
        {
            text: cantidad != null
                ? Number(cantidad).toLocaleString("es-CL", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                : "—",
            alignment: "center"
        },
        { text: "MR", alignment: "center" },
        {
            text: punit != null
                ? Number(punit).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                : "—",
            alignment: "center"
        },
        {
            text: ptotal != null
                ? Number(ptotal).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                : "—",
            alignment: "center"
        },
    ]];

    return {
        margin: [PAGE_X, 10, PAGE_X, 4],
        table: { headerRows: 1, widths: ["*", 80, 50, 70, 80], body },
        layout: boxedLayoutDetail,
    };
}

function buildDetallePorUM(doc) {
    return getUM(doc) === "MR" ? buildDetalleMR(doc) : buildDetalleM3(doc);
}

// =============== Comentario ===============
function buildComentarioFull(doc) {
    return {
        margin: [PAGE_X, 4, PAGE_X, 4],
        table: {
            widths: ["*"],
            body: [
                [{ text: "COMENTARIO:", bold: true }],
                [{ text: fStr(doc?.comentarios?.comentarios), margin: [0, 8, 0, 20] }],
            ],
        },
        layout: boxedLayoutTight,
    };
}

function extractTotals(doc) {
    // 1) Si ya vienen todos, usarlos tal cual
    const netoIn = doc?.totales?.neto;
    const ivaPctIn = doc?.totales?.ivaPct ?? doc?.ivaPct;
    const ivaIn = doc?.totales?.ivaMonto;
    const totalIn = doc?.totales?.total;

    const hasAll =
        Number.isFinite(Number(netoIn)) &&
        Number.isFinite(Number(ivaPctIn)) &&
        Number.isFinite(Number(ivaIn)) &&
        Number.isFinite(Number(totalIn));

    if (hasAll) {
        return {
            neto: Number(netoIn),
            ivaPct: Number(ivaPctIn),
            ivaMonto: Number(ivaIn),
            total: Number(totalIn),
        };
    }

    // 2) Fallback: calcular con lo disponible
    const netoCalc =
        toNum(doc?.totales?.neto,
            // si no hay neto, suma valores por UM como respaldo
            toNum(doc?.totales?.m3?.valor) +
            toNum(doc?.totales?.mr?.valor) +
            toNum(doc?.totales?.ton?.valor)
        );

    const ivaPct = getIvaPct(doc);
    const ivaMonto = Math.round(netoCalc * (ivaPct / 100));
    const total = Math.round(netoCalc + ivaMonto);

    return { neto: netoCalc, ivaPct, ivaMonto, total };
}

// =============== Transporte + Totales ===============
function buildTransporteYTotales(doc) {


    const { neto, ivaPct, ivaMonto, total } = extractTotals(doc);

    const transporteBox = {
        width: "*",
        table: {
            widths: ["*"],
            body: [
                [{ text: "DATOS TRANSPORTE", bold: true }],
                [{
                    margin: [0, 8, 0, 8],
                    minHeight: BOX_CONTENT_MIN,
                    stack: [
                        { text: [{ text: "Transportista: ", bold: true }, fStr(doc?.transportista?.nomTransportista)] },
                        { text: [{ text: "Patente: ", bold: true }, fStr(doc?.patenteCamion?.patCamion), { text: ".  Carro: ", bold: true }, fStr(doc?.patenteCarro)] },
                        { text: [{ text: "Nombre Chofer: ", bold: true }, fStr(doc?.conductor?.nomChofer), { text: ".  RUT Chofer: ", bold: true }, fStr(doc?.conductor?.rutChofer)] },
                    ]
                }]
            ]
        },
        layout: boxedLayout,
    };

    const totalesBox = {
        width: 220,
        table: {
            widths: ["*"],
            body: [[
                {
                    margin: [0, 8, 0, 5],
                    minHeight: BOX_CONTENT_MIN,
                    table: {
                        widths: ["*", 110],
                        body: [
                            [{ text: "NETO:", alignment: "right", bold: true }, { text: fCLP(neto), alignment: "right" }],
                            [{ text: `I.V.A (${ivaPct}%):`, alignment: "right", bold: true }, { text: fCLP(ivaMonto), alignment: "right" }],
                            [{ text: "TOTAL:", alignment: "right", bold: true, fontSize: 11 }, { text: fCLP(total), alignment: "right", bold: true, fontSize: 11 }],
                        ]
                    },
                    layout: gridNoOuterLayout,
                }
            ]]
        },
        layout: boxedOuterOnly,
    };

    return {
        margin: [PAGE_X, 6, PAGE_X, 14],
        columns: [transporteBox, { width: 12, text: "" }, totalesBox], // gap más angosto
        columnGap: 0,
    };
}

// =============== Footer ===============
function buildFooter(current, totalPages) {
    return {
        margin: [PAGE_X, 6, PAGE_X, 12],
        columns: [
            { text: "Documento de previsualización (sin timbre/folio)", fontSize: 8, color: brand.gray },
            { text: `Página ${current} de ${totalPages}`, fontSize: 8, color: brand.gray, alignment: "right" },
        ],
    };
}

function truncate(s, max = 80) {
    s = fStr(s);
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// =============== Doc Definition público ===============
export function buildDefinition(doc) {
    const box1 = buildBoxClienteFechas(doc);
    const box2 = buildBoxOperacion(doc);
    const detalle = buildDetallePorUM(doc);
    const comentarioFull = buildComentarioFull(doc);
    const transporteYTotales = buildTransporteYTotales(doc);

    return {
        pageSize: "A4",
        pageMargins: [PAGE_X, PAGE_TOP, PAGE_X, PAGE_BOTTOM],
        watermark: isDraft(doc) ? {
            text: "BORRADOR",
            color: "#000000",
            opacity: 0.10,   // más chico = más tenue
            bold: true,
            italics: false,
            fontSize: 140    // ajusta a gusto
        } : undefined,

        header: () => buildHeaderHero(doc),
        content: [box1, box2, detalle, comentarioFull, transporteYTotales],
        defaultStyle: { fontSize: 10 },
    };
}

// =============== Generador ===============
export function generateGdePdf(doc, filename = `GDE-${doc?.folio || "borrador"}.pdf`) {
    const def = buildDefinition(doc);
    pdfMake.createPdf(def).download(filename);
}
