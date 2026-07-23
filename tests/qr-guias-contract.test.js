const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const trazabilidadRoot = path.resolve(__dirname, '..');
const guiasRoot = path.resolve(trazabilidadRoot, '..', '..', 'movil_comaco_gde');

function runFile(context, root, relativePath) {
    vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, {
        filename: relativePath
    });
}

function cryptoContext(extra = {}) {
    const context = {
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
    context.window = context;
    context.self = context;
    context.global = context;
    vm.createContext(context);
    runFile(context, trazabilidadRoot, 'www/js/jsrsasign-all-min.js');
    runFile(context, trazabilidadRoot, 'www/js/Services/QrTrazabilidadService.js');
    return context;
}

function rowsResult(rows) {
    return { length: rows.length, item(index) { return rows[index]; } };
}

function cordovaSqlite(db) {
    return {
        openDatabase() {
            return {
                transaction(work, onError, onSuccess) {
                    try {
                        db.exec('BEGIN TRANSACTION');
                        const tx = {
                            executeSql(sql, params, success, failure) {
                                try {
                                    const statement = db.prepare(sql);
                                    const values = params || [];
                                    const isQuery = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);
                                    let result;
                                    if (isQuery) {
                                        result = { rows: rowsResult(statement.all(...values)), rowsAffected: 0 };
                                    } else {
                                        const executed = statement.run(...values);
                                        result = {
                                            rows: rowsResult([]),
                                            rowsAffected: Number(executed.changes),
                                            insertId: Number(executed.lastInsertRowid)
                                        };
                                    }
                                    if (success) success(tx, result);
                                } catch (error) {
                                    if (failure) failure(tx, error);
                                    throw error;
                                }
                            }
                        };
                        work(tx);
                        db.exec('COMMIT');
                        if (onSuccess) onSuccess();
                    } catch (error) {
                        if (db.isTransaction) db.exec('ROLLBACK');
                        if (onError) onError(error);
                    }
                }
            };
        }
    };
}

function createQrSchema(db) {
    db.exec(`CREATE TABLE QR_TRAZABILIDAD_ORIGEN (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        QR_ID TEXT NOT NULL UNIQUE,
        ID_UNICO_MOVIL_GDE TEXT NOT NULL UNIQUE,
        ESTADO TEXT NOT NULL,
        LATITUD_CARGA REAL,
        LONGITUD_CARGA REAL,
        ASOCIACION_ID TEXT,
        ID_UNICO_MOVIL_GDE_ASOCIADO TEXT,
        FECHA_VALIDACION_GDE TEXT,
        FECHA_LECTURA_ASOCIACION TEXT,
        QR_RETORNO_ENCRIPTADO TEXT,
        DATOS_RETORNO TEXT,
        RESULTADO_VALIDACION_GDE TEXT,
        VALIDADO_GEOCERCA INTEGER,
        FLAG_CONTROL_GDE INTEGER,
        ROL_PREDIO_VALIDADO TEXT,
        RODAL_VALIDADO TEXT,
        SECCION_VALIDADA TEXT,
        AEF_VALIDADO TEXT,
        PM_VALIDADO TEXT,
        LIBERACION_ID TEXT,
        FECHA_LIBERACION_GDE TEXT,
        FECHA_LECTURA_LIBERACION TEXT
    )`);
    db.exec(`CREATE TABLE QR_TRAZABILIDAD_EVENTO_GDE (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        EVENTO_ID TEXT NOT NULL UNIQUE,
        TIPO_EVENTO TEXT NOT NULL,
        QR_ID_ORIGEN TEXT NOT NULL,
        ID_UNICO_MOVIL_TRAZABILIDAD TEXT NOT NULL,
        ID_UNICO_MOVIL_GDE TEXT NOT NULL,
        ASOCIACION_ID TEXT NOT NULL,
        LIBERACION_ID TEXT,
        TEXTO_QR TEXT NOT NULL,
        RESULTADO TEXT,
        VALIDADO_GEOCERCA INTEGER,
        FLAG_CONTROL INTEGER,
        ROL_PREDIO TEXT,
        RODAL TEXT,
        SECCION TEXT,
        AEF TEXT,
        PM TEXT,
        FECHA_EVENTO_ORIGEN TEXT NOT NULL,
        FECHA_LECTURA_LOCAL TEXT NOT NULL,
        ESTADO_EVENTO TEXT NOT NULL
    )`);
}

function associationPayload(overrides = {}) {
    return {
        v: 1,
        tipo: 'QR_ASOCIACION_BORRADOR_GDE',
        asociacionId: 'assoc-1',
        qrIdOrigen: 'qr-1',
        idUnicoMovilTrazabilidad: 'viaje-1',
        idUnicoMovilGde: 'gde-1',
        fechaValidacion: '2026-07-22T12:00:00.000Z',
        rolPredio: 'ROL-1',
        rodal: 'R01',
        seccion: null,
        aef: 'AEF-1',
        pm: 'PM-1',
        latitudCarga: -36.1,
        longitudCarga: -72.2,
        validadoGeocerca: 1,
        flagControl: 0,
        resultado: 'VALIDADO_GEOCERCA',
        ...overrides
    };
}

test('migraciÃ³n 13 de GuÃ­as crea referencias y auditorÃ­a de asociaciones', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE GDE (ID_UNICO_MOVIL TEXT)');
    const context = {};
    vm.createContext(context);
    runFile(context, guiasRoot, 'www/js/Datos/Migraciones/Versiones.js');
    const migration = vm.runInContext('version13', context);

    for (const sql of migration.queries) db.exec(sql);

    const gdeColumns = db.prepare('PRAGMA table_info(GDE)').all().map(row => row.name);
    const auditColumns = db.prepare('PRAGMA table_info(QR_TRAZABILIDAD_ASOCIACION_GDE)').all().map(row => row.name);
    assert.equal(migration.versionNumber, 13);
    assert.equal(gdeColumns.includes('QR_TRAZABILIDAD_RESULTADO'), true);
    assert.equal(gdeColumns.includes('QR_ASOCIACION_ESTADO'), true);
    assert.equal(auditColumns.includes('QR_LIBERACION_TEXTO'), true);
    assert.equal(auditColumns.includes('FECHA_LIBERACION_LOCAL'), true);
});

test('GuÃ­as y Trazabilidad comparten el contrato cifrado de asociaciÃ³n y liberaciÃ³n', async () => {
    const context = cryptoContext({
        QR_TRAZABILIDAD_GENERAR_RETORNO_HABILITADO: true,
        QR_TRAZABILIDAD_ALG: 'AES-256-CBC-HS256',
        QR_ASOCIACION_ESTADO_ACTIVA: 'ACTIVA',
        QR_ASOCIACION_ESTADO_PENDIENTE_LIBERACION: 'PENDIENTE_LIBERACION',
        async DATOS_obtenerAsociacionQrActivaPorGde() { return null; },
        async DATOS_crearAsociacionQrGde(value) { return { ...value, ESTADO: 'ACTIVA' }; },
        async DATOS_solicitarLiberacionQrGde(id, value) { return { ...context.asociacionGenerada, ...value, ESTADO: 'PENDIENTE_LIBERACION' }; }
    });
    runFile(context, guiasRoot, 'www/js/Services/QrAsociacionGdeService.js');
    runFile(context, trazabilidadRoot, 'www/js/Services/QrCryptoService.js');

    const association = await context.generarORecuperarAsociacionQrGde(
        { ID_UNICO_MOVIL: 'gde-1' },
        { qrId: 'qr-1', idUnicoMovil: 'viaje-1', latitudCarga: -36.1, longitudCarga: -72.2, rolOrigen: 'ORIGEN-1' },
        {
            validado: 0,
            FLAG_CONTROL: 1,
            resultado: 'PERMITIDO_CON_ADVERTENCIA',
            fechaValidacion: '2026-07-22T12:00:00.000Z',
            ROL_PREDIO: 'ROL-1',
            RODAL: 'R01',
            SECCION: null,
            AEF: 'AEF-1',
            PM: 'PM-1',
            textoQrOrigen: 'GFEQR1:origen'
        }
    );
    context.asociacionGenerada = association;

    assert.match(association.QR_ASOCIACION_TEXTO, /^GFEQRRET1:/);
    const decodedAssociation = context.desencriptarQrGuias(association.QR_ASOCIACION_TEXTO);
    assert.equal(decodedAssociation.idUnicoMovilGde, 'gde-1');
    assert.equal(decodedAssociation.validadoGeocerca, 0);
    assert.equal(decodedAssociation.flagControl, 1);
    assert.equal(decodedAssociation.resultado, 'PERMITIDO_CON_ADVERTENCIA');

    const liberation = await context.generarORecuperarLiberacionQrGde(
        { ID_UNICO_MOVIL: 'gde-1', GDE_ESTADO_MOVIL: 'B' },
        association
    );
    assert.match(liberation.QR_LIBERACION_TEXTO, /^GFEQRLIB1:/);
    const decodedLiberation = context.desencriptarQrGuias(liberation.QR_LIBERACION_TEXTO);
    assert.equal(decodedLiberation.asociacionId, association.ASOCIACION_ID);
    assert.equal(decodedLiberation.resultado, 'BORRADOR_DESCARTADO');

    const altered = association.QR_ASOCIACION_TEXTO.slice(0, -1) +
        (association.QR_ASOCIACION_TEXTO.endsWith('A') ? 'B' : 'A');
    assert.throws(() => context.desencriptarQrGuias(altered), /daÃ±ado|alterado/i);
    assert.throws(() => context.desencriptarQrGuias('GFEQR1:origen'), /confirmaci.n de Gu.as/i);
});

test('SQLite asocia, es idempotente, bloquea otra asociaciÃ³n, libera y conserva historial', async () => {
    const db = new DatabaseSync(':memory:');
    createQrSchema(db);
    db.prepare(`INSERT INTO QR_TRAZABILIDAD_ORIGEN
        (QR_ID, ID_UNICO_MOVIL_GDE, ESTADO, LATITUD_CARGA, LONGITUD_CARGA)
        VALUES (?, ?, ?, ?, ?)`)
        .run('qr-1', 'viaje-1', 'PENDIENTE_VALIDACION', -36.1, -72.2);

    const context = cryptoContext({ window: { sqlitePlugin: cordovaSqlite(db) } });
    context.window = { sqlitePlugin: cordovaSqlite(db) };
    runFile(context, trazabilidadRoot, 'www/js/Datos/QrTrazabilidad.js');
    runFile(context, trazabilidadRoot, 'www/js/Services/QrValidacionOrigenService.js');

    const first = associationPayload();
    const associated = await context.procesarQrGuiasParaOrigen(
        { QR_ID: 'qr-1', ID_UNICO_MOVIL_GDE: 'viaje-1', ESTADO: 'PENDIENTE_VALIDACION', LATITUD_CARGA: -36.1, LONGITUD_CARGA: -72.2 },
        'ignored'
    ).catch(() => null);
    assert.equal(associated, null, 'el servicio exige un QR cifrado');

    const result = await context.DATOS_procesarAsociacionQrGde(first, 'GFEQRRET1:cipher');
    assert.equal(result.estado, 'ASOCIADO');
    assert.equal(db.prepare('SELECT ESTADO FROM QR_TRAZABILIDAD_ORIGEN').get().ESTADO, 'ASOCIADO_BORRADOR_GDE');

    const duplicate = await context.DATOS_procesarAsociacionQrGde(first, 'GFEQRRET1:cipher');
    assert.equal(duplicate.estado, 'YA_ASOCIADO');
    assert.equal(db.prepare("SELECT COUNT(*) count FROM QR_TRAZABILIDAD_EVENTO_GDE WHERE TIPO_EVENTO='ASOCIACION'").get().count, 1);

    await assert.rejects(
        context.DATOS_procesarAsociacionQrGde(associationPayload({ asociacionId: 'assoc-2', idUnicoMovilGde: 'gde-2' }), 'otro'),
        /otro borrador/i
    );

    const liberation = {
        tipo: 'QR_LIBERACION_BORRADOR_GDE',
        liberacionId: 'lib-1',
        asociacionId: 'assoc-1',
        qrIdOrigen: 'qr-1',
        idUnicoMovilTrazabilidad: 'viaje-1',
        idUnicoMovilGde: 'gde-1',
        fechaLiberacion: '2026-07-22T13:00:00.000Z',
        resultado: 'BORRADOR_DESCARTADO'
    };
    const released = await context.DATOS_procesarLiberacionQrGde(liberation, 'GFEQRLIB1:cipher');
    assert.equal(released.estado, 'LIBERADO');
    assert.equal(db.prepare('SELECT ESTADO FROM QR_TRAZABILIDAD_ORIGEN').get().ESTADO, 'PENDIENTE_VALIDACION');

    const duplicateRelease = await context.DATOS_procesarLiberacionQrGde(liberation, 'GFEQRLIB1:cipher');
    assert.equal(duplicateRelease.estado, 'YA_LIBERADO');

    const second = associationPayload({ asociacionId: 'assoc-2', idUnicoMovilGde: 'gde-2' });
    const reused = await context.DATOS_procesarAsociacionQrGde(second, 'GFEQRRET1:cipher2');
    assert.equal(reused.estado, 'ASOCIADO');
    assert.equal(db.prepare("SELECT COUNT(*) count FROM QR_TRAZABILIDAD_EVENTO_GDE WHERE TIPO_EVENTO='ASOCIACION'").get().count, 2);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM QR_TRAZABILIDAD_EVENTO_GDE WHERE TIPO_EVENTO='LIBERACION'").get().count, 1);
});
