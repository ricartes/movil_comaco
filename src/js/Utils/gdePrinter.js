// /app/services/GuiaPrinter.js
import { printRawText, printBase64Safe, printTextSizeAlignSafe, connectByName, isConnected } from '@/app/services/PrinterService';
import { generateHeaderBoxBase64 } from '@/js/Utils/ticketHeaderBox';
import { renderThermalPdf417FromTED, stripDataUrl } from '@/js/Utils/pdf417-thermal';
import store from '@/js/store';
import { refreshPrinterLayout } from '@/js/Utils/PapelSize';
import { formatearRut } from '@/js/Utils/rut';
import { getUM, getVolumenByUM } from '@/js/Utils/volumen';
import { formatFechaCorta } from '@/js/Utils/formatters';

// ===== Ajustes de ticket =====
let PAPER_WIDTH = 32;
let COLS = 32;
let PIXELS = 384;



// ==== Helpers de maquetado ====
const rep = (ch, n) => (ch || ' ').repeat(Math.max(0, n || 0));
const div = (ch = '-') => rep(ch, COLS);           // antes: + '\n'
const cut = (s = '') => String(s).slice(0, COLS);

const left = (s = '') => cut(s).padEnd(COLS, ' ');  // antes: + '\n'
const right = (s = '') => cut(s).padStart(COLS, ' '); // antes: + '\n'
const center = (s = '') => {
    s = String(s);
    if (s.length >= COLS) return cut(s);            // antes: + '\n'
    const pad = Math.floor((COLS - s.length) / 2);
    return rep(' ', pad) + s + rep(' ', COLS - s.length - pad);
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
    return out.join('\n');                           // antes: unía con '\n' y luego + '\n' en cada línea
}

function twoCols(l = '', r = '', rw = 12) {
    let R = cut(String(r));
    if (R.length > rw) R = R.slice(-rw);
    const lw = COLS - rw - 1;
    let L = cut(String(l));
    if (L.length > lw) L = L.slice(0, lw);
    return L.padEnd(lw, ' ') + ' ' + R.padStart(rw, ' ');
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
        nombreDespachador: doc.emisor.nombre || '',
        rutDespachador: doc.emisor.emisor || '',
    };

    const receptor = {
        rut: doc?.cliente?.rutCliente || '',
        rs: doc?.cliente?.razonSocialCliente || '',
        giro: doc?.cliente?.giroCliente || '',
        dir: doc?.cliente?.direccionCliente || '',
        comuna: doc?.cliente?.comunaCliente || '',
        ciudad: doc?.cliente?.ciudadCliente || '',
    };

    const traslado = {
        indicador: doc?.indicadorTraslado?.texto || '', // "CONSTITUYE VENTA" / "SOLO TRASLADO"
        origen: doc?.predio?.predio || '',
        rol: doc?.predio?.rolPredio || '',
        comunaOrigen: doc?.predio?.rolComuna || '',
        direccionDestinoCliente: doc?.destino?.direccionDestinoCliente || '',
    };

    const comentarios = {
        comentarios: doc?.comentarios?.comentarios || '',
        fechaPlantacion: doc?.comentarios?.fechaPlantacion || '',
        fechaCorta: doc?.comentarios?.anioCosecha || '',
        planManejo: doc?.comentarios?.planManejo || '',
        horaAgendamiento: doc?.comentarios?.horaAgendamiento || '',
        numeroAgendamiento: doc?.comentarios?.numeroAgendamiento || '',
        numeroGuiaAnterior: doc?.comentarios?.numeroGuiaAnterior || '',
    }

    const trans = {
        transportista: `${doc?.transportista?.nomTransportista} - ${doc?.transportista?.rutTransportista || ''} `,
        patenteCamion: doc?.patenteCamion?.patCamion || '',
        patenteCarro: doc?.patenteCarro || '',
        rutChofer: doc?.conductor?.rutChofer || '',
        nomChofer: doc?.conductor?.nomChofer || '',
        proveedor: `${doc?.proveedor?.nomProveedor || ''} - ${doc?.proveedor?.rutProveedor || ''}`,
        contratista: `${doc?.empresaContratista?.nombreContratista || ''} - ${doc?.empresaContratista?.rutContratista || ''}`,
    };

    const prod = {
        nombre: doc?.producto?.nombreProducto || '',
        unidad: getUM(doc),
        largo: doc?.largoProducto || doc?.ordenCompra?.largoTrozo || '',

        fsc: doc?.producto?.fsc ? doc?.producto?.categoria || 'CON CERTIFICACIÓN' : 'SIN CERTIFICACIÓN',
        sag: doc?.producto?.sag || '',
        tipoCertificacion: doc?.producto?.tipoCertificacion || '',
        codigoCertificacion: doc?.producto?.codigoCertificacion || '',
        precioUnit: doc?.precioProducto?.precio || 0,
    };

    const ordenCompra = {
        numOc: doc?.ordenCompra?.numOc || '',
        coordenadaX: doc?.ordenCompra?.coordenadaX || '',
        coordenadaY: doc?.ordenCompra?.coordenadaY || '',
        glosaFormaPago: doc?.ordenCompra?.glosaFormaPago || '',

    }

    const tot = {
        volumenTotal: getVolumenByUM(doc, prod.unidad),
        neto: doc?.totales?.neto ?? 0,
        iva: doc?.totales?.ivaMonto ?? 0,
        total: doc?.totales?.total ?? 0,
        ivaPct: doc?.totales?.ivaPct ?? doc?.ivaPct ?? 19,
    };


    const folio = doc?.folio || 'SIN FOLIO ASIGNADO';
    const fecha = (doc?.fechaEmisionOffset || doc?.fechaEmision || '').replace('T', ' ').split('.')[0] || '';

    const carguios = [];
    if (Array.isArray(doc?.carguios) && doc.carguios.length) {
        for (const c of doc.carguios) {
            carguios.push({
                rut: c?.rutCarguio || c?.rut || '',
                nombre: c?.nombreCarguio || c?.nombre || '',
                patente: c?.patenteCarguio || c?.patente || '',
            });
        }
    } else {
        // fallback 1 (primario)
        if (doc?.rutCarguio || doc?.nombreCarguio || doc?.patenteCarguio) {
            carguios.push({
                rut: doc?.rutCarguio || '',
                nombre: doc?.nombreCarguio || '',
                patente: doc?.patenteCarguio || '',
            });
        }
        // fallback 2 (secundario)
        if (doc?.rutCarguio2 || doc?.nombreCarguio2 || doc?.patenteCarguio2) {
            carguios.push({
                rut: doc?.rutCarguio2 || '',
                nombre: doc?.nombreCarguio2 || '',
                patente: doc?.patenteCarguio2 || '',
            });
        }
    }



    // Detalle MR (por tus campos)
    const detalleMR = Array.isArray(doc?.detalleMR) ? doc.detalleMR : [];
    const detalleM3 = Array.isArray(doc?.detalleM3) ? doc.detalleM3 : []; // 👈 NUEVO


    return { emisor, receptor, traslado, trans, prod, tot, folio, fecha, detalleMR, detalleM3, tedXml: doc?.ted || null, carguios, comentarios, ordenCompra };
}

// ===== Opcional: recibir base64 de timbre/QR ya generado =====
// Si hoy NO puedes generar PDF417 en el móvil, pasa `opts.timbreBase64` desde el backend.
export async function printGuiaFromDoc(doc, opts = {}) {
    const { disconnectOnEnd = false } = opts;
    const etiquetaCopia = opts?.cedible === true ? 'CEDIBLE' : 'ORIGINAL';
    let mustDisconnect = false;
    // 1) asegurar impresora configurada y conectada (si el plugin lo requiere)
    const nameOrAddr = store.state.printer.address || store.state.printer.name;
    if (!nameOrAddr) throw new Error('No hay impresora configurada');

    const { paperWidth, cols, pixels } = refreshPrinterLayout();
    PAPER_WIDTH = paperWidth;
    COLS = cols;
    PIXELS = pixels;
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
        rut: `R.U.T.: ${formatearRut(M.emisor.rut)}`,
        title: 'GUÍA DE DESPACHO',
        folio: `N°: ${M.folio}`,
        width: PIXELS,        // ← 384 ó 576 según papel   
        bgColor: '#eeeeee',    // si prefieres blanco puro: '#ffffff'
        strokeColor: '#000000',
        textColor: '#000000',
    });
    await printBase64Safe(headerB64, '1', String(COLS));

    if (M.emisor.comuna) await printRawText(center(`S.I.I ${M.emisor.comuna.toUpperCase()}`));
    await printRawText(div('='));


    //datos de la guia
    await printRawText(wrap(`NÚMERO GUÍA: ${M.folio}`));
    await printRawText(wrap(`EMPRESA: ${M.emisor.rs.toUpperCase()}`));
    if (M.emisor.giro) await printRawText(wrap(`GIRO: ${M.emisor.giro.toUpperCase()}`));
    if (M.emisor.dir) await printRawText(wrap(`DIRECCIÓN: ${M.emisor.dir.toUpperCase()}`));
    await printRawText(div());
    //datos del Receptor
    if (M.fecha) await printRawText(`FECHA: ${formatFechaCorta(M.fecha)}`);
    if (M.receptor.rut) await printRawText(`RUT: ${M.receptor.rut}`);
    if (M.receptor.rs) await printRawText(wrap(`RAZÓN SOCIAL: ${M.receptor.rs.toUpperCase()}`));
    if (M.receptor.giro) await printRawText(wrap(`GIRO: ${M.receptor.giro.toUpperCase()}`));
    if (M.receptor.dir) await printRawText(wrap(`DIRECCIÓN: ${M.receptor.dir.toUpperCase()}`));
    if (M.receptor.comuna || M.receptor.ciudad) {
        await printRawText(`COMUNA: ${M.receptor.comuna?.toUpperCase() || ''}`);
    }
    if (M.traslado.indicador) await printRawText(`IND. TRASLADO: ${M.traslado.indicador}`);

    await printRawText(div());
    //datos del origen
    await printRawText(wrap(`ORIGEN: ${M.traslado.origen.toUpperCase()}`));
    await printRawText(wrap(`ROL: ${M.traslado.rol.toUpperCase()} RES ${M.comentarios.planManejo}`));
    await printRawText(wrap(`COMUNA: ${M.traslado.comunaOrigen.toUpperCase()}`));
    await printRawText(wrap(`DESTINO: ${M.traslado.direccionDestinoCliente.toUpperCase()}`));
    await printRawText(div());
    await printRawText(wrap(`TIPO CERTIFIC.: ${M.prod.tipoCertificacion}`));
    await printRawText(wrap(`COD. CERTIFIC.: ${M.prod.codigoCertificacion}`));
    await printRawText(div());
    await printRawText(wrap(`DESPACHADOR: ${M.emisor.nombreDespachador.toUpperCase()}`));
    await printRawText(wrap(`EMP. COSECHA: ${M.trans.contratista.toUpperCase()}`));
    await printRawText(wrap(`PROVEEDOR: ${M.trans.proveedor.toUpperCase()}`));


    // === CARGUÍO(s): formato igual que PROVEEDOR ===
    if (Array.isArray(M.carguios) && M.carguios.length) {
        // RUT - NOMBRE
        const carguiosStr = M.carguios
            .map(c => {
                const rut = (c?.rut || c?.rutCarguio || '').toString().trim();
                const nom = (c?.nombre || c?.nombreCarguio || '').toString().trim().toUpperCase();
                return [nom, rut].filter(Boolean).join(' - ');
            })
            .filter(Boolean)
            .join(', ');

        // Patentes
        const patentesStr = M.carguios
            .map(c => (c?.patente || c?.patenteCarguio || '').toString().trim().toUpperCase())
            .filter(Boolean)
            .join(', ');

        if (carguiosStr) {
            await printRawText(wrap(`EMP. CARGUÍO: ${carguiosStr}`));
        }
        if (patentesStr) {
            await printRawText(wrap(`PATENTE CARGUÍO: ${patentesStr}`));
        }
    }
    if (M.trans.transportista) await printRawText(wrap(`EMP. TRANSP.: ${M.trans.transportista.toUpperCase()}`));
    await printRawText(div());
    await printRawText(wrap(`ID: ${M.ordenCompra.numOc}`));
    await printRawText(wrap(`FORMA DE PAGO: ${M.ordenCompra.glosaFormaPago}`));
    await printRawText(wrap(`COORDENADA X: ${M.ordenCompra.coordenadaX}`));
    await printRawText(wrap(`COORDENADA Y: ${M.ordenCompra.coordenadaY}`));


    await printRawText(div());

    // Transporte
    if (M.trans.patenteCamion) await printRawText(`PATENTE CAMIÓN: ${M.trans.patenteCamion}`);
    if (M.trans.patenteCarro) await printRawText(`PATENTE CARRO: ${M.trans.patenteCarro}`);
    if (M.trans.nomChofer) await printRawText(wrap(`CONDUCTOR: ${M.trans.nomChofer.toUpperCase()}`));
    if (M.trans.rutChofer) await printRawText(`RUT CONDUCTOR: ${M.trans.rutChofer}`);

    await printRawText(div());
    // Producto / Detalle
    const tituloProd = M.prod.largo ? `${M.prod.nombre.toUpperCase()} (${M.prod.largo} MTS)` : M.prod.nombre.toUpperCase();
    await printRawText(wrap(`DESC: ${tituloProd}`));
    await printRawText(wrap(`PRECIO UNITARIO: $${fmt(M.prod.precioUnit)}`));
    await printRawText(div());
    await printRawText(left(`CANT    UNIDAD   PRECIO TOTAL`));

    const linea =
        String(Number(M.tot.volumenTotal).toLocaleString('es-CL', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        })).padEnd(8) +
        String(M.prod.unidad).padEnd(8) +
        String(`$${fmt(M.tot.neto)}`).padStart(12);

    await printRawText(left(linea));
    //tabla mr
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
    }

    // ====== TABLA M3 (solo filas con volumen > 0) ======
    if (Array.isArray(M.detalleM3) && M.detalleM3.length) {
        const filas = M.detalleM3.filter(d => Number(d?.volumen) > 0);
        if (filas.length) {
            await printRawText(div('-'));
            // cabecera: ajustada a 32/48 col con columnas compactas
            // DIÁM  TROZOS  LARGO  VOL(M3)   P.U.      TOTAL
            await printRawText(left(`DIÁM  TRZ   LARGO      ${M.prod.unidad}`));
            await printRawText(div('-'));

            for (const d of filas) {
                const diam = String(d.diametro ?? '').padStart(4, ' ');
                const troz = String(d.trozos ?? '').padStart(3, ' ');
                const larg = numDec(d.largo, 2).padStart(6, ' ');     // 2 decimales ok para largo
                const vol = numDec(d.volumen, 3).padStart(8, ' ');   // 3 decimales para m³
                const pu = fmt(d.precioUnitario ?? 0).padStart(9, ' ');
                const total = fmt(d.totalPrecio ?? 0).padStart(10, ' ');

                // arma la línea y corta por ancho de papel
                const linea = `${diam}  ${troz}  ${larg}  ${vol}`;
                await printRawText(cut(linea));
            }
        }
    }

    await printRawText(div());
    //comentarios
    const anioPlantacion = (M.comentarios.fechaPlantacion || '').substring(0, 4);

    await printRawText(wrap(`NÚMERO GUÍA ANTERIOR: ${M.comentarios.numeroGuiaAnterior ?? ''}`));
    await printRawText(wrap(`OBS: ${M.comentarios.comentarios ?? ''}`));
    await printRawText(wrap(`HORA AGENDAMIENTO: ${M.comentarios.horaAgendamiento ?? ''}`));
    await printRawText(wrap(`NÚMERO AGENDAMIENTO: ${M.comentarios.numeroAgendamiento ?? ''}`));
    await printRawText(wrap(`AÑO PLANTACIÓN: ${anioPlantacion}`));
    await printRawText(wrap(`FECHA CORTA: ${M.comentarios.fechaCorta}`));
    await printRawText(div());


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
            const dataUrl = await renderThermalPdf417FromTED(doc.ted, {
                targetWidth: PIXELS,
                targetHeight: 300,
                fit: 'fill',

                columns: [6, 8],
                aspectratio: 5,
                scale: 7,
                height: 10,
                quiet: 2,

                // ← Seguridad óptima para térmica
                securitylevel: [5, 4, 3],
            });
            timbreBase64 = dataUrl; // el plugin suele aceptar dataURL; si no, usa stripDataUrl(dataUrl)
        } catch (e) {
            await printTextSizeAlignSafe('** No se pudo generar timbre **', '0', '1');
        }
    }

    if (timbreBase64) {
        // Para máxima compatibilidad, si tu plugin requiere “solo base64”, descomenta la línea con strip:
        // const b64 = stripDataUrl(timbreBase64);
        const b64 = timbreBase64;

        // 80mm ⇒ paperWidth 48; centrado
        await printBase64Safe(b64, '0', String(COLS));
        // “RES {n} de {año} - Verifique documento en www.sii.cl”
        const numRes = M.emisor.nResol || '';
        const anioRes = (M.emisor.fResol || '').slice(0, 4) || '';
        await printTextSizeAlignSafe(
            'Timbre electrónico SII\nRES ' +
            `${numRes} de ${anioRes} - Verifique documento en www.sii.cl`,
            '0',
            '1'
        );
    } else {
        await printTextSizeAlignSafe('Documento sin timbre impreso', '0', '1');
    }

    if (opts?.cedible === true) {
        await printRawText(div('-'));

        const cedibleLines = [
            'Nombre: ______________________________________',
            'RUT: _________________________________________',
            'Firma: _______________________________________',
            'Fecha: ____/_____/_____',
            'Recinto: _____________________________________',
            '_______________________________________________',
            'El acuse de recibo que se declara en este acto, de acuerdo a lo dispuesto en la letra b) del Art. 4 y la letra c) del Art 5 de la ley 19.983, acredita que la entrega de mercancías o servicio(s) prestado(s) ha(n) sido recibido(s).',
            '_______________________________________________',
        ];
        for (const line of cedibleLines) {
            await printRawText(wrap(line));
        }
        await printRawText(div('-'));
    }

    await printTextSizeAlignSafe(etiquetaCopia, '0', '2');
    await printRawText('\n\n');
}

function num(v) {
    if (v == null) return '0';
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : String(v);
}
