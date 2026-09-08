const assert = require('node:assert/strict');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');

const {
    spatialContains,
    registerSpatialFunctions,
    cordovaSqlite,
    crearBaseSqlite
} = require('./support/spatial-sqlite');

const SQUARE = JSON.stringify({
    type: 'Polygon',
    coordinates: [
        [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]
    ]
});

const SQUARE_WITH_HOLE = JSON.stringify({
    type: 'Polygon',
    coordinates: [
        [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
        [[4, 4], [4, 6], [6, 6], [6, 4], [4, 4]]
    ]
});

const MULTI_SQUARE = JSON.stringify({
    type: 'MultiPolygon',
    coordinates: [
        [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]],
        [[[20, 20], [20, 30], [30, 30], [30, 20], [20, 20]]]
    ]
});

test('capability guard: node:sqlite DatabaseSync exposes a callable function() registration API', () => {
    assert.equal(typeof DatabaseSync.prototype.function, 'function',
        'node:sqlite DatabaseSync.prototype.function is required to register ST_Contains; ' +
        'unavailable on this Node runtime — no silent fallback exists for this capability');

    const db = new DatabaseSync(':memory:');
    db.function('capability_probe', { deterministic: true }, () => 1);
    const row = db.prepare('SELECT capability_probe() AS result').get();
    assert.equal(row.result, 1);
});

test('spatialContains: point inside a simple polygon returns 1', () => {
    assert.equal(spatialContains(SQUARE, 'POINT(5 5)'), 1);
});

test('spatialContains: point outside a simple polygon returns 0', () => {
    assert.equal(spatialContains(SQUARE, 'POINT(50 50)'), 0);
});

test('spatialContains: ring-with-hole excludes the hole and includes the remaining ring', () => {
    assert.equal(spatialContains(SQUARE_WITH_HOLE, 'POINT(5 5)'), 0, 'inside the hole must not count as contained');
    assert.equal(spatialContains(SQUARE_WITH_HOLE, 'POINT(1 1)'), 1, 'inside the outer ring, outside the hole must count as contained');
});

test('spatialContains: MultiPolygon matches when the point falls inside any member polygon', () => {
    assert.equal(spatialContains(MULTI_SQUARE, 'POINT(25 25)'), 1);
    assert.equal(spatialContains(MULTI_SQUARE, 'POINT(5 5)'), 1);
    assert.equal(spatialContains(MULTI_SQUARE, 'POINT(15 15)'), 0);
});

test('spatialContains: malformed (unparsable) GeoJSON returns 0', () => {
    assert.equal(spatialContains('{not-json', 'POINT(5 5)'), 0);
});

test('spatialContains: unsupported geometry type returns 0', () => {
    const point = JSON.stringify({ type: 'Point', coordinates: [5, 5] });
    assert.equal(spatialContains(point, 'POINT(5 5)'), 0);
});

test('registerSpatialFunctions: GeomFromGeoJSON/ST_GeomFromText are identity passthroughs feeding ST_Contains over SQL', () => {
    const db = crearBaseSqlite();
    const row = db.prepare(
        "SELECT ST_Contains(GeomFromGeoJSON(?), ST_GeomFromText('POINT(5 5)')) AS result"
    ).get(SQUARE);
    assert.equal(row.result, 1);

    const outside = db.prepare(
        "SELECT ST_Contains(GeomFromGeoJSON(?), ST_GeomFromText('POINT(50 50)')) AS result"
    ).get(SQUARE);
    assert.equal(outside.result, 0);
});

test('cordovaSqlite: adapter exposes the DAO-style openDatabase/transaction/executeSql surface over the shim', () => {
    const db = crearBaseSqlite();
    db.exec('CREATE TABLE GEOCERCA (GEOM TEXT)');
    db.prepare('INSERT INTO GEOCERCA (GEOM) VALUES (?)').run(SQUARE);

    const sqlitePlugin = cordovaSqlite(db);
    const sql = sqlitePlugin.openDatabase();

    let capturedRows = null;
    sql.transaction(tx => {
        tx.executeSql(
            "SELECT COUNT(*) AS total FROM GEOCERCA WHERE ST_Contains(GeomFromGeoJSON(GEOM), ST_GeomFromText('POINT(5 5)')) = 1",
            [],
            (transaction, result) => {
                capturedRows = result.rows;
            }
        );
    }, error => {
        throw error;
    });

    assert.equal(capturedRows.length, 1);
    assert.equal(capturedRows.item(0).total, 1);
});
