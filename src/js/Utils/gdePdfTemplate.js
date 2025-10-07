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
const BOX_CONTENT_MIN = 71;
const RIGHT_BOX_W = 220;
const CANCHAS_INDENT = 24;
const TAMANO_LETRA_ELEMENTOS = 9;
const TAMANO_LETRA_SUCURSALES = 8;
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
    paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 3,
};

const toNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// =============== Header ===============
function headerBoxRight(doc) {
    const rut = (doc?.empresa?.rut != null ? String(doc.empresa.rut) : "—") + (doc?.empresa?.dv ? "-" + doc.empresa.dv : "");
    const folio = doc?.folio != null ? String(doc.folio) : "—";
    const ciudad = U(doc?.empresa?.ciudad);
    const fechaEmision = fDate(doc?.fechaEmision) || "—";

    return {
        stack: [
            {
                table: {
                    widths: ["*"],
                    body: [[{
                        stack: [
                            { text: `R.U.T.: ${rut}`, alignment: "center", fontSize: 12, bold: true, color: "#b71c1c", margin: [0, 3, 0, 3] },
                            { text: "GUÍA DE DESPACHO\nELECTRÓNICA", alignment: "center", fontSize: 13, bold: true, color: "#b71c1c", margin: [0, 3, 0, 3] },
                            { text: `N°: ${folio}`, alignment: "center", fontSize: 12, bold: true, color: "#b71c1c", margin: [0, 3, 0, 3] },
                        ]
                    }]]
                },
                layout: {
                    hLineWidth: () => 1.5,
                    vLineWidth: () => 1.5,
                    hLineColor: () => "#b71c1c",
                    vLineColor: () => "#b71c1c",
                    paddingLeft: () => 10,
                    paddingRight: () => 10,
                    paddingTop: () => 6,
                    paddingBottom: () => 6,
                },
                margin: [0, 0, 0, 4],
            },
            // Texto bajo el cuadro
            {
                text: `S.I.I. - ${ciudad}`,
                alignment: "center",
                fontSize: 10,
                bold: true,
                color: "#b71c1c",
                margin: [0, 2, 0, 2],
            },
            // 👇 Nueva línea de fecha en negro
            {
                text: [
                    { text: "FECHA: ", bold: true },
                    { text: fechaEmision || "—" }
                ],
                alignment: "center",
                fontSize: TAMANO_LETRA_SUCURSALES,
                color: "#000000",
                margin: [0, 70, 0, 0], // 👈 mantienes la distancia que te funcionó bien
            },

        ]
    };
}





function buildHeaderLeft(doc) {
    const emp = doc?.empresa || {};
    const sucursales = Array.isArray(emp.sucursales) ? emp.sucursales : [];
    const s0 = sucursales[0] || null;          // primera sucursal (la de “Sucursal:”)
    const canchas = sucursales.slice(1);       // resto

    const leftStack = [
        // Título y giro/actividad
        { text: U(emp.razonSocial || ''), fontSize: 12, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
        {
            text: U(emp.giro || emp.actividadSII || emp.actividadEconomica || ''),
            fontSize: 9, color: brand.gray, alignment: 'center', lineHeight: 1.0, margin: [0, 0, 0, 6],
        },
    ];

    // 🔴 IMPORTANTE: ESTE BLOQUE REEMPLAZA a los push antiguos de “Casa Matriz / Sucursal”
    leftStack.push({
        table: {
            widths: ['*'], // fuerza que el contenido tome todo el ancho del panel izquierdo
            body: [[{
                stack: [
                    { text: 'Casa Matriz:', fontSize: TAMANO_LETRA_SUCURSALES, alignment: 'center', bold: true, margin: [0, 0, 0, 2] },
                    {
                        text: fmtLineaDireccion(emp.direccion, emp.comuna, emp.ciudad),
                        fontSize: TAMANO_LETRA_SUCURSALES, color: brand.gray, alignment: 'center', noWrap: false
                    },
                    {
                        text: U(fmtTelefono(emp.telefono)),
                        fontSize: TAMANO_LETRA_SUCURSALES, color: brand.gray, alignment: 'center', margin: [0, 0, 0, 6], noWrap: false
                    },

                    // Sucursal principal (solo si existe s0)
                    ...(s0 ? [
                        { text: 'Sucursal:', fontSize: TAMANO_LETRA_SUCURSALES, alignment: 'center', bold: true, margin: [0, 0, 0, 2] },
                        {
                            text: fmtLineaDireccion(s0.direccion, s0.comuna, s0.region),
                            fontSize: TAMANO_LETRA_SUCURSALES, color: brand.gray, alignment: 'center', noWrap: false
                        },
                        {
                            text: U(fmtTelefono(s0.telefono)),
                            fontSize: TAMANO_LETRA_SUCURSALES, color: brand.gray, alignment: 'center', margin: [0, 0, 0, 2], noWrap: false
                        },
                    ] : []),
                ],
            }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 4],
    });

    // CANCHAS DE ACOPIO en 2 columnas
    if (canchas.length > 0) {
        leftStack.push({ text: 'CANCHAS DE ACOPIO', fontSize: TAMANO_LETRA_SUCURSALES, alignment: 'center', bold: true, margin: [0, 0, 0, 6] });

        const filas = chunk(canchas, 2);
        filas.forEach(par => {
            leftStack.push({
                margin: [CANCHAS_INDENT, 0, 0, 0],   // bloque desplazado a la derecha
                table: {
                    widths: ['*', '*'],               // 👈 ocupa todo el ancho disponible
                    body: [[
                        canchaBlock(par[0]),
                        canchaBlock(par[1]),
                    ]]
                },
                layout: 'noBorders'
            });
        });
    }




    return { width: '*', stack: leftStack };
}


// ========= Reemplazo de buildHeaderHero =========
function buildHeaderHero(doc) {
    const left = buildHeaderLeft(doc);             // ocupa el ancho restante
    const right = { width: RIGHT_BOX_W, stack: [headerBoxRight(doc)] };

    const band = {
        margin: [PAGE_X, 6, PAGE_X, 4],
        columns: [left, right],
        columnGap: 16, // más estrecho para ganar espacio al texto
    };

    const bottomLine = {
        canvas: [{ type: "line", x1: PAGE_X, x2: PAGE_W - PAGE_X, y1: 0, y2: 0, lineWidth: 1, lineColor: brand.border }],
        margin: [0, 6, 0, 0],
    };

    return { stack: [band] };
}

// =============== Box 1: Cliente vs Fechas/Traslado ===============
function buildBoxClienteFechas(doc) {
    const left = {
        fontSize: TAMANO_LETRA_ELEMENTOS,
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
        fontSize: TAMANO_LETRA_ELEMENTOS,
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
        fontSize: TAMANO_LETRA_ELEMENTOS,
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
        fontSize: TAMANO_LETRA_ELEMENTOS,
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
        { text: "DETALLE", bold: true, alignment: "left", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "TROZOS", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "CANTIDAD", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "UND.", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "P.UNITARIO", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "P.TOTAL", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
    ];

    const producto = doc?.producto ?? {};
    const categoria = producto.categoria ? `(${producto.categoria})` : "";
    const sagInfo = producto.sag ? `SAG: ${producto.sag}` : "";

    // detalleM3 → solo los que tienen trozos > 0
    const filas = (doc?.detalleM3 ?? []).filter(f => Number(f.trozos) > 0);

    // construir líneas con sangría, que pueden fluir naturalmente a la siguiente página
    const lineasDetalle = filas.map(f => `• ${f.diametro}: ${f.trozos}`).join("\n");

    const descCell = {
        text: [
            { text: truncate(producto.nombreProducto ?? "", 80), bold: true },
            categoria ? { text: `\n${categoria}`, italics: true } : {},
            sagInfo ? { text: `\n${sagInfo}` } : {},
            lineasDetalle
                ? { text: `\n${lineasDetalle}`, fontSize: TAMANO_LETRA_ELEMENTOS - 1, margin: [10, 2, 0, 0] }
                : {},
        ],
        noWrap: false,
        fontSize: TAMANO_LETRA_ELEMENTOS,
    };

    const cantidad = doc?.totales?.m3?.volumen ?? doc?.totales?.totalM3 ?? null;
    const punit = doc?.precioProducto?.precio ?? null;
    const ptotal =
        cantidad != null && punit != null
            ? Math.round(Number(cantidad) * Number(punit))
            : null;

    const totalTrozos = filas.reduce((sum, f) => sum + Number(f.trozos || 0), 0);

    const body = [
        header,
        [
            descCell,
            { text: totalTrozos.toString(), alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
            {
                text:
                    cantidad != null
                        ? Number(cantidad).toLocaleString("es-CL", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                        : "—",
                alignment: "center",
                fontSize: TAMANO_LETRA_ELEMENTOS,
            },
            { text: getUM(doc), alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
            {
                text:
                    punit != null
                        ? `$${Number(punit).toLocaleString("es-CL", { minimumFractionDigits: 0 })}`
                        : "—",
                alignment: "center",
                fontSize: TAMANO_LETRA_ELEMENTOS,
            },
            {
                text:
                    ptotal != null
                        ? Number(ptotal).toLocaleString("es-CL", { minimumFractionDigits: 0 })
                        : "—",
                alignment: "center",
                fontSize: TAMANO_LETRA_ELEMENTOS,
            },
        ],
    ];

    return {
        margin: [PAGE_X, 10, PAGE_X, 4],
        table: {
            headerRows: 1,             // mantiene encabezado
            dontBreakRows: false,      // permite que se partan filas largas
            widths: ["*", 60, 70, 50, 70, 80],
            body,
        },
        layout: boxedLayoutDetail,   // mantiene el borde completo
    };
}



// Helper: obtiene volumen según UM
function getVolumenByUM(doc, um) {
    const t = doc?.totales || {};
    switch (um) {
        case config.parametros.unidadesMedida.MR:
            return t?.mr?.volumen ?? t?.totalMr ?? t?.volMr ?? null;
        case config.parametros.unidadesMedida.TON:
        case config.parametros.unidadesMedida.BDMT:
        case config.parametros.unidadesMedida.M3ST:
            // ✅ Todas usan la misma fuente (totales.ton)
            return t?.ton?.volumen ?? t?.totalTon ?? t?.volTon ?? null;
        default:
            // fallback clásico (M3 normal)
            return t?.m3?.volumen ?? t?.totalM3 ?? t?.volM3 ?? null;
    }
}




// =============== Detalle (MR) — 1 sola fila ===============
// Ajuste en buildDetalleMR: cantidad según UM
function buildDetalleMR(doc) {
    const header = [
        { text: "DETALLE", bold: true, alignment: "left", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "CANTIDAD", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "UND.", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "P.UNITARIO", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
        { text: "P.TOTAL", bold: true, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
    ];

    const producto = doc?.producto ?? {};
    const categoria = producto.categoria ? `(${producto.categoria})` : "";
    const sagInfo = producto.sag ? `SAG: ${producto.sag}` : "";

    const um = getUM(doc);
    const descCell = {
        text: [
            { text: truncate(producto.nombreProducto ?? "", 80), bold: true },
            categoria ? { text: `\n${categoria}`, italics: true } : {},
            sagInfo ? { text: `\n${sagInfo}` } : {},
        ],
        noWrap: false,
        fontSize: TAMANO_LETRA_ELEMENTOS,
    };

    const cantidad = getVolumenByUM(doc, um);
    const punit = doc?.precioProducto?.precio ?? null;
    const ptotal = (cantidad != null && punit != null) ? Math.round(Number(cantidad) * Number(punit)) : null;

    const body = [
        header,
        [
            descCell,
            {
                text: cantidad != null
                    ? Number(cantidad).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "—",
                alignment: "center",
                fontSize: TAMANO_LETRA_ELEMENTOS,
            },
            { text: um, alignment: "center", fontSize: TAMANO_LETRA_ELEMENTOS },
            {
                text: punit != null
                    ? `$${Number(punit).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : "—",
                alignment: "center",
                fontSize: TAMANO_LETRA_ELEMENTOS,
            },
            {
                text: ptotal != null
                    ? `$${Number(ptotal).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : "—",
                alignment: "center",
                fontSize: TAMANO_LETRA_ELEMENTOS,
            },
        ]
    ];

    return {
        margin: [PAGE_X, 10, PAGE_X, 4],
        table: { headerRows: 1, widths: ["*", 80, 50, 70, 80], body },
        layout: boxedLayoutDetail,
    };
}


// Usa MR-table para MR/TON/BDMT/M3ST, de lo contrario M3-table
function buildDetallePorUM(doc) {
    const um = getUM(doc);
    const umMRLike = [
        config.parametros.unidadesMedida.MR,
        config.parametros.unidadesMedida.TON,
        config.parametros.unidadesMedida.BDMT,
        config.parametros.unidadesMedida.M3ST,
    ];
    return umMRLike.includes(um) ? buildDetalleMR(doc) : buildDetalleM3(doc);
}


// =============== Comentario ===============
function buildComentarioFull(doc) {
    return {
        unbreakable: true,
        margin: [PAGE_X, 3, PAGE_X, 3],
        table: {
            dontBreakRows: true,
            widths: ["*"],
            body: [
                [{ text: "COMENTARIO:", bold: true, fontSize: TAMANO_LETRA_ELEMENTOS, }],
                [{ text: fStr(doc?.comentarios?.comentarios), margin: [0, 8, 0, 10], fontSize: TAMANO_LETRA_ELEMENTOS, }],
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
            dontBreakRows: true,
            widths: ["*"],
            body: [
                [{ text: "DATOS TRANSPORTE", bold: true, fontSize: TAMANO_LETRA_ELEMENTOS }],
                [{
                    margin: [0, 0, 0, 0],
                    minHeight: BOX_CONTENT_MIN,
                    // 👇 fontSize por defecto para este bloque
                    fontSize: TAMANO_LETRA_ELEMENTOS,
                    stack: [
                        { text: [{ text: "Transportista: ", bold: true }, fStr(doc?.transportista?.nomTransportista)] },
                        {
                            text: [
                                { text: "Patente: ", bold: true }, fStr(doc?.patenteCamion?.patCamion),
                                { text: ".  Carro: ", bold: true }, fStr(doc?.patenteCarro)
                            ]
                        },
                        {
                            text: [
                                { text: "Nombre Chofer: ", bold: true }, fStr(doc?.conductor?.nomChofer),
                                { text: ".  RUT Chofer: ", bold: true }, fStr(doc?.conductor?.rutChofer)
                            ]
                        },
                    ]
                }]
            ]
        },
        layout: boxedLayout,
    };

    const totalesBox = {
        width: 220,
        table: {
            dontBreakRows: true,
            widths: ["*"],
            body: [[{
                fontSize: TAMANO_LETRA_ELEMENTOS,
                margin: [0, 0, 0, 0],
                minHeight: BOX_CONTENT_MIN,
                table: {
                    dontBreakRows: true,
                    widths: ["*", 110],
                    body: [
                        [
                            { text: "NETO:", alignment: "right", bold: true, fontSize: TAMANO_LETRA_ELEMENTOS },
                            { text: fCLP(neto), alignment: "right", fontSize: TAMANO_LETRA_ELEMENTOS }
                        ],
                        [
                            { text: `I.V.A (${ivaPct}%):`, alignment: "right", bold: true, fontSize: TAMANO_LETRA_ELEMENTOS },
                            { text: fCLP(ivaMonto), alignment: "right", fontSize: TAMANO_LETRA_ELEMENTOS }
                        ],
                        [
                            { text: "TOTAL:", alignment: "right", bold: true, fontSize: TAMANO_LETRA_ELEMENTOS + 1 },
                            { text: fCLP(total), alignment: "right", bold: true, fontSize: TAMANO_LETRA_ELEMENTOS + 1 }
                        ],
                    ]
                },
                layout: gridNoOuterLayout,
            }]]
        },
        layout: boxedOuterOnly,
    };

    return {
        unbreakable: true,
        margin: [PAGE_X, 6, PAGE_X, 14],
        columns: [transporteBox, { width: 12, text: "" }, totalesBox],
        columnGap: 0,
    };
}


// =============== Footer ===============
function buildFooter(current, totalPages) {
    return {
        margin: [PAGE_X, 6, PAGE_X, 12],
        columns: [
            { text: "Documento de previsualización (sin timbre/folio)", fontSize: TAMANO_LETRA_SUCURSALES, color: brand.gray },
            { text: `Página ${current} de ${totalPages}`, fontSize: TAMANO_LETRA_SUCURSALES, color: brand.gray, alignment: "right" },
        ],
    };
}

function truncate(s, max = 80) {
    s = fStr(s);
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function fmtTelefono(t) {
    return t ? `Fono: ${U(t)}` : "";
}
function fmtLineaDireccion(d, comuna, regionOCiudad) {
    const a = U(d).trim();
    const b = [U(comuna), U(regionOCiudad)].filter(Boolean).join(" - "); // MISMA LÍNEA
    return [a, b].filter(Boolean).join("  "); // separa con espacios, no con \n
}



// 👉 reemplaza toda esta función
function estimateHeaderHeight(doc) {
    const emp = doc?.empresa || {};
    const sucursales = Array.isArray(emp.sucursales) ? emp.sucursales : [];
    const hasSucursal0 = sucursales.length > 0;
    const canchasCount = Math.max(0, sucursales.length - 1);
    const filasCanchas = Math.ceil(canchasCount / 2);

    // líneas base (tamaños actuales: título 8, giro 9, resto 8/6)
    let h = 88;                // título + giro + pequeños márgenes
    h += 40;                   // "Casa Matriz" (título + dirección + fono)
    if (hasSucursal0) h += 38; // "Sucursal" (título + dirección + fono)

    if (canchasCount > 0) {
        h += 14;                 // "CANCHAS DE ACOPIO"
        h += filasCanchas * 40;  // ~40 pt por FILA de 2 canchas (nombre+2 líneas)
    }

    h += 14; // padding inferior del header

    // mínimos y máximos más generosos
    const min = 140;
    const max = 240; // si sigues corto, sube a 260
    return Math.max(min, Math.min(Math.ceil(h), max));
}





// === helpers para canchas en 2 columnas ===
function chunk(arr, size = 2) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}
function canchaBlock(s) {
    if (!s) return { text: "" };

    // Normaliza y recorta dirección si es muy larga
    const direccion = U(s.direccion || "").trim();
    const dirCorta = direccion.length > 60 ? direccion.slice(0, 57) + "…" : direccion;

    // Comuna y región combinadas
    const linea2 = [U(s.comuna), U(s.region)].filter(Boolean).join(" - ");

    return {
        width: "*",
        stack: [
            // Nombre cancha en negrita
            { text: U(s.nombre || ""), bold: true, fontSize: 7, margin: [0, 0, 0, 1] },
            // Dirección (línea 1)
            { text: dirCorta, fontSize: 7, color: brand.gray, margin: [0, 0, 0, 0], noWrap: false },
            // Comuna y región (línea 2)
            { text: linea2, fontSize: 7, color: brand.gray, margin: [0, 0, 0, 0], noWrap: false },
        ],
        margin: [0, 0, 0, 4],
    };
}


// =============== Doc Definition público ===============
export function buildDefinition(doc) {
    const topMargin = Math.max(80, estimateHeaderHeight(doc) - 24);

    const pageMarginsAll = [PAGE_X, 16, PAGE_X, PAGE_BOTTOM];

    const box1 = buildBoxClienteFechas(doc);
    const box2 = buildBoxOperacion(doc);
    const detalle = buildDetallePorUM(doc);
    const comentarioFull = buildComentarioFull(doc);
    const transporteYTotales = buildTransporteYTotales(doc);

    // 1) Header como contenido absoluto en y=16 (no recortado por el margen)
    const headerHeroAbs = {
        absolutePosition: { x: PAGE_X, y: 16 },
        // ancho sugerido igual al contenido normal
        width: PAGE_W - (PAGE_X * 2),
        // usa el mismo contenido que buildHeaderHero(doc) devolvía antes
        ...buildHeaderHero(doc),
    };

    // 2) Spacer sólo en la primera página para despegar el contenido real
    const firstPageSpacer = { text: "", margin: [0, (topMargin - 16), 0, 0] };

    return {
        pageSize: "A4",
        pageMargins: pageMarginsAll,
        watermark: isDraft(doc) ? {
            text: "BORRADOR",
            color: "#000000",
            opacity: 0.10,
            bold: true,
            italics: false,
            fontSize: 140
        } : undefined,

        // 👇 sin header repetido
        // header: null,

        // Background sólo si quieres dibujar algo repetido detrás; aquí no lo usamos
        // background: null,

        // Primero pintamos el header absoluto (se dibuja encima),
        // luego el spacer para la pág. 1, y después el contenido normal.
        content: [
            headerHeroAbs,
            firstPageSpacer,
            box1, box2, detalle, comentarioFull, transporteYTotales
        ],
        defaultStyle: { fontSize: 10 },
    };
}




// =============== Generador ===============
export function generateGdePdf(doc, filename = `GDE-${doc?.folio || "borrador"}.pdf`) {
    const def = buildDefinition(doc);
    pdfMake.createPdf(def).download(filename);
}
