

/**
 * 
 * @param {*} geocerca 
 * @param {*} latitud 
 * @param {*} longitud 
 * @returns 
 */
export function comprobarGeocerca(geocerca, latitud, longitud) {
    let pos = new LatLon(latitud, longitud);
    let geoFence = new LatLon(geocerca.latitude, geocerca.longitude);
    return pos.distanceTo(geoFence) < geocerca.radio;

}
