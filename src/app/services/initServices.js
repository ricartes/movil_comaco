//import UsuarioDAO from '../DAO/UsuarioDAO'; // Asegúrate de que la ruta sea correcta según tu estructura de directorios

import BaseDAO from '../DAO/BaseDAO';

// Inicializa UsuarioDAO con la instancia de la base de datos
// La función acepta la instancia de la base de datos como parámetro
let _usuarioDao; // Almacena la instancia aquí

let _baseDAO;

export function initializeServices(dbInstance) {
    // Inicialización de usuarioDao...
    // _usuarioDao = new UsuarioDAO(dbInstance);

    _baseDAO = new BaseDAO(dbInstance);
    // Podrías inicializar más servicios aquí
}

export function getBaseDao() {
    if (!_baseDAO) {
        throw new Error("BaseDao no ha sido inicializado.");
    }
    return _baseDAO;
}

