// src/app/mappers/userMapper.js
import config from "@/Common/json/config.json"
import { makeId } from './_id'

/** @param {import('../DTO/auth').ServerUser} su */
export function mapServerUserToDoc(su) {
    return {
        type: config.bd.tipoEntidad.usuario,
        _id: makeId(config.bd.tipoEntidad.usuario, su.rut),
        rut: su.rut,
        empresa: su.empresa,
        nombre: su.name,
        email: su.email,
        rol: su.rol,
        lastLoginAt: new Date().toISOString(),
    }
}
