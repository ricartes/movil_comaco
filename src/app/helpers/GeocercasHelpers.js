import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';

/**
 * Comprueba si (lat, lon) está dentro de una geocerca en GeoJSON.
 * Acepta Feature, Geometry o FeatureCollection (toma el 1° Polygon/MultiPolygon).
 * - GeoJSON usa orden [lon, lat] (¡ojo!).
 */
export function comprobarGeocerca(geocerca, latitud, longitud) {
    const geom = normalizarGeocerca(geocerca);
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) {
        throw new Error('La geocerca debe ser un GeoJSON Polygon o MultiPolygon');
    }

    const pt = turfPoint([Number(longitud), Number(latitud)]);
    // ignoreBoundary:false => punto en el borde cuenta como "dentro"
    return booleanPointInPolygon(pt, geom, { ignoreBoundary: false });
}

function normalizarGeocerca(gj) {
    if (!gj) return null;
    if (gj.type === 'Feature') return gj.geometry;
    if (gj.type === 'FeatureCollection') {
        const feat = gj.features?.find(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon');
        return feat?.geometry ?? null;
    }
    // Si ya es Geometry
    return gj;
}
