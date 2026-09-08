const assert = require('node:assert/strict');
const test = require('node:test');

const {
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
} = require('./support/qr-e2e-harness');
const fs = require('node:fs');
const path = require('node:path');

const skip = guiasDisponible()
    ? false
    : 'movil_comaco_gde sibling repo not found at ../../movil_comaco_gde — skipping cross-repo e2e scenarios';

function crearGde(idUnicoMovil) {
    return { ID_UNICO_MOVIL: idUnicoMovil, ...GDE_BASE };
}

function sembrarTodasLasGeocercas(db) {
    for (const geocerca of Object.values(GEOCERCAS)) {
        sembrarGeocercaRodal(db, geocerca);
    }
}

function sembrarCatalogoCompleto(db) {
    for (const entrada of CATALOGO) {
        sembrarCatalogoRodal(db, entrada);
    }
}

async function generarYDecodificar(traz, guias, idUnicoMovil, punto) {
    const gde = crearGde(idUnicoMovil);
    const coordenadaCarga = { latitud: punto.latitud, longitud: punto.longitud, accuracy: 5 };

    const resultado = await traz.context.generarQrTrazabilidadPorPuntoCarga(gde, coordenadaCarga);
    assert.equal(resultado.ok, true, 'el productor debe generar el QR correctamente');

    const textoQr = resultado.qr.PAYLOAD_ENCRIPTADO;
    assert.equal(typeof textoQr, 'string');
    assert.equal(textoQr.indexOf('GFEQR1:'), 0, 'el ciphertext real debe llevar el prefijo GFEQR1:');

    const validacion = guias.context.validarTextoQrTrazabilidad(textoQr);
    assert.equal(validacion.ok, true, `la decodificacion real debe tener exito: ${validacion.mensaje || ''}`);

    return { gde, coordenadaCarga, textoQr, payload: validacion.payload };
}

test(
    'ciphertext survives the real round trip and decoded coordinates match the values the producer encoded',
    { skip },
    async () => {
        const traz = crearContextoTrazabilidad();
        const guias = crearContextoGuias();

        const { coordenadaCarga, payload } = await generarYDecodificar(traz, guias, 'GDE_E2E_ROUNDTRIP', PUNTOS.happy);

        assert.equal(payload.latitudCarga, coordenadaCarga.latitud);
        assert.equal(payload.longitudCarga, coordenadaCarga.longitud);
    }
);

test(
    'both trazabilidad and guias use the unmodified, matching production AES/HMAC constants',
    { skip },
    () => {
        const traz = crearContextoTrazabilidad();
        const guias = crearContextoGuias();

        assert.equal(
            traz.context.QR_TRAZABILIDAD_AES_KEY_HEX,
            guias.context.QR_TRAZABILIDAD_AES_KEY_HEX,
            'both apps must share the same unmodified production AES key'
        );
        assert.equal(
            traz.context.QR_TRAZABILIDAD_HMAC_KEY_HEX,
            guias.context.QR_TRAZABILIDAD_HMAC_KEY_HEX,
            'both apps must share the same unmodified production HMAC key'
        );
        assert.equal(typeof traz.context.QR_TRAZABILIDAD_AES_KEY_HEX, 'string');
        assert.notEqual(traz.context.QR_TRAZABILIDAD_AES_KEY_HEX.length, 0);
    }
);

test('happy path: coordinate inside exactly one rodal resolves to RESUELTO', { skip }, async () => {
    const traz = crearContextoTrazabilidad();
    const guias = crearContextoGuias();
    sembrarTodasLasGeocercas(guias.db);
    sembrarCatalogoCompleto(guias.db);

    const { payload } = await generarYDecodificar(traz, guias, 'GDE_E2E_HAPPY', PUNTOS.happy);

    const resolucion = await guias.context.resolverRodalPorPuntoQr(payload, payload.rolOrigen, OC_A);

    assert.equal(resolucion.estado, 'RESUELTO');
    assert.equal(resolucion.rodal, 'R01');
    assert.equal(resolucion.nombreRodal, 'RODAL 01 QUILLAY');
});

test('zero-match: coordinate outside every geometry resolves to SIN_COINCIDENCIA', { skip }, async () => {
    const traz = crearContextoTrazabilidad();
    const guias = crearContextoGuias();
    sembrarTodasLasGeocercas(guias.db);
    sembrarCatalogoCompleto(guias.db);

    const { payload } = await generarYDecodificar(traz, guias, 'GDE_E2E_ZERO', PUNTOS.zeroMatch);

    const resolucion = await guias.context.resolverRodalPorPuntoQr(payload, payload.rolOrigen, OC_A);

    assert.equal(resolucion.estado, 'SIN_COINCIDENCIA');
    assert.equal(resolucion.rodal, null);
    // `candidatos` is an array constructed inside the guias vm context, so its
    // prototype identity differs from this realm's Array.prototype; spreading it
    // normalizes to a real Array here before the structural comparison.
    assert.deepEqual([...resolucion.candidatos], []);
});

test(
    'true orphan geometry: GEOMETRIA_HUERFANA AND zero catalog rows for that code under any OC',
    { skip },
    async () => {
        const traz = crearContextoTrazabilidad();
        const guias = crearContextoGuias();
        // Own fixture: only the orphan geocerca is seeded, and R99 is never added to
        // the RODAL catalog under any OC — this is the genuine root cause.
        sembrarGeocercaRodal(guias.db, GEOCERCAS.D);

        const { payload } = await generarYDecodificar(traz, guias, 'GDE_E2E_ORPHAN', PUNTOS.orphan);

        const resolucion = await guias.context.resolverRodalPorPuntoQr(payload, payload.rolOrigen, OC_A);
        assert.equal(resolucion.estado, 'GEOMETRIA_HUERFANA');

        const filasCatalogo = consultarCatalogoSinOc(guias.db, 'R99');
        assert.equal(filasCatalogo.length, 0, 'true orphan: zero catalog rows under any OC');
    }
);

test(
    'OC-boundary collision: GEOMETRIA_HUERFANA under OC_A AND exactly one catalog row scoped to a different OC',
    { skip },
    async () => {
        const traz = crearContextoTrazabilidad();
        const guias = crearContextoGuias();
        // Own separate fixture: the boundary geocerca plus its catalog row registered
        // ONLY under OC_B — the genuine root cause distinguishing it from a true orphan.
        sembrarGeocercaRodal(guias.db, GEOCERCAS.E);
        sembrarCatalogoRodal(guias.db, CATALOGO.find(entrada => entrada.rodal === 'R77'));

        const { payload } = await generarYDecodificar(traz, guias, 'GDE_E2E_OC_BOUNDARY', PUNTOS.ocBoundary);

        const resolucionBajoOcA = await guias.context.resolverRodalPorPuntoQr(payload, payload.rolOrigen, OC_A);
        assert.equal(resolucionBajoOcA.estado, 'GEOMETRIA_HUERFANA');

        const filasCatalogo = consultarCatalogoSinOc(guias.db, 'R77');
        assert.equal(filasCatalogo.length, 1, 'OC boundary: exactly one catalog row, scoped to a different OC');
        const fila = filasCatalogo[0];
        assert.notDeepEqual(
            { EMPRESA: fila.EMPRESA, TIPO_DOCTO: fila.TIPO_DOCTO, NRO_OC: fila.NRO_OC },
            { EMPRESA: OC_A.empresa, TIPO_DOCTO: OC_A.tipoDocto, NRO_OC: OC_A.numOrden },
            'the catalog row must be scoped to an OC different from the one under test'
        );

        // Extra assertion (retained from the first design draft): the resolver
        // genuinely honours OC scope, not just the fixture shape.
        const resolucionBajoOcB = await guias.context.resolverRodalPorPuntoQr(payload, payload.rolOrigen, OC_B);
        assert.equal(resolucionBajoOcB.estado, 'RESUELTO');
        assert.equal(resolucionBajoOcB.rodal, 'R77');
    }
);

test(
    'ambiguous: coordinate inside two distinct rodal geometries resolves to AMBIGUO with both candidates',
    { skip },
    async () => {
        const traz = crearContextoTrazabilidad();
        const guias = crearContextoGuias();
        sembrarTodasLasGeocercas(guias.db);
        sembrarCatalogoCompleto(guias.db);

        const { payload } = await generarYDecodificar(traz, guias, 'GDE_E2E_AMBIGUOUS', PUNTOS.ambiguous);

        const resolucion = await guias.context.resolverRodalPorPuntoQr(payload, payload.rolOrigen, OC_A);

        assert.equal(resolucion.estado, 'AMBIGUO');
        assert.equal(resolucion.rodal, null);
        assert.deepEqual([...resolucion.candidatos].sort(), ['R01', 'R03']);
    }
);

test(
    'estado literals used across all scenarios match GeocercaRodalService.js exactly',
    { skip },
    () => {
        const guias = crearContextoGuias();
        const source = fs.readFileSync(
            path.join(guiasRoot, 'www/js/Servicios/GeocercaRodalService.js'),
            'utf8'
        );

        for (const estado of ['RESUELTO', 'SIN_COINCIDENCIA', 'AMBIGUO', 'GEOMETRIA_HUERFANA']) {
            assert.ok(
                source.includes(`estado: "${estado}"`),
                `resolverRodalPorPuntoQr must literally emit estado "${estado}"`
            );
        }
        assert.equal(typeof guias.context.resolverRodalPorPuntoQr, 'function');
    }
);

test(
    'RODAL.NRO_OC is declared INTEGER and OC fixtures bind JS Numbers matching that affinity',
    { skip },
    () => {
        const guias = crearContextoGuias();

        const columnas = guias.db.prepare('PRAGMA table_info(RODAL)').all();
        const columnaNroOc = columnas.find(columna => columna.name === 'NRO_OC');
        assert.ok(columnaNroOc, 'RODAL.NRO_OC column must exist');
        assert.equal(columnaNroOc.type, 'INTEGER');

        assert.equal(typeof OC_A.numOrden, 'number');
        assert.equal(typeof OC_B.numOrden, 'number');

        sembrarCatalogoRodal(guias.db, CATALOGO[0]);
        const fila = guias.db.prepare(
            'SELECT NRO_OC, typeof(NRO_OC) AS tipoAlmacenado FROM RODAL WHERE RODAL = ?'
        ).get(CATALOGO[0].rodal);

        assert.equal(fila.NRO_OC, OC_A.numOrden);
        assert.equal(typeof fila.NRO_OC, 'number');
        assert.equal(fila.tipoAlmacenado, 'integer');
    }
);
