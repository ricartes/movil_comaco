// src/app/mappers/empresaContratistaMapper.js
import config from '@/Common/json/config.json'
import { makeId } from './_id'
import { normalizeRut, normalizeText } from './_normalize'
import EmpresaContratistaDTO from '@/app/DTO/Parametros/EmpresaContratistaDTO'
import EmpresaContratistaSimpleDTO from '@/app/DTO/Parametros/EmpresaContratistaSimpleDTO';
import LineaContratistaDTO from '@/app/DTO/Parametros/LineaContratistaDTO';

/** row tal cual del WS */
export function mapServerEmpresaContratistaToDoc(row) {
    if (!row || !row.rolPredio || !row.rutContratista || row.codLinea == null) {
        throw new Error('rolPredio, rutContratista y codLinea son requeridos');
    }

    const rol = normalizeText(row.rolPredio);
    const rut = normalizeRut(row.rutContratista);
    const codLinea = Number(row.codLinea);

    return {
        _id: makeId(
            config.bd.tipoEntidad.empresaContratista,
            rol,
            rut,
            String(codLinea)
        ),
        type: config.bd.tipoEntidad.empresaContratista,

        // guardamos normalizados para consultas consistentes
        rolPredio: rol,
        rutContratista: rut,

        // resto tal cual (o normalizado si prefieres)
        nombreContratista: row.nombreContratista ?? null,
        codLinea,
        nombreLinea: row.nombreLinea ?? null,

        syncedAt: new Date().toISOString(),
    };
}

export function empresaContratistaDocToDTO(doc) {
    return new EmpresaContratistaDTO(
        doc.rolPredio,
        doc.rutContratista,
        doc.nombreContratista ?? null,
        doc.codLinea,
        doc.nombreLinea ?? null
    );
}

export function empresaContratistaSimpleDocToDTO(doc) {
    return new EmpresaContratistaSimpleDTO(
        doc
    )
}

export function lineaContratistaDocToDTO(doc) {
    return new LineaContratistaDTO(
        doc
    )
}

