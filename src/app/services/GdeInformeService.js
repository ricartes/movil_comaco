import { getGdeDao } from "@/app/services/initServices";
import config from "@/Common/json/config.json";
import { formatearFechasConNombreDia } from "@/app/helpers/FechasHelpers";

// despachoDiario.js

const unidadDe = (doc) => String(doc?.producto?.unidadMedida ?? "").toUpperCase();


const safe = (v, def = "") => (v == null ? def : v);
const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// según unidad del doc, toma el volumen correcto
function pickVolumen(doc) {
    const U = (config?.parametros?.unidadesMedida) || {};
    const um = String(doc?.producto?.unidadMedida ?? "").toUpperCase();

    if (um === String(U.MR || "MR")) return num(doc?.totales?.mr?.volumen);
    if (um === String(U.M3 || "M3")) return num(doc?.totales?.m3?.volumen);

    // Trátalos como toneladas:
    if (um === String(U.TON || "TON") ||
        um === String(U.BDMT || "BDMT") ||
        um === String(U.M3ST || "M3ST")) {
        return num(doc?.totales?.ton?.volumen);
    }

    // Fallback defensivo
    return (
        num(doc?.totales?.mr?.volumen) ||
        num(doc?.totales?.m3?.volumen) ||
        num(doc?.totales?.ton?.volumen)
    );
}


function generarDetalleDiario(docs) {
    const gruposMap = new Map();

    for (const d of docs) {
        const origen = safe(d?.predio?.predio);
        const codigo = safe(d?.ordenCompra?.codProyecto) || safe(d?.proveedor?.codEncargado) || safe(d?.zona?.codigo) || safe(d?.zona?.descripcion);
        const producto = safe(d?.producto?.nombreProducto);
        const destino = safe(d?.destino?.destinoCliente) || safe(d?.cliente?.razonSocialCliente);
        const um = unidadDe(d);
        const volumen = pickVolumen(d);
        const folio = d?.folio;

        const k = [origen, codigo, producto, destino, um].join("|");
        if (!gruposMap.has(k)) {
            gruposMap.set(k, {
                encabezado: { origen, codigo, producto, destino, unidad: um },
                filas: [],
                subtotal: 0,
            });
        }
        const g = gruposMap.get(k);
        g.filas.push({ folio, volumen });
        g.subtotal += volumen;
    }

    const grupos = Array.from(gruposMap.values()).map((g) => ({
        ...g,
        filas: g.filas.sort((a, b) => (a.folio ?? 0) - (b.folio ?? 0)),
        subtotal: Number(g.subtotal.toFixed(2)),
    }));

    const totalDia = Number(grupos.reduce((acc, g) => acc + g.subtotal, 0).toFixed(2));
    return { grupos, totalDia };
}


// --- generarResumenPorPredio ---
function generarResumenPorPredio(docs) {
    const gruposMap = new Map();

    for (const d of docs) {
        const predio = safe(d?.predio?.predio);
        const rol = safe(d?.predio?.rolPredio) || safe(d?.predio?.rolComuna);
        const codigo = safe(d?.ordenCompra?.codProyecto) || safe(d?.proveedor?.codEncargado) || safe(d?.zona?.codigo) || safe(d?.zona?.descripcion);
        const cctNombre = safe(d?.empresaContratista?.nombreContratista) || safe(d?.transportista?.nomTransportista);
        const cctRut = safe(d?.empresaContratista?.rutContratista) || safe(d?.transportista?.rutTransportista);
        const producto = safe(d?.producto?.nombreProducto);
        const destino = safe(d?.destino?.destinoCliente) || safe(d?.cliente?.razonSocialCliente);
        const um = unidadDe(d);
        const volumen = pickVolumen(d);

        const k = [predio, rol, codigo, producto, destino, um, cctNombre, cctRut].join("|");
        if (!gruposMap.has(k)) {
            gruposMap.set(k, {
                encabezado: { predio, rol, codigo, producto, destino, cctNombre, cctRut, unidad: um },
                filas: [],
                subtotal: 0,
            });
        }
        const g = gruposMap.get(k);
        g.filas.push({ folio: d?.folio, volumen });
        g.subtotal += volumen;
    }

    const grupos = Array.from(gruposMap.values()).map((g) => ({
        ...g,
        filas: g.filas.sort((a, b) => (a.folio ?? 0) - (b.folio ?? 0)),
        subtotal: Number(g.subtotal.toFixed(2)),
    }));

    const totalDia = Number(grupos.reduce((acc, g) => acc + g.subtotal, 0).toFixed(2));
    return { grupos, totalDia };
}




export async function generarInforme(empId, rut, fechaISO, { incluirAnuladas = true } = {}) {

    const desde = `${fechaISO}T00:00:00`;
    const hasta = `${fechaISO}T23:59:59`;

    const dao = getGdeDao();
    const docs = await dao.listarPorRangoFechaEmision(empId, rut, { desde, hasta });

    const EG = config?.parametros?.estadosGuia || {};
    const EST_OK = new Set([
        String(EG.EMITIDA?.id || "I").toUpperCase(),
        String(EG.ENVIADA?.id || "E").toUpperCase(),
        ...(incluirAnuladas ? [String(EG.NULA?.id || "N").toUpperCase()] : []),
    ]);

    const data = (Array.isArray(docs) ? docs : []).filter(d => EST_OK.has(String(d?.estado?.id ?? "").toUpperCase()));
    if (data.length === 0) {
        return {
            meta: { empId, rut, fechaISO, fechaLarga: formatearFechasConNombreDia(fechaISO), empresaNombre: "Empresa", totalGuias: 0 },
            detalleDiario: { grupos: [], totalDia: 0 },
            resumenPorPredio: { grupos: [], totalDia: 0 },
        };
    }

    data.sort((a, b) => (a?.folio ?? 0) - (b?.folio ?? 0));
    const empresaNombre = safe(data?.[0]?.empresa?.razonSocial, "Empresa");
    const fechaLarga = formatearFechasConNombreDia(fechaISO);

    const detalleDiario = generarDetalleDiario(data);
    const resumenPorPredio = generarResumenPorPredio(data);

    return {
        meta: { empId, rut, fechaISO, fechaLarga, empresaNombre, totalGuias: data.length },
        detalleDiario,
        resumenPorPredio,
    };
}
