'use strict';

/**
 * Cross-repo E2E harness for `tests/qr-scan-first-e2e.test.js`.
 *
 * Builds TWO ISOLATED `node:vm` contexts, one per repo:
 *   - `crearContextoTrazabilidad()` — the producer (`movil_comaco`), backed by a real
 *     in-memory SQLite database seeded with the real `version8Esquema` schema.
 *   - `crearContextoGuias()` — the consumer (`movil_comaco_gde`), backed by a real
 *     in-memory SQLite database seeded with the real `GDE_GEOCERCA_RODAL` schema
 *     (from migrations `version10`+`version12`) plus the `RODAL` catalog table
 *     (created in `Tablas.js`, not by any numbered migration).
 *
 * Both repos declare `QR_TRAZABILIDAD_AES_KEY_HEX` / `QR_TRAZABILIDAD_HMAC_KEY_HEX`
 * under identical global names. Sharing one `vm` context would let the second
 * `runFile` silently overwrite the first repo's key material, making key drift —
 * the defect this whole capability exists to catch — structurally undetectable.
 * The two contexts below are therefore NEVER merged; only the ciphertext string
 * (and, in the resolution step, the already-decrypted-by-guias payload object,
 * which never leaves the guias context) crosses the boundary.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const { registerSpatialFunctions, cordovaSqlite } = require('./spatial-sqlite');

const trazabilidadRoot = path.resolve(__dirname, '..', '..');
const guiasRoot = path.resolve(trazabilidadRoot, '..', '..', 'movil_comaco_gde');

function runFile(context, root, relativePath) {
    vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, {
        filename: relativePath
    });
}

function guiasDisponible() {
    return fs.existsSync(guiasRoot) &&
        fs.existsSync(path.join(guiasRoot, 'www/js/Services/QrTrazabilidadService.js'));
}

function baseGlobals(extra = {}) {
    return {
        Date,
        Error,
        Promise,
        String,
        Number,
        Uint8Array,
        Object,
        JSON,
        Math,
        isFinite,
        isNaN,
        parseInt,
        encodeURIComponent,
        decodeURIComponent,
        escape,
        unescape,
        btoa,
        atob,
        crypto: webcrypto,
        navigator: {},
        console: { log() {}, error() {} },
        ...extra
    };
}

/**
 * Producer context: `movil_comaco`.
 *
 * Real `version8Esquema` schema (20 columns, `movil_comaco/www/js/Datos/migraciones/Versiones.js`)
 * applied verbatim so `DATOS_guardarQrTrazabilidadOrigen`'s `PRAGMA table_info` +
 * conditional `ALTER TABLE ... ADD COLUMN VIGENCIA_TIPO` path is genuinely exercised
 * (the column already exists in version8, so the ALTER branch is skipped for real,
 * not approximated).
 */
function crearContextoTrazabilidad() {
    const db = new DatabaseSync(':memory:');

    const migracionesContext = {};
    vm.createContext(migracionesContext);
    runFile(migracionesContext, trazabilidadRoot, 'www/js/Datos/migraciones/Versiones.js');
    const version8Esquema = vm.runInContext('version8Esquema', migracionesContext);
    for (const query of version8Esquema.queries) db.exec(query);

    let contadorIdUnico = 0;
    const context = baseGlobals({
        obtener_IDUNICO() {
            contadorIdUnico += 1;
            return contadorIdUnico;
        }
    });
    context.window = { sqlitePlugin: cordovaSqlite(db) };
    context.self = context;
    context.global = context;
    vm.createContext(context);

    runFile(context, trazabilidadRoot, 'www/js/jsrsasign-all-min.js');
    runFile(context, trazabilidadRoot, 'www/js/Services/QrTrazabilidadService.js');
    runFile(context, trazabilidadRoot, 'www/js/Datos/QrTrazabilidad.js');

    return { context, db };
}

/**
 * Consumer context: `movil_comaco_gde`.
 *
 * `GDE_GEOCERCA_RODAL` is built from the EXACT queries of migrations `version10`
 * and `version12`, filtered to the ones that touch `GDE_GEOCERCA_RODAL` (version12
 * also carries unrelated `GDE` table ALTERs that would fail here, since this
 * fixture database never creates `GDE`). The `RODAL` catalog table is extracted
 * verbatim, at load time, from `Datos/Tablas.js` — it is created there directly,
 * not by any numbered migration, so a migration-only fixture would silently omit it.
 */
function crearContextoGuias() {
    const db = new DatabaseSync(':memory:');
    registerSpatialFunctions(db);

    const migracionesContext = {};
    vm.createContext(migracionesContext);
    runFile(migracionesContext, guiasRoot, 'www/js/Datos/Migraciones/Versiones.js');
    const version10 = vm.runInContext('version10', migracionesContext);
    const version12 = vm.runInContext('version12', migracionesContext);
    const geocercaQueries = [...version10.queries, ...version12.queries]
        .filter(query => query.includes('GDE_GEOCERCA_RODAL'));
    for (const query of geocercaQueries) db.exec(query);

    const tablasSource = fs.readFileSync(path.join(guiasRoot, 'www/js/Datos/Tablas.js'), 'utf8');
    const rodalTableMatch = /CREATE TABLE IF NOT EXISTS RODAL\([^)]*\)/.exec(tablasSource);
    if (!rodalTableMatch) {
        throw new Error(
            'RODAL catalog table definition not found in movil_comaco_gde/www/js/Datos/Tablas.js — ' +
            'source may have changed; update the harness extraction pattern.'
        );
    }
    db.exec(rodalTableMatch[0]);

    const context = baseGlobals();
    context.window = { sqlitePlugin: cordovaSqlite(db) };
    context.self = context;
    context.global = context;
    vm.createContext(context);

    runFile(context, guiasRoot, 'www/js/jsrsasign-all-min.js');
    runFile(context, guiasRoot, 'www/js/Services/QrTrazabilidadService.js');
    runFile(context, guiasRoot, 'www/js/Datos/GeocercaRodal.js');
    runFile(context, guiasRoot, 'www/js/Servicios/GeocercaRodalService.js');

    return { context, db };
}

/**
 * Direct, OC-UNSCOPED query against the `RODAL` catalog table — the spec-mandated
 * discriminating assertion between true orphan geometry (0 rows for any OC) and an
 * OC-boundary collision (exactly 1 row, scoped to a different OC than the one tested).
 */
function consultarCatalogoSinOc(db, codigo) {
    return db.prepare(
        'SELECT EMPRESA, TIPO_DOCTO, NRO_OC FROM RODAL WHERE TRIM(UPPER(RODAL)) = ?'
    ).all(codigo);
}

function sembrarGeocercaRodal(db, { rolPredio, geometry, rodal, flagControl = 0 }) {
    db.prepare(
        'INSERT INTO GDE_GEOCERCA_RODAL (ROL_PREDIO, GEOCERCA, RODAL, FLAG_CONTROL) VALUES (?, ?, ?, ?)'
    ).run(rolPredio, JSON.stringify(geometry), rodal, flagControl);
}

function sembrarCatalogoRodal(db, { empresa, tipoDocto, numOrden, rodal, nombreRodal }) {
    db.prepare(
        'INSERT INTO RODAL (EMPRESA, TIPO_DOCTO, NRO_OC, RODAL, NOM_RODAL) VALUES (?, ?, ?, ?, ?)'
    ).run(empresa, tipoDocto, numOrden, rodal, nombreRodal);
}

function rectanguloGeoJson(lonMin, lonMax, latMin, latMax) {
    return {
        type: 'Polygon',
        coordinates: [[
            [lonMin, latMin],
            [lonMin, latMax],
            [lonMax, latMax],
            [lonMax, latMin],
            [lonMin, latMin]
        ]]
    };
}

const GDE_BASE = {
    GDE_COD_ORIGEN: 'ORI-014',
    GDE_ROL: '11101-25',
    GDE_ROL_COMUNA: 'CAUQUENES'
};

const OC_A = { empresa: 'FSA', tipoDocto: 'OCE', numOrden: 480512 };
const OC_B = { empresa: 'FSA', tipoDocto: 'OCE', numOrden: 480999 };

const GEOCERCAS = {
    A: { rolPredio: GDE_BASE.GDE_ROL, rodal: 'R01', geometry: rectanguloGeoJson(-72.210, -72.200, -36.110, -36.100) },
    B: { rolPredio: GDE_BASE.GDE_ROL, rodal: 'R02', geometry: rectanguloGeoJson(-72.190, -72.180, -36.110, -36.100) },
    C: { rolPredio: GDE_BASE.GDE_ROL, rodal: 'R03', geometry: rectanguloGeoJson(-72.206, -72.196, -36.108, -36.098) },
    D: { rolPredio: GDE_BASE.GDE_ROL, rodal: 'R99', geometry: rectanguloGeoJson(-72.170, -72.160, -36.110, -36.100) },
    E: { rolPredio: GDE_BASE.GDE_ROL, rodal: 'R77', geometry: rectanguloGeoJson(-72.150, -72.140, -36.110, -36.100) }
};

// R99 is intentionally absent from every OC — true catalog orphan.
const CATALOGO = [
    { ...OC_A, rodal: 'R01', nombreRodal: 'RODAL 01 QUILLAY' },
    { ...OC_A, rodal: 'R02', nombreRodal: 'RODAL 02 LAUREL' },
    { ...OC_A, rodal: 'R03', nombreRodal: 'RODAL 03 BOLDO' },
    { ...OC_B, rodal: 'R77', nombreRodal: 'RODAL 77 ROBLE' }
];

const PUNTOS = {
    happy: { latitud: -36.1085, longitud: -72.2085 },
    zeroMatch: { latitud: -36.3000, longitud: -72.3000 },
    orphan: { latitud: -36.1050, longitud: -72.1650 },
    ocBoundary: { latitud: -36.1050, longitud: -72.1450 },
    ambiguous: { latitud: -36.1020, longitud: -72.2020 }
};

module.exports = {
    crearContextoTrazabilidad,
    crearContextoGuias,
    consultarCatalogoSinOc,
    sembrarGeocercaRodal,
    sembrarCatalogoRodal,
    guiasDisponible,
    guiasRoot,
    GEOCERCAS,
    CATALOGO,
    PUNTOS,
    OC_A,
    OC_B,
    GDE_BASE
};
