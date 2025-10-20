// src/app/mappers/SiiUsuarioRangoFolioMapper.js
import config from '@/Common/json/config.json';
import SiiUsuarioRangoFolioDTO from '@/app/DTO/SiiUsuarioRangoFolioDTO';
import { makeId } from './_id';

const T = config.bd.tipoEntidad;

export const urfDocId = (empId, urfId) => makeId(T.siiUsuarioRangoFolio, `${empId}:${urfId}`);

export function mapServerURFToDoc(row, { batchId = null, staging = true } = {}) {
    if (!row || row.empId == null || row.urfId == null) {
        throw new Error('empId y urfId son obligatorios');
    }

    const now = new Date().toISOString();

    return {
        _id: urfDocId(row.empId, row.urfId),
        type: T.siiUsuarioRangoFolio,

        // base
        empId: row.empId,
        urfId: row.urfId,
        rutUsuario: row.rutUsuario,
        folioInicial: row.folioInicial,
        folioFinal: row.folioFinal,
        cantidad: row.cantidad,
        verificado: row.verificado, // 1/2 (ASIGNADO/VERIFICADO)
        srfId: row.srfId,

        // CAF + llaves (para timbre offline)
        caf: row.caf || null,
        rsask: row.rsask || null,
        rsapubk: row.rsapubk || null,

        // agregados
        primerDisponible: Number(row.primerDisponible ?? row.folioInicial),
        maxOcupado: row.maxOcupado != null ? Number(row.maxOcupado) : null,
        totalUsados: Number(row.totalUsados || 0),
        totalDisponibles: Number(row.totalDisponibles || 0),

        // ✅ NUEVO: listas exactas para el cliente
        foliosUsados: Array.isArray(row.foliosUsados) ? row.foliosUsados.map(Number) : [],
        foliosAsignados: Array.isArray(row.foliosAsignados) ? row.foliosAsignados.map(Number) : [],

        // meta
        staging,
        batchId,
        syncedAt: now,
    };
}

export function urfDocToDTO(doc) {
    return new SiiUsuarioRangoFolioDTO(doc);
}
