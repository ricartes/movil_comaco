// /app/services/GuiaPrinter.js
import { printRawText, printBase64Safe, printTextSizeAlignSafe, connectByName, isConnected } from '@/app/services/PrinterService';
import { generateHeaderBoxBase64 } from '@/js/Utils/ticketHeaderBox';
import { renderThermalPdf417FromTED, stripDataUrl } from '@/js/Utils/pdf417-thermal';
import store from '@/js/store';

// ===== Ajustes de ticket =====
const COLS = 48; // 58mm ≈ 32; para 80mm podrías usar 42/48


// ==== Helpers de maquetado ====
const rep = (ch, n) => (ch || ' ').repeat(Math.max(0, n || 0));
const div = (ch = '-') => rep(ch, COLS) + '\n';
const cut = (s = '') => String(s).slice(0, COLS);

const left = (s = '') => cut(s).padEnd(COLS, ' ') + '\n';
const right = (s = '') => cut(s).padStart(COLS, ' ') + '\n';
const center = (s = '') => {
    s = String(s);
    if (s.length >= COLS) return cut(s) + '\n';
    const pad = Math.floor((COLS - s.length) / 2);
    return rep(' ', pad) + s + rep(' ', COLS - s.length - pad) + '\n';
};

const DECIMALS_BY_UM = {
    MR: 2,
    TON: 2,
    BDMT: 3,
    M3ST: 3,
    M3: 3, // fallback para m³ “normal”
};

// arriba, junto a helpers:
function numDec(v, places = 2, comma = false) {
    const n = Number(v);
    if (!Number.isFinite(n)) return (0).toFixed(places);
    // Para Bluetooth/ESC-POS suele ser más seguro el punto (comma=false).
    return comma
        ? n.toLocaleString('es-CL', { minimumFractionDigits: places, maximumFractionDigits: places })
        : n.toFixed(places);
}


function wrap(s = '') {
    const t = String(s);
    const out = [];
    for (let i = 0; i < t.length; i += COLS) out.push(t.slice(i, i + COLS));
    return out.map(l => l + '\n').join('');
}
function twoCols(l = '', r = '', rw = 12) {
    let R = cut(String(r));
    if (R.length > rw) R = R.slice(-rw);
    const lw = COLS - rw - 1;
    let L = cut(String(l));
    if (L.length > lw) L = L.slice(0, lw);
    return L.padEnd(lw, ' ') + ' ' + R.padStart(rw, ' ') + '\n';
}
const fmt = (n) => Number(n || 0).toLocaleString('es-CL', { minimumFractionDigits: 0 });

// ==== Mapeo desde tu objeto ====
function mapDoc(doc) {
    const empresa = doc?.empresa || {};
    const emisor = {
        rut: `${empresa.rut}-${empresa.dv || ''}`,
        rs: empresa.razonSocial || '',
        giro: empresa.giro || '',
        dir: empresa.direccion || '',
        comuna: empresa.comuna || '',
        ciudad: empresa.ciudad || '',
        fResol: empresa.fechaResolucion || '',
        nResol: empresa.numeroResolucion || '',
    };

    const receptor = {
        rut: doc?.cliente?.rutCliente || '',
        rs: doc?.cliente?.razonSocialCliente || '',
        giro: doc?.cliente?.giroCliente || '',
        dir: doc?.destino?.direccionDestinoCliente || '',
        comuna: doc?.destino?.comunaDestinoCliente || '',
        ciudad: doc?.destino?.ciudadDestinoCliente || '',
    };

    const traslado = {
        indicador: doc?.indicadorTraslado?.texto || '', // "CONSTITUYE VENTA" / "SOLO TRASLADO"
        origen: `${doc?.predio?.predio || ''}, ROL: ${doc?.predio?.rolPredio || ''}, COMUNA: ${doc?.predio?.rolComuna || ''}`,
        destino: doc?.destino?.destinoCliente || '',
    };

    const trans = {
        transportista: doc?.transportista?.nomTransportista || (doc?.ventaPiso ? 'Venta en piso' : ''),
        patenteCamion: doc?.patenteCamion?.patCamion || '',
        patenteCarro: doc?.patenteCarro || '',
        rutChofer: doc?.conductor?.rutChofer || '',
        nomChofer: doc?.conductor?.nomChofer || '',
        proveedorRut: doc?.proveedor?.rutProveedor || '',
        proveedorNom: doc?.proveedor?.nomProveedor || '',
        contratista: doc?.empresaContratista?.nombreContratista || '',
    };

    const prod = {
        nombre: doc?.producto?.nombreProducto || '',
        unidad: doc?.producto?.unidadMedida || 'MR',
        largo: doc?.largoProducto || doc?.ordenCompra?.largoTrozo || '',
        fsc: doc?.producto?.fsc ? doc?.producto?.categoria || 'CON CERTIFICACIÓN' : 'SIN CERTIFICACIÓN',
        sag: doc?.producto?.sag || '',
        precioUnit: doc?.precioProducto?.precio || 0,
    };

    const tot = {
        neto: doc?.totales?.neto ?? 0,
        iva: doc?.totales?.ivaMonto ?? 0,
        total: doc?.totales?.total ?? 0,
        ivaPct: doc?.totales?.ivaPct ?? doc?.ivaPct ?? 19,
    };

    const folio = doc?.folio || 'SIN FOLIO ASIGNADO';
    const fecha = (doc?.fechaEmisionOffset || doc?.fechaEmision || '').replace('T', ' ').split('.')[0] || '';

    // Detalle MR (por tus campos)
    const detalleMR = Array.isArray(doc?.detalleMR) ? doc.detalleMR : [];

    return { emisor, receptor, traslado, trans, prod, tot, folio, fecha, detalleMR, tedXml: doc?.ted || null };
}

// ===== Opcional: recibir base64 de timbre/QR ya generado =====
// Si hoy NO puedes generar PDF417 en el móvil, pasa `opts.timbreBase64` desde el backend.
export async function printGuiaFromDoc(doc, opts = {}) {
    // 1) asegurar impresora configurada y conectada (si el plugin lo requiere)
    const nameOrAddr = store.state.printer.address || store.state.printer.name;
    if (!nameOrAddr) throw new Error('No hay impresora configurada');

    try {
        // Algunos forks NO requieren connect previo, pero si lo hace, mejor conectamos:
        try {
            const conn = await isConnected();
            if (!conn) await connectByName(nameOrAddr);
        } catch (_) {
            await connectByName(nameOrAddr);
        }
    } catch (e) {
        // no cortamos: hay forks que conectan on-demand
    }

    const M = mapDoc(doc);
    // ===== Encabezado =====
    const headerB64 = generateHeaderBoxBase64({
        rut: `R.U.T.: ${M.emisor.rut}`,
        title: 'GUÍA DE DESPACHO\nELECTRÓNICA',
        folio: `N°: ${M.folio}`,
        width: 576,            // 80mm
        bgColor: '#eeeeee',    // si prefieres blanco puro: '#ffffff'
        strokeColor: '#000000',
        textColor: '#000000',
    });
    await printBase64Safe(headerB64, '1', 48);
    await printTextSizeAlignSafe('\n', '0', '0');


    if (M.emisor.comuna) await printRawText(center(`S.I.I ${M.emisor.comuna.toUpperCase()}`));
    await printRawText(div('='));

    // Datos emisor
    await printRawText(left('DATOS DEL EMISOR'));
    await printRawText(wrap(`RAZÓN SOCIAL: ${M.emisor.rs.toUpperCase()}`));
    if (M.emisor.giro) await printRawText(wrap(`GIRO: ${M.emisor.giro.toUpperCase()}`));
    if (M.emisor.dir) await printRawText(wrap(`DIRECCIÓN: ${M.emisor.dir.toUpperCase()}`));
    if (M.emisor.comuna) await printRawText(`COMUNA: ${M.emisor.comuna.toUpperCase()}\n`);
    await printRawText(div());

    // Receptor
    await printRawText(left('DATOS DEL RECEPTOR'));
    if (M.receptor.rut) await printRawText(`RUT: ${M.receptor.rut}\n`);
    if (M.receptor.rs) await printRawText(wrap(`RAZÓN SOCIAL: ${M.receptor.rs.toUpperCase()}`));
    if (M.receptor.giro) await printRawText(wrap(`GIRO: ${M.receptor.giro.toUpperCase()}`));
    if (M.receptor.dir) await printRawText(wrap(`DIRECCIÓN: ${M.receptor.dir.toUpperCase()}`));
    if (M.receptor.comuna || M.receptor.ciudad) {
        await printRawText(`COMUNA: ${M.receptor.comuna?.toUpperCase() || ''}\n`);
    }
    if (M.fecha) await printRawText(`FECHA EMISIÓN: ${M.fecha}\n`);
    if (M.traslado.indicador) await printRawText(`IND. TRASLADO: ${M.traslado.indicador}\n`);
    await printRawText(wrap(`ORIGEN: ${M.traslado.origen.toUpperCase()}`));
    if (M.traslado.destino) await printRawText(wrap(`DESTINO: ${M.traslado.destino.toUpperCase()}`));
    await printRawText(div());

    // Transporte
    await printRawText(left('DATOS TRANSPORTE'));
    if (M.trans.transportista) await printRawText(wrap(`TRANSPORTISTA: ${M.trans.transportista.toUpperCase()}`));
    if (M.trans.patenteCamion) await printRawText(`PATENTE CAMIÓN: ${M.trans.patenteCamion}\n`);
    if (M.trans.patenteCarro) await printRawText(`PATENTE CARRO: ${M.trans.patenteCarro}\n`);
    if (M.trans.rutChofer) await printRawText(`RUT CHOFER: ${M.trans.rutChofer}\n`);
    if (M.trans.nomChofer) await printRawText(wrap(`NOMBRE CHOFER: ${M.trans.nomChofer.toUpperCase()}`));
    if (M.trans.contratista) await printRawText(wrap(`CONTRATISTA: ${M.trans.contratista.toUpperCase()}`));
    if (M.trans.proveedorRut || M.trans.proveedorNom) {
        await printRawText(wrap(`PROVEEDOR: ${M.trans.proveedorRut} - ${M.trans.proveedorNom}`));
    }
    await printRawText(div());

    // Producto / Detalle
    await printRawText(left('DETALLE PRODUCTO'));
    const tituloProd = M.prod.largo ? `${M.prod.nombre.toUpperCase()} (${M.prod.largo} MTS)` : M.prod.nombre.toUpperCase();
    await printRawText(wrap(`PRODUCTO: ${tituloProd}`));
    await printRawText(wrap(`CERTIFICACIÓN: ${M.prod.fsc}`));
    if (M.prod.sag) await printRawText(wrap(`RESOLUCIÓN SAG: ${M.prod.sag}`));
    await printRawText(`PRECIO UNITARIO: $${fmt(M.prod.precioUnit)}\n`);

    // Tabla MR (por tus campos detalleMR)
    // Tabla MR (por tus campos detalleMR)
    if (Array.isArray(M.detalleMR) && M.detalleMR.length) {
        await printRawText(div('-'));
        await printRawText(left(`BANCO  ANCHO  H.IZQ  H.DER  LARGO  ${M.prod.unidad}`));
        await printRawText(div('-'));

        for (let i = 0; i < M.detalleMR.length; i++) {
            const d = M.detalleMR[i];

            // Volumen con 3 decimales, resto igual
            const vol = (d.volumen != null)
                ? Number(d.volumen).toLocaleString('es-CL', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3
                })
                : '0.000';

            const linea =
                ` ${String(d.id).padEnd(5)} ` +
                `${num(d.ancho).padEnd(5)} ` +
                `${num(d.alturaIzquierda).padEnd(5)} ` +
                `${num(d.alturaDerecha).padEnd(5)} ` +
                `${num(d.largo).padEnd(5)} ` +
                `${vol}`;

            await printRawText(left(linea));
        }

        await printRawText(div());
    }


    // Totales
    await printRawText(twoCols('NETO', `$${fmt(M.tot.neto)}`, 12));
    await printRawText(twoCols(`IVA ${M.tot.ivaPct}%`, `$${fmt(M.tot.iva)}`, 12));
    await printRawText(twoCols('TOTAL', `$${fmt(M.tot.total)}`, 12));
    await printRawText(div('='));


    // ===== TIMBRE PDF417 =====
    let timbreBase64 = opts?.timbreBase64;
    if (!timbreBase64 && doc?.ted) {
        // Generar localmente desde TED
        try {
            const dataUrl = await renderThermalPdf417FromTED(doc.ted);
            timbreBase64 = dataUrl; // el plugin suele aceptar dataURL; si no, usa stripDataUrl(dataUrl)
        } catch (e) {
            // Si falla, mostramos un aviso y seguimos sin timbre (no rompemos la impresión)
            await printTextSizeAlignSafe('** No se pudo generar timbre **\n', '0', '1');
        }
    }

    if (timbreBase64) {
        // Para máxima compatibilidad, si tu plugin requiere “solo base64”, descomenta la línea con strip:
        // const b64 = stripDataUrl(timbreBase64);
        const b64 = timbreBase64;

        // 80mm ⇒ paperWidth 48; centrado
        await printBase64Safe(b64, '1', 64);

        // Pie “Timbre electrónico SII”
        await printTextSizeAlignSafe('Timbre electrónico SII\n', '0', '1');

        // “RES {n} de {año} - Verifique documento en www.sii.cl”
        const numRes = M.emisor.nResol || '';
        const anioRes = (M.emisor.fResol || '').slice(0, 4) || '';
        if (numRes || anioRes) {
            await printTextSizeAlignSafe(`RES ${numRes} de ${anioRes} - Verifique documento en www.sii.cl\n`, '0', '1');
        }
        await printTextSizeAlignSafe('ORIGINAL\n\n', '0', '2'); // o “CEDIBLE” según flujo
    } else {
        await printTextSizeAlignSafe('Documento sin timbre impreso\n\n', '0', '1');
    }
    await printRawText('\n\n');
}

function num(v) {
    if (v == null) return '0';
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : String(v);
}
