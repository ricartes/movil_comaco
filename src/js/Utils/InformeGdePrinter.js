// InformeGdePrinter.js
import {
    printRawText,
    printBase64Safe,
    printTextSizeAlignSafe,
    connectByName,
    isConnected,
} from '@/app/services/PrinterService';
import store from '@/js/store';
import { refreshPrinterLayout } from '@/js/Utils/PapelSize';

// ===== Ajustes de ticket =====
let PAPER_WIDTH = 32;
let COLS = 32;
let PIXELS = 384;

// ==== Helpers de maquetado (mismos criterios que GuiaPrinter) ====
const rep = (ch, n) => (ch || ' ').repeat(Math.max(0, n || 0));
const cut = (s = '') => String(s).slice(0, COLS);
const div = (ch = '-') => rep(ch, COLS);
const left = (s = '') => cut(s);
const right = (s = '') => cut(s).padStart(COLS, ' ');
const center = (s = '') => {
    s = String(s);
    if (s.length >= COLS) return cut(s);
    const pad = Math.floor((COLS - s.length) / 2);
    return rep(' ', pad) + s + rep(' ', COLS - s.length - pad);
};
const wrap = (s = '') => {
    const t = String(s);
    const lines = [];
    for (let i = 0; i < t.length; i += COLS) lines.push(t.slice(i, i + COLS));
    return lines.join('\n');
};

const DECIMALS_BY_UM = {
    MR: 2,
    M3: 3,
    TON: 2,
    BDMT: 3,
    M3ST: 3,
};

const numDec = (v, places = 2) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return (0).toFixed(places);
    return n.toFixed(places);
};

const fmtCL = (n) =>
    Number(n || 0).toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

// Dos columnas (GD | VOL) con ancho variable de derecha (valor)
function twoCols(l = '', r = '', rw = 12) {
    let R = cut(String(r));
    if (R.length > rw) R = R.slice(-rw);
    const lw = COLS - rw - 1;
    let L = cut(String(l));
    if (L.length > lw) L = L.slice(0, lw);
    return L.padEnd(lw, ' ') + ' ' + R.padStart(rw, ' ');
}

// ====== Render de un grupo ======
async function printGrupoDetalle(grupo) {
    // Encabezado del bloque
    const h = grupo.encabezado || {};
    await printRawText(div('='));
    await printRawText(left('ORIGEN:   ' + (h.origen || '-')));
    await printRawText(left('CÓDIGO:   ' + (h.codigo || '-')));
    await printRawText(left('PRODUCTO: ' + (h.producto || '-')));
    await printRawText(left('DESTINO:  ' + (h.destino || '-')));

    // Tabla GD | VOL
    await printRawText(div('-'));
    await printRawText(twoCols('GD', h.unidad || 'VOL', 10));
    await printRawText(div('-'));

    const dec = DECIMALS_BY_UM[String(h.unidad || '').toUpperCase()] ?? 2;

    for (const fila of grupo.filas || []) {
        const folio = fila.folio != null ? String(fila.folio) : '-';
        const vol = numDec(fila.volumen, dec);
        await printRawText(twoCols(folio, vol, 10));
    }

    await printRawText(div());
    await printRawText(twoCols('Subtotal', numDec(grupo.subtotal ?? 0, dec), 10));
}

async function printGrupoResumen(grupo) {
    const h = grupo.encabezado || {};
    await printRawText(div('='));
    await printRawText(left('PREDIO:   ' + (h.predio || '-')));
    await printRawText(left('ROL:      ' + (h.rol || '-')));
    await printRawText(left('CÓDIGO:   ' + (h.codigo || '-')));
    await printRawText(left('PRODUCTO: ' + (h.producto || '-')));
    await printRawText(left('DESTINO:  ' + (h.destino || '-')));
    if (h.cctNombre || h.cctRut) {
        await printRawText(left('CCT/TRANS: ' + [h.cctNombre, h.cctRut].filter(Boolean).join(' - ')));
    }

    await printRawText(div('-'));
    await printRawText(twoCols('GD', h.unidad || 'VOL', 10));
    await printRawText(div('-'));

    const dec = DECIMALS_BY_UM[String(h.unidad || '').toUpperCase()] ?? 2;

    for (const fila of grupo.filas || []) {
        const folio = fila.folio != null ? String(fila.folio) : '-';
        const vol = numDec(fila.volumen, dec);
        await printRawText(twoCols(folio, vol, 10));
    }

    await printRawText(div());
    await printRawText(twoCols('Subtotal', numDec(grupo.subtotal ?? 0, dec), 10));
}

// ====== API principal ======
/**
 * Imprime el informe generado por GdeInformeService.generarInforme(...)
 * @param {Object} informe Objeto con { meta, detalleDiario, resumenPorPredio }
 * @param {Object} opts { modo: 'detalle'|'resumen', tituloCabecera?: string }
 */
export async function printInformeDespacho(informe, opts = {}) {
    if (!informe) throw new Error('Informe no disponible');

    const modo = opts.modo === 'resumen' ? 'resumen' : 'detalle';
    const meta = informe.meta || {};
    const empresa = meta.empresaNombre || 'Empresa';
    const fechaTxt =
        (meta?.fechaLarga?.larga || meta?.fechaISO || '').toString();
    const titulo = opts.tituloCabecera || 'DESPACHO DIARIO';

    // Conectar impresora si hace falta
    const nameOrAddr = store.state?.printer?.address || store.state?.printer?.name;
    if (!nameOrAddr) throw new Error('No hay impresora configurada');

    const { paperWidth, cols, pixels } = refreshPrinterLayout();
    PAPER_WIDTH = paperWidth;
    COLS = cols;
    PIXELS = pixels;

    try {
        const connected = await isConnected();
        if (!connected) await connectByName(nameOrAddr);
    } catch {
        // algunos plugins conectan on demand
    }

    // Cabecera
    await printRawText(center(empresa.toUpperCase()));
    await printRawText(center(titulo));
    await printRawText(center(fechaTxt));
    await printRawText(div('='));

    // Cuerpo por grupos
    const bloques =
        modo === 'detalle'
            ? (informe.detalleDiario?.grupos || [])
            : (informe.resumenPorPredio?.grupos || []);

    if (!bloques.length) {
        await printRawText(center('** SIN DESPACHOS **'));
        await printRawText('\n\n');
        return;
    }

    for (const g of bloques) {
        if (modo === 'detalle') await printGrupoDetalle(g);
        else await printGrupoResumen(g);
    }

    // Totales del día
    const total =
        modo === 'detalle'
            ? informe.detalleDiario?.totalDia
            : informe.resumenPorPredio?.totalDia;

    // Intentar usar la UM del primer grupo para decimales
    const umPrimera =
        bloques?.[0]?.encabezado?.unidad || bloques?.[0]?.encabezado?.unidad;
    const dec = DECIMALS_BY_UM[String(umPrimera || '').toUpperCase()] ?? 2;

    await printRawText(div('='));
    await printRawText(twoCols('TOTAL DESPACHO DÍA', numDec(total ?? 0, dec), 12));
    await printRawText('\n\n');
}

