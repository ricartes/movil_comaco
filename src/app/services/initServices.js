import UsuarioDAO from '../DAO/UsuarioDAO';

import OrdenCompraDAO from '../DAO/Parametros/OrdenCompraDAO';

import BaseDAO from '../DAO/BaseDAO';

// Inicializa UsuarioDAO con la instancia de la base de datos
// La función acepta la instancia de la base de datos como parámetro
let _usuarioDao;

let _ordenCompraDao;

let _baseDAO;

export function initializeServices(dbInstance) {
    // Inicialización de usuarioDao...
    _usuarioDao = new UsuarioDAO(dbInstance);
    _baseDAO = new BaseDAO(dbInstance);
    _ordenCompraDao = new OrdenCompraDAO(dbInstance);
    // Podrías inicializar más servicios aquí
}

export function getBaseDao() {
    if (!_baseDAO) {
        throw new Error("BaseDao no ha sido inicializado.");
    }
    return _baseDAO;
}

export function getUsuarioDao() {
    if (!_usuarioDao) {
        throw new Error("_usuarioDao no ha sido inicializado.");
    }
    return _usuarioDao;
}
export function getOrdenCompraDao() {
    if (!_ordenCompraDao) {
        throw new Error("_ordenCompraDao no ha sido inicializado.");
    }
    return _ordenCompraDao;
}

