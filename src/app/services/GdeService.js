// GdeService.js
import forge from "node-forge";              // npm i node-forge
import { getGdeDao, getSiiFolioDao } from "@/app/services/initServices";
import config from "@/Common/json/config.json";
import { nowLocalIso, nowLocalIsoWithOffset } from "@/app/helpers/FechasHelpers";

export async function listarPorEmpresaYRutPaginado(empId, rut, opts) {
    return await getGdeDao().listarPorEmpresaYRutPaginado(empId, rut, opts);
}

export async function listarPorEmpresaYRut(empId, rut) {
    return await getGdeDao().listarPorEmpresaYRut(empId, rut);
}

export async function obtenerGde(id) {
    return await getGdeDao().obtener(id);
}

export async function ingresarGde(gde) {
    return await getGdeDao().insertar(gde); // devuelve doc completo
}

export async function descartarGde(gde) {
    return await getGdeDao().eliminar(gde); // devuelve doc completo
}

export async function emitirGde(gde) {
    // --- Validaciones básicas
    if (!gde || typeof gde !== "object") throw new Error("GDE inválida.");
    const empId = gde?.empresa?.id ?? gde?.empId;
    const rutEmisor = gde?.emisor?.rut ?? gde?.rutEmisor;
    if (!empId) throw new Error("Empresa (empId) no informada.");
    if (!rutEmisor) throw new Error("Rut emisor no informado.");
    if (!gde._id || !gde._rev) throw new Error("Documento GDE sin _id/_rev.");

    const folioDao = getSiiFolioDao();
    const gdeDao = getGdeDao();

    // 1) Obtener primer folio disponible con su URF
    const { folioDTO, urfDTO } = await folioDao.obtenerPrimeroDisponibleConURF(empId, rutEmisor);
    if (!folioDTO) throw new Error("No hay folios disponibles.");
    if (!urfDTO?.caf || !urfDTO?.rsask) throw new Error("URF sin CAF o RSASK.");



    // 2) Asignar folio + fecha

    const fechaIso = nowLocalIso(); // "2025-10-09T22:19:18"
    const fechaYYYYMMDD = fechaIso.slice(0, 10); // "2025-10-09"
    const tsYYYYMMDDTHHMMSS = fechaIso;          // "2025-10-09T22:19:18"

    gde.folio = Number(folioDTO.folio);
    gde.urfId = Number(folioDTO.urfId);
    gde.fechaEmision = fechaIso;
    gde.fechaEmisionOffset = nowLocalIsoWithOffset();
    gde.estado = config.parametros.estadosGuia.EMITIDA;

    // 3) Generar TED (separado para limpiar emitirGde)
    const ted = buildTED({
        gde,
        urfCAF: urfDTO.caf,
        rsask: urfDTO.rsask,
        td: config?.parametros?.tiposDocumento?.gde ?? 52,
        fechaYYYYMMDD,          // usado en <FE>
        tsYYYYMMDDTHHMMSS,      // usado en <TSTED>
    });

    // 4) Persistir cambios en la GDE
    Object.assign(gde, {
        ted,
        tedAlg: "SHA1withRSA",
        tedGeneradoAt: fechaIso,
        srfId: urfDTO.srfId,
    });

    const gdeActualizada = await gdeDao.actualizar(gde);

    // 5) Marcar folio como USADO y recomputar stats URF (local)
    await folioDao.marcarFolioComoUsado(empId, gde.urfId, gde.folio);
    await folioDao.recomputarURFStats(empId, gde.urfId);

    // (Opcional) Aquí podrías emitir evento local o preparar sync con backend.

    return gdeActualizada;
}

/** ============== Helpers ============== **/

function buildTED({ gde, urfCAF, rsask, td, fechaYYYYMMDD, tsYYYYMMDDTHHMMSS }) {
    const RE = `${gde?.empresa?.rut ?? ""}-${gde?.empresa?.dv ?? ""}`; // RUT Emisor con DV
    const TD = td || 52;
    const F = Number(gde.folio);
    const FE = fechaYYYYMMDD;
    const RR = (gde?.cliente?.rutCliente ?? "").toString().trim(); // con DV
    const RSR = truncate((gde?.cliente?.razonSocialCliente ?? "").toString().trim(), 40);
    const MNT = computeTotalConIva(gde);
    const IT1 = truncate(
        (gde?.producto?.nombreProducto
            ?? gde?.ordenCompra?.descripcion
            ?? gde?.ordenCompra?.nombreProducto
            ?? "").toString().trim(),
        40
    );

    const CAF = urfCAF; // bloque <CAF>…</CAF> tal cual

    const DD =
        `<DD>` +
        `<RE>${RE}</RE>` +
        `<TD>${TD}</TD>` +
        `<F>${F}</F>` +
        `<FE>${FE}</FE>` +
        `<RR>${RR}</RR>` +
        `<RSR>${escapeXml(RSR)}</RSR>` +
        `<MNT>${MNT}</MNT>` +
        `<IT1>${escapeXml(IT1)}</IT1>` +
        CAF +
        `<TSTED>${tsYYYYMMDDTHHMMSS}</TSTED>` +
        `</DD>`;

    const firmaB64 = signSha1WithRsa(DD, rsask);

    return `<TED version="1.0">${DD}<FRMT algoritmo="SHA1withRSA">${firmaB64}</FRMT></TED>`;
}

function computeTotalConIva(gde) {
    // Preferir el total ya calculado en el doc
    const tot = gde?.totales;
    if (!tot) return 0;

    // Prioridad: total → (neto + ivaMonto) → neto
    if (Number.isFinite(tot.total)) return Math.round(tot.total);
    if (Number.isFinite(tot.neto) && Number.isFinite(tot.ivaMonto))
        return Math.round(tot.neto + tot.ivaMonto);
    return Math.round(Number(tot.neto ?? 0));
}


function truncate(s, max = 40) {
    s = (s ?? "").toString();
    return s.length > max ? s.slice(0, max) : s;
}

function escapeXml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function signSha1WithRsa(ddXml, privateKeyPem) {
    const md = forge.md.sha1.create();        // legado SHA1
    md.update(ddXml, "utf8");
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const signature = privateKey.sign(md);
    return forge.util.encode64(signature);
}
