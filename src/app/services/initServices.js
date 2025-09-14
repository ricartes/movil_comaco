import BaseDAO from '@/app/DAO/BaseDAO';
import UsuarioDAO from '@/app/DAO/UsuarioDAO';
import OrdenCompraDAO from '@/app/DAO/Parametros/OrdenCompraDAO';
import OrdenVentaDAO from '@/app/DAO/Parametros/OrdenVentaDAO';
import TransportistaDAO from '@/app/DAO/Parametros/TransportistaDAO';
import SocioDAO from '@/app/DAO/Parametros/SocioDAO';
import PrecioProductoDAO from '@/app/DAO/Parametros/PrecioProductoDAO';
import EmpresaDAO from '@/app/DAO/Parametros/EmpresaDAO';
import ParametroGeneralDAO from '@/app/DAO/Parametros/ParametroGeneralDAO';
import CarguioDAO from '@/app/DAO/Parametros/CarguioDAO';
import EmpresaContratistaDAO from '@/app/DAO/Parametros/EmpresaContratistaDAO';
import RodalDAO from '@/app/DAO/Parametros/RodalDAO';


// Inicializa UsuarioDAO con la instancia de la base de datos
// La función acepta la instancia de la base de datos como parámetro
let _baseDAO;
let _usuarioDao;
let _ordenCompraDao;
let _ordenVentaDao;
let _transportistaDao;
let _socioDao;
let _precioProductoDao;
let _empresaDao;
let _parametroGeneralDao;
let _carguioDao;
let _empresaContratistaDao;
let _rodalDao;

export function initializeServices(dbInstance) {
    // Inicialización de usuarioDao...
    _usuarioDao = new UsuarioDAO(dbInstance);
    _baseDAO = new BaseDAO(dbInstance);
    _ordenCompraDao = new OrdenCompraDAO(dbInstance);
    _ordenVentaDao = new OrdenVentaDAO(dbInstance);
    _transportistaDao = new TransportistaDAO(dbInstance);
    _socioDao = new SocioDAO(dbInstance);
    _empresaDao = new EmpresaDAO(dbInstance);
    _precioProductoDao = new PrecioProductoDAO(dbInstance);
    _parametroGeneralDao = new ParametroGeneralDAO(dbInstance);
    _carguioDao = new CarguioDAO(dbInstance);
    _empresaContratistaDao = new EmpresaContratistaDAO(dbInstance);
    _rodalDao = new RodalDAO(dbInstance);
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

export function getOrdenVentaDao() {
    if (!_ordenVentaDao) {
        throw new Error("_ordenVentaDao no ha sido inicializado.");
    }
    return _ordenVentaDao;
}

export function getTransportistaDao() {
    if (!_transportistaDao) {
        throw new Error("_transportistaDao no ha sido inicializado.");
    }
    return _transportistaDao;
}

export function getSocioDao() {
    if (!_socioDao) {
        throw new Error("_socioDao no ha sido inicializado.");
    }
    return _socioDao;
}

export function getPrecioProductoDao() {
    if (!_precioProductoDao) {
        throw new Error("_precioProductoDao no ha sido inicializado.");
    }
    return _precioProductoDao;
}

export function getEmpresaDao() {
    if (!_empresaDao) {
        throw new Error("_empresaDao no ha sido inicializado.");
    }
    return _empresaDao;
}

export function getParametroGeneralDao() {
    if (!_parametroGeneralDao) {
        throw new Error("_parametroGeneralDao no ha sido inicializado.");
    }
    return _parametroGeneralDao;
}

export function getCarguioDao() {
    if (!_carguioDao) {
        throw new Error("_carguioDao no ha sido inicializado.");
    }
    return _carguioDao;
}

export function getEmpresContratistaDao() {
    if (!_empresaContratistaDao) {
        throw new Error("_empresaContratistaDao no ha sido inicializado.");
    }
    return _empresaContratistaDao;
}

export function getRodalDao() {
    if (!_rodalDao) {
        throw new Error("_rodalDao no ha sido inicializado.");
    }
    return _rodalDao;
}