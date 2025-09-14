// src/app/mappers/userMapper.js

/** @param {import('../DTO/auth').ServerUser} su */
export function mapServerUserToDoc(su) {
    return {
        _id: `${config.bd.tipoEntidad.usuario}:${rut}:${empresa}`,
        rut: su.rut,
        empresa: su.empresa,
        nombre: su.name,
        email: su.email,
        rol: su.rol,
        lastLoginAt: new Date().toISOString(),
    }
}
