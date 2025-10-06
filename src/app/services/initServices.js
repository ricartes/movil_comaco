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
import ZonaDAO from '@/app/DAO/Parametros/ZonaDAO';
import GdeDAO from '@/app/DAO/GdeDAO';
import ProveedorDAO from '@/app/DAO/Parametros/ProveedorDAO';
import PredioDAO from '@/app/DAO/Parametros/PredioDAO';
import ClienteDAO from '@/app/DAO/Parametros/ClienteDAO';
import ProductoDAO from '@/app/DAO/Parametros/ProductoDAO';
import GeocercaDAO from '@/app/DAO/Parametros/GeocercaDAO';
import TrazabilidadDAO from '@/app/DAO/TrazabilidadDAO';
import SiiFolioDAO from '@/app/DAO/SiiFolioDAO';
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
let _gdeDao;
let _zonaDao;
let _proveedorDao;
let _predioDao;
let _clienteDao;
let _productoDao;
let _trazabilidadDao;
let _geocercaDao;
let _siiFolioDao;

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
    _gdeDao = new GdeDAO(dbInstance);
    _zonaDao = new ZonaDAO(dbInstance);
    _proveedorDao = new ProveedorDAO(dbInstance);
    _predioDao = new PredioDAO(dbInstance);
    _clienteDao = new ClienteDAO(dbInstance);
    _productoDao = new ProductoDAO(dbInstance);
    _trazabilidadDao = new TrazabilidadDAO(dbInstance);
    _geocercaDao = new GeocercaDAO(dbInstance);
    _siiFolioDao = new SiiFolioDAO(dbInstance);
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

export function getEmpresaContratistaDao() {
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

export function getZonaDao() {
    if (!_zonaDao) {
        throw new Error("_zonaDao no ha sido inicializado.");
    }
    return _zonaDao;
}

export function getProveedorDao() {
    if (!_proveedorDao) {
        throw new Error("_proveedorDao no ha sido inicializado.");
    }
    return _proveedorDao;
}

export function getPredioDao() {
    if (!_predioDao) {
        throw new Error("_predioDao no ha sido inicializado.");
    }
    return _predioDao;
}

export function getClienteDao() {
    if (!_clienteDao) {
        throw new Error("_clienteDao no ha sido inicializado.");
    }
    return _clienteDao;
}

export function getProductoDao() {
    if (!_productoDao) {
        throw new Error("_productoDao no ha sido inicializado.");
    }
    return _productoDao;
}

export function getGeocercaDao() {
    if (!_geocercaDao) {
        throw new Error("_geocercaDao no ha sido inicializado.");
    }
    return _geocercaDao;
}

export function getGdeDao() {
    if (!_gdeDao) {
        throw new Error("_gdeDao no ha sido inicializado.");
    }
    return _gdeDao;
}

export function getTrazabilidadDao() {
    if (!_trazabilidadDao) {
        throw new Error("_trazabilidadDao no ha sido inicializado.");
    }
    return _trazabilidadDao;
}

export function getSiiFolioDao() {
    if (!_siiFolioDao) {
        throw new Error("_siiFolioDao no ha sido inicializado.");
    }
    return _siiFolioDao;
}