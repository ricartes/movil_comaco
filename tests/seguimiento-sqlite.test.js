const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

const raiz = path.resolve(__dirname, '..');

function crearAdaptadorCordova(db) {
    function resultadoFilas(filas) {
        return {
            length: filas.length,
            item(indice) {
                return filas[indice];
            }
        };
    }

    return {
        openDatabase() {
            return {
                transaction(accion, error, exito) {
                    try {
                        db.exec('BEGIN TRANSACTION');
                        const transaccion = {
                            executeSql(sql, parametros, callbackExito, callbackError) {
                                const valores = Array.isArray(parametros) ? parametros : [];
                                try {
                                    const sentencia = db.prepare(sql);
                                    const consulta = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);
                                    let resultado;

                                    if (consulta) {
                                        const filas = sentencia.all(...valores);
                                        resultado = { rows: resultadoFilas(filas), rowsAffected: 0 };
                                    } else {
                                        const ejecucion = sentencia.run(...valores);
                                        resultado = {
                                            rows: resultadoFilas([]),
                                            rowsAffected: Number(ejecucion.changes),
                                            insertId: Number(ejecucion.lastInsertRowid)
                                        };
                                    }

                                    if (typeof callbackExito === 'function') {
                                        callbackExito(transaccion, resultado);
                                    }
                                } catch (detalle) {
                                    if (typeof callbackError === 'function') {
                                        callbackError(transaccion, detalle);
                                    }
                                    throw detalle;
                                }
                            }
                        };

                        accion(transaccion);
                        db.exec('COMMIT');
                        if (typeof exito === 'function') {
                            exito();
                        }
                    } catch (detalle) {
                        if (db.isTransaction) {
                            db.exec('ROLLBACK');
                        }
                        if (typeof error === 'function') {
                            error(detalle);
                        }
                    }
                }
            };
        }
    };
}

function cargarContexto(db, incluirTablas = false) {
    const contexto = {
        console,
        Date,
        Error,
        isFinite,
        isNaN,
        Math,
        Promise,
        String,
        Uint8Array,
        window: {
            crypto: crypto.webcrypto,
            sqlitePlugin: crearAdaptadorCordova(db)
        }
    };
    vm.createContext(contexto);

    if (incluirTablas) {
        vm.runInContext(
            fs.readFileSync(path.join(raiz, 'www/js/Datos/Tablas.js'), 'utf8'),
            contexto,
            { filename: 'Tablas.js' }
        );
    }

    vm.runInContext(
        fs.readFileSync(path.join(raiz, 'www/js/Datos/Seguimiento.js'), 'utf8'),
        contexto,
        { filename: 'Seguimiento.js' }
    );
    return contexto;
}

function crearGdeMinima(db) {
    db.exec('CREATE TABLE GDE (ID_UNICO_MOVIL TEXT, DATO_EXISTENTE TEXT)');
}

function columnas(db, tabla) {
    return db.prepare(`PRAGMA table_info(${tabla})`).all().map(fila => fila.name);
}

const UUID_SEGUIMIENTO_1 = '11111111-1111-4111-8111-111111111111';
const UUID_SEGUIMIENTO_2 = '22222222-2222-4222-8222-222222222222';
const UUID_POSICION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('instalación nueva crea el esquema real de seguimiento', async () => {
    const db = new DatabaseSync(':memory:');
    const contexto = cargarContexto(db, true);

    await contexto.Tablas_crear_tablas();

    assert.ok(columnas(db, 'GDE').includes('ID_UNICO_SEGUIMIENTO'));
    assert.deepEqual(columnas(db, 'SEGUIMIENTO_POSICION_PENDIENTE'), [
        'ID', 'UUID_POSICION', 'ID_UNICO_MOVIL_GDE', 'ID_UNICO_SEGUIMIENTO',
        'SECUENCIA_LOCAL', 'FECHA_DISPOSITIVO_UTC', 'LATITUD', 'LONGITUD',
        'PRECISION_METROS', 'VELOCIDAD_MPS', 'RUMBO_GRADOS', 'ALTITUD_METROS',
        'ES_UBICACION_SIMULADA', 'ORIGEN_CAPTURA', 'INTENTOS_ENVIO',
        'FECHA_ULTIMO_INTENTO_UTC', 'FECHA_CREACION_UTC'
    ]);
    const indice = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
        .get('IX_SEG_POS_PENDIENTE_SEGUIMIENTO_ID');
    assert.equal(indice.name, 'IX_SEG_POS_PENDIENTE_SEGUIMIENTO_ID');
    db.close();
});

test('base existente se migra dos veces sin perder datos', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    db.prepare('INSERT INTO GDE (ID_UNICO_MOVIL, DATO_EXISTENTE) VALUES (?, ?)').run('GUIA-1', 'preservado');
    const contexto = cargarContexto(db);

    await contexto.DATOS_inicializarSeguimientoSqlite();
    await contexto.DATOS_inicializarSeguimientoSqlite();

    assert.equal(columnas(db, 'GDE').filter(nombre => nombre === 'ID_UNICO_SEGUIMIENTO').length, 1);
    const guiaExistente = db.prepare('SELECT ID_UNICO_MOVIL, DATO_EXISTENTE FROM GDE').get();
    assert.equal(guiaExistente.ID_UNICO_MOVIL, 'GUIA-1');
    assert.equal(guiaExistente.DATO_EXISTENTE, 'preservado');
    db.close();
});

test('guarda una guía y acepta una respuesta antigua sin SEGUIMIENTOS', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    const contexto = cargarContexto(db);
    await contexto.DATOS_inicializarSeguimientoSqlite();
    db.prepare('INSERT INTO GDE (ID_UNICO_MOVIL) VALUES (?)').run('GUIA-1');

    await contexto.procesarSeguimientosRecibeGuiaV2([
        { ID_UNICO_MOVIL_GDE: ' GUIA-1 ', ID_UNICO_SEGUIMIENTO: ` ${UUID_SEGUIMIENTO_1} ` }
    ]);
    assert.equal(await contexto.obtenerIdSeguimientoGuia('GUIA-1'), UUID_SEGUIMIENTO_1);

    assert.equal(await contexto.procesarSeguimientosRecibeGuiaV2(null), 0);
    assert.equal(await contexto.obtenerIdSeguimientoGuia('GUIA-1'), UUID_SEGUIMIENTO_1);
    db.close();
});

test('correlaciona varias guías por ID aunque la respuesta venga en otro orden', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    const contexto = cargarContexto(db);
    await contexto.DATOS_inicializarSeguimientoSqlite();
    db.exec("INSERT INTO GDE (ID_UNICO_MOVIL) VALUES ('GUIA-1'), ('GUIA-2')");

    await contexto.procesarSeguimientosRecibeGuiaV2([
        { ID_UNICO_MOVIL_GDE: 'GUIA-2', ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_2 },
        { ID_UNICO_MOVIL_GDE: 'GUIA-1', ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_1 }
    ]);

    assert.equal(await contexto.obtenerIdSeguimientoGuia('GUIA-1'), UUID_SEGUIMIENTO_1);
    assert.equal(await contexto.obtenerIdSeguimientoGuia('GUIA-2'), UUID_SEGUIMIENTO_2);
    db.close();
});

test('rechaza UUID inválido y resultados duplicados para una guía', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    const contexto = cargarContexto(db);
    await contexto.DATOS_inicializarSeguimientoSqlite();
    db.prepare('INSERT INTO GDE (ID_UNICO_MOVIL) VALUES (?)').run('GUIA-1');

    await assert.rejects(
        contexto.procesarSeguimientosRecibeGuiaV2([
            { ID_UNICO_MOVIL_GDE: 'GUIA-1', ID_UNICO_SEGUIMIENTO: 'no-es-uuid' }
        ]),
        /formato UUID/
    );
    await assert.rejects(
        contexto.procesarSeguimientosRecibeGuiaV2([
            { ID_UNICO_MOVIL_GDE: 'GUIA-1', ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_1 },
            { ID_UNICO_MOVIL_GDE: 'guia-1', ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_2 }
        ]),
        /más de un seguimiento/
    );
    assert.equal(await contexto.obtenerIdSeguimientoGuia('GUIA-1'), null);
    db.close();
});

test('revierte todos los vínculos cuando falla una guía intermedia', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    const contexto = cargarContexto(db);
    await contexto.DATOS_inicializarSeguimientoSqlite();
    db.prepare('INSERT INTO GDE (ID_UNICO_MOVIL) VALUES (?)').run('GUIA-1');

    await assert.rejects(contexto.guardarIdsSeguimientoGuias([
        { ID_UNICO_MOVIL_GDE: 'GUIA-1', ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_1 },
        { ID_UNICO_MOVIL_GDE: 'GUIA-INEXISTENTE', ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_2 }
    ]), /No se encontró una única guía/);

    assert.equal(await contexto.obtenerIdSeguimientoGuia('GUIA-1'), null);
    db.close();
});

test('UUID_POSICION se crea una vez y el duplicado no genera otra fila', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    const contexto = cargarContexto(db);
    await contexto.DATOS_inicializarSeguimientoSqlite();
    const posicion = {
        ID_UNICO_MOVIL_GDE: 'GUIA-1',
        ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_1,
        SECUENCIA_LOCAL: 1,
        FECHA_DISPOSITIVO_UTC: '2026-07-14T12:00:00.000Z',
        LATITUD: -33.45,
        LONGITUD: -70.66,
        PRECISION_METROS: 5.2,
        ES_UBICACION_SIMULADA: false,
        ORIGEN_CAPTURA: 'GPS'
    };

    const insertada = await contexto.insertarPosicionSeguimientoPendiente(posicion);
    assert.equal(insertada.UUID_POSICION, posicion.UUID_POSICION);
    assert.match(posicion.UUID_POSICION, /^[0-9a-f-]{36}$/i);
    await assert.rejects(contexto.insertarPosicionSeguimientoPendiente(posicion), /UNIQUE/i);
    assert.equal(db.prepare('SELECT COUNT(*) cantidad FROM SEGUIMIENTO_POSICION_PENDIENTE').get().cantidad, 1);
    db.close();
});

test('inserción múltiple genera UUID distintos y revierte todo ante un fallo intermedio', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    const contexto = cargarContexto(db);
    await contexto.DATOS_inicializarSeguimientoSqlite();

    const base = {
        ID_UNICO_MOVIL_GDE: 'GUIA-BASE',
        ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_1,
        FECHA_DISPOSITIVO_UTC: '2026-07-14T12:00:00Z',
        LATITUD: -33.45,
        LONGITUD: -70.66
    };
    await contexto.insertarPosicionSeguimientoPendiente({ ...base, UUID_POSICION });

    const primera = { ...base, ID_UNICO_MOVIL_GDE: 'GUIA-1' };
    const segunda = { ...base, ID_UNICO_MOVIL_GDE: 'GUIA-2', UUID_POSICION };
    await assert.rejects(
        contexto.insertarPosicionesSeguimientoPendientes([primera, segunda]),
        /UNIQUE/i
    );

    assert.ok(primera.UUID_POSICION);
    assert.notEqual(primera.UUID_POSICION, UUID_POSICION);
    assert.equal(db.prepare('SELECT COUNT(*) cantidad FROM SEGUIMIENTO_POSICION_PENDIENTE').get().cantidad, 1);
    db.close();
});

test('posiciones pendientes permanecen disponibles tras reiniciar el contexto de la app', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    const primerContexto = cargarContexto(db);
    await primerContexto.DATOS_inicializarSeguimientoSqlite();

    const posiciones = [
        {
            ID_UNICO_MOVIL_GDE: 'GUIA-1',
            ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_1,
            FECHA_DISPOSITIVO_UTC: '2026-07-14T12:00:00Z',
            LATITUD: -33.45,
            LONGITUD: -70.66
        },
        {
            ID_UNICO_MOVIL_GDE: 'GUIA-2',
            ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_1,
            FECHA_DISPOSITIVO_UTC: '2026-07-14T12:00:01Z',
            LATITUD: -33.46,
            LONGITUD: -70.67
        }
    ];
    const insertadas = await primerContexto.insertarPosicionesSeguimientoPendientes(posiciones);
    assert.equal(insertadas.length, 2);
    assert.notEqual(insertadas[0].UUID_POSICION, insertadas[1].UUID_POSICION);

    const contextoReiniciado = cargarContexto(db);
    const recuperadas = await contextoReiniciado.listarPosicionesSeguimientoPendientes(UUID_SEGUIMIENTO_1, 100);
    assert.equal(recuperadas.length, 2);
    assert.deepEqual(
        Array.from(recuperadas, posicion => posicion.UUID_POSICION),
        Array.from(insertadas, posicion => posicion.UUID_POSICION)
    );
    db.close();
});

test('repositorio lista, registra intentos y elimina posiciones por UUID en lote', async () => {
    const db = new DatabaseSync(':memory:');
    crearGdeMinima(db);
    const contexto = cargarContexto(db);
    await contexto.DATOS_inicializarSeguimientoSqlite();

    await contexto.insertarPosicionSeguimientoPendiente({
        UUID_POSICION,
        ID_UNICO_MOVIL_GDE: 'GUIA-1',
        ID_UNICO_SEGUIMIENTO: UUID_SEGUIMIENTO_1,
        FECHA_DISPOSITIVO_UTC: '2026-07-14T12:00:00Z',
        LATITUD: -33.45,
        LONGITUD: -70.66
    });

    assert.deepEqual(Array.from(await contexto.listarSeguimientosConPosicionesPendientes()), [UUID_SEGUIMIENTO_1]);
    const posiciones = await contexto.listarPosicionesSeguimientoPendientes(UUID_SEGUIMIENTO_1, 200);
    assert.equal(posiciones.length, 1);
    assert.equal(posiciones[0].INTENTOS_ENVIO, 0);

    assert.equal(await contexto.registrarIntentoEnvioPosiciones([UUID_POSICION], '2026-07-14T12:05:00Z'), 1);
    const intento = db.prepare(
        'SELECT INTENTOS_ENVIO, FECHA_ULTIMO_INTENTO_UTC FROM SEGUIMIENTO_POSICION_PENDIENTE'
    ).get();
    assert.equal(intento.INTENTOS_ENVIO, 1);
    assert.equal(intento.FECHA_ULTIMO_INTENTO_UTC, '2026-07-14T12:05:00Z');
    assert.equal(await contexto.eliminarPosicionesSeguimientoPorUuid([UUID_POSICION]), 1);
    assert.equal(db.prepare('SELECT COUNT(*) cantidad FROM SEGUIMIENTO_POSICION_PENDIENTE').get().cantidad, 0);
    db.close();
});
