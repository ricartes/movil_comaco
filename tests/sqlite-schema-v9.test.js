const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');

function rowsResult(rows) {
    return {
        length: rows.length,
        item(index) {
            return rows[index];
        }
    };
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
                                    const values = (params || []).map(value =>
                                        value instanceof Date ? value.toISOString() : value
                                    );
                                    const statement = db.prepare(sql);
                                    const query = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);
                                    let result;
                                    if (query) {
                                        result = { rows: rowsResult(statement.all(...values)), rowsAffected: 0 };
                                    } else {
                                        const executed = statement.run(...values);
                                        result = {
                                            rows: rowsResult([]),
                                            rowsAffected: Number(executed.changes),
                                            insertId: Number(executed.lastInsertRowid)
                                        };
                                    }
                                    if (typeof success === 'function') success(tx, result);
                                } catch (error) {
                                    if (typeof failure === 'function') failure(tx, error);
                                    throw error;
                                }
                            }
                        };
                        work(tx);
                        db.exec('COMMIT');
                        if (typeof onSuccess === 'function') onSuccess();
                    } catch (error) {
                        if (db.isTransaction) db.exec('ROLLBACK');
                        if (typeof onError === 'function') onError(error);
                    }
                }
            };
        }
    };
}

function loadContext(db) {
    const context = {
        Date,
        Error,
        Promise,
        String,
        console: { error() {}, log() {} },
        window: { sqlitePlugin: cordovaSqlite(db) },
        DATOS_inicializarSeguimientoSqlite() {
            return Promise.resolve();
        }
    };
    vm.createContext(context);
    for (const file of [
        'www/js/Datos/Tablas.js',
        'www/js/Datos/migraciones/Versiones.js',
        'www/js/Datos/migraciones/Tablas.js',
        'www/js/Datos/migraciones/Funciones.js',
        'www/js/Services/Migracion.js'
    ]) {
        vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
    }
    return context;
}

function columns(db, table) {
    return db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
}

function createVersion8Database(db, withServerUserColumn) {
    db.exec(`CREATE TABLE USUARIO (
        USU_RUT INTEGER PRIMARY KEY,
        USU_USUARIO_SISTEMA TEXT${withServerUserColumn ? ', USU_ID_SERVIDOR INTEGER' : ''}
    )`);
    db.exec('CREATE TABLE version_history(versionNumber INTEGER PRIMARY KEY NOT NULL, migratedAt DATE)');
    db.exec(`CREATE TABLE QR_TRAZABILIDAD_ORIGEN (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        QR_ID TEXT NOT NULL UNIQUE,
        ID_UNICO_MOVIL_GDE TEXT NOT NULL UNIQUE
    )`);
    for (let version = 1; version <= 8; version++) {
        db.prepare('INSERT INTO version_history(versionNumber,migratedAt) VALUES(?,?)')
            .run(version, '2026-01-01T00:00:00.000Z');
    }
}

function maxVersion(db) {
    return Number(db.prepare('SELECT MAX(versionNumber) value FROM version_history').get().value || 0);
}

test('base nueva crea USUARIO sin la columna base y la obtiene mediante migraciÃ³n 9', async () => {
    const db = new DatabaseSync(':memory:');
    const context = loadContext(db);

    await context.Tablas_crear_tablas();
    assert.equal(columns(db, 'USUARIO').includes('USU_ID_SERVIDOR'), false);

    await context.comprobarActualizarEsquema();
    assert.equal(columns(db, 'USUARIO').filter(name => name === 'USU_ID_SERVIDOR').length, 1);
    assert.equal(maxVersion(db), 10);
    assert.equal(columns(db, 'QR_TRAZABILIDAD_ORIGEN').includes('ASOCIACION_ID'), true);
    assert.equal(columns(db, 'QR_TRAZABILIDAD_EVENTO_GDE').includes('LIBERACION_ID'), true);
});

test('base versiÃ³n 8 sin columna ejecuta ALTER y registra versiÃ³n 9', async () => {
    const db = new DatabaseSync(':memory:');
    createVersion8Database(db, false);
    const context = loadContext(db);

    await context.comprobarActualizarEsquema();

    assert.equal(columns(db, 'USUARIO').includes('USU_ID_SERVIDOR'), true);
    assert.equal(maxVersion(db), 10);
    assert.equal(columns(db, 'QR_TRAZABILIDAD_ORIGEN').includes('ID_UNICO_MOVIL_GDE_ASOCIADO'), true);
});

test('base versiÃ³n 8 con columna previa marca versiÃ³n 9 sin repetir ALTER', async () => {
    const db = new DatabaseSync(':memory:');
    createVersion8Database(db, true);
    const context = loadContext(db);

    await context.comprobarActualizarEsquema();

    assert.equal(columns(db, 'USUARIO').filter(name => name === 'USU_ID_SERVIDOR').length, 1);
    assert.equal(maxVersion(db), 10);
});

test('base ya actualizada a versiÃ³n 9 no vuelve a ejecutar la migraciÃ³n', async () => {
    const db = new DatabaseSync(':memory:');
    createVersion8Database(db, true);
    db.prepare('INSERT INTO version_history(versionNumber,migratedAt) VALUES(9,?)')
        .run('2026-01-02T00:00:00.000Z');
    const context = loadContext(db);

    await context.comprobarActualizarEsquema();

    assert.equal(columns(db, 'USUARIO').filter(name => name === 'USU_ID_SERVIDOR').length, 1);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM version_history').get().count, 10);
    assert.equal(maxVersion(db), 10);
});

test('inicializaciÃ³n repetida conserva una sola aplicaciÃ³n de versiÃ³n 9', async () => {
    const db = new DatabaseSync(':memory:');
    createVersion8Database(db, false);
    const context = loadContext(db);

    await context.comprobarActualizarEsquema();
    await context.comprobarActualizarEsquema();

    assert.equal(columns(db, 'USUARIO').filter(name => name === 'USU_ID_SERVIDOR').length, 1);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM version_history WHERE versionNumber=9').get().count, 1);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM version_history WHERE versionNumber=10').get().count, 1);
});

test('fallo SQL real revierte la migraciÃ³n y no registra versiÃ³n 9', async () => {
    const db = new DatabaseSync(':memory:');
    createVersion8Database(db, false);
    const context = loadContext(db);
    context.version9Esquema.queries[0] =
        'ALTER TABLE TABLA_INEXISTENTE ADD COLUMN USU_ID_SERVIDOR INTEGER';

    await assert.rejects(context.comprobarActualizarEsquema());

    assert.equal(columns(db, 'USUARIO').includes('USU_ID_SERVIDOR'), false);
    assert.equal(maxVersion(db), 8);
});
