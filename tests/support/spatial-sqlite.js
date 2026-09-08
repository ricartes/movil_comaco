'use strict';

/**
 * Node-only spatial shim for `tests/`.
 *
 * This is NOT device SpatiaLite (`cordova-sqlite-spatialite-evplus-ext-common-free`).
 * It is a planar even-odd ray-cast implementation registered onto `node:sqlite`'s
 * `DatabaseSync` so contract tests can exercise real SQL (`ST_Contains`,
 * `GeomFromGeoJSON`, `ST_GeomFromText`) without the native plugin.
 *
 * Known gap vs. the real device engine: no geodesic math, no spatial index, no CRS
 * handling, and boundary/exactly-on-edge or otherwise degenerate geometry results are
 * undefined here and may differ from SpatiaLite. Only `Polygon` and `MultiPolygon`
 * GeoJSON types are supported; anything else (including malformed/unparsable input)
 * evaluates to "not contained".
 */

const { DatabaseSync } = require('node:sqlite');

function parseWktPoint(wktPoint) {
    if (typeof wktPoint !== 'string') return null;
    const match = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(wktPoint);
    if (!match) return null;
    return [Number(match[1]), Number(match[2])];
}

function pointInRing([x, y], ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersects = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
}

function polygonContains(point, rings) {
    if (!Array.isArray(rings) || rings.length === 0) return false;
    const [outer, ...holes] = rings;
    if (!Array.isArray(outer) || !pointInRing(point, outer)) return false;
    return !holes.some(hole => Array.isArray(hole) && pointInRing(point, hole));
}

function spatialContains(geoJsonText, wktPoint) {
    const point = parseWktPoint(wktPoint);
    if (!point) return 0;

    let geometry;
    try {
        geometry = JSON.parse(geoJsonText);
    } catch {
        return 0;
    }

    if (!geometry || typeof geometry !== 'object') return 0;

    if (geometry.type === 'Polygon') {
        return polygonContains(point, geometry.coordinates) ? 1 : 0;
    }

    if (geometry.type === 'MultiPolygon') {
        const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
        return polygons.some(rings => polygonContains(point, rings)) ? 1 : 0;
    }

    return 0;
}

function registerSpatialFunctions(db) {
    // Identity passthroughs: the shim's `spatialContains` parses the raw GeoJSON text
    // and raw WKT point itself, matching the strings the production SQL builds.
    db.function('GeomFromGeoJSON', { deterministic: true }, value => value);
    db.function('ST_GeomFromText', { deterministic: true }, value => value);
    db.function('ST_Contains', { deterministic: true }, spatialContains);
}

function crearBaseSqlite() {
    const db = new DatabaseSync(':memory:');
    registerSpatialFunctions(db);
    return db;
}

// Duplicated from `tests/qr-guias-contract.test.js` (read-only precedent) on purpose —
// see design.md "New support module; do not refactor qr-guias-contract.test.js".
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

module.exports = {
    spatialContains,
    registerSpatialFunctions,
    cordovaSqlite,
    crearBaseSqlite
};
