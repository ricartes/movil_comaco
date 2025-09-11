import config from "../../Common/json/config.json"
var Constantes = {
    //direccion del servidor desarrollo en caso que productivo este off
    direccionServidorPredeterminado: config.productivo ? config.servidor.urlServidorProductivo : config.servidor.urlServidorDesarrollo,
    nombreWebServicePredeterminado: config.webServices.nombreWebService,  //direccion del wenservices predeterminado
    httpOk: 200,
}
export default Constantes;


//TODO: RECORDAR CAMBIAR VARIABLE validaEquipoMovil Y PONER PRODUCTIVO =ON