// src/app/mappers/userMapper.js

/** @param {import('../DTO/auth').ServerUser} su */
export function mapServerUserToDoc(su) {
    return {
        _id: `user:${su.rut}`,
        type: 'user',
        rut: su.rut,
        nombre: su.name,
        email: su.email,
        rol: su.rol,
        lastLoginAt: new Date().toISOString(),
    }
}
