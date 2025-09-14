import config from '@/Common/json/config.json'
import CarguioDTO from '@/app/DTO/Parametros/CarguioDTO'
import { normalizeRut, normalizePlate, normalizeName } from './_normalize'
import { makeId } from './_id'



export function mapServerCarguioToDoc(row) {
    if (!row || !row.rutCarguio) throw new Error('rutCarguio requerido')
    const rut = normalizeRut(row.rutCarguio);
    const pat = normalizePlate(row.patenteCarguio);
    const cho = normalizeName(row.nombreConductor || '');

    const id = makeId(
        config.bd.tipoEntidad.carguio,
        rut,
        pat,
        cho || 'SIN_CONDUCTOR'
    );
    return {
        _id: id,
        type: config.bd.tipoEntidad.carguio,
        ...row,
        syncedAt: new Date().toISOString(),
    }
}

/** Lista backend → Docs PouchDB */
export function mapCarguioArrayToDocs(rows = []) {
    return rows
        .filter(r => r && r.rutCarguio)
        .map(mapServerCarguioToDoc)
}

/** Doc PouchDB → DTO */
export function carguioDocToDTO(doc) {
    return new CarguioDTO(doc)
}
