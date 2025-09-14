// src/app/mappers/userMapper.js
import config from "@/Common/json/config.json"
/** @param {import('../DTO/auth').ServerUser} su */
export function mapServerUserToDoc(su) {
    return {
        _id: makeId(config.bd.tipoEntidad.usuario, su.empresa, su.rut),
        rut: su.rut,
        empresa: su.empresa,
        nombre: su.name,
        email: su.email,
        rol: su.rol,
        lastLoginAt: new Date().toISOString(),
    }
}
