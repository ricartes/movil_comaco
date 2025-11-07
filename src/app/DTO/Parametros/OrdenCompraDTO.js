// @ts-nocheck
// Mantiene exactamente los mismos nombres de atributos que vienen del backend.
export class OrdenCompraDTO {
    constructor({
        numOc,
        codEncargado,
        codCliente,
        rutCliente,
        razonSocialCliente,
        direccionCliente,
        comunaCliente,
        ciudadCliente,
        giroCliente,
        telefonoCliente = null,
        destinoCliente,
        codCargador = null,
        rutCargador = null,
        nombreCargador = null,
        codContratista = null,
        rutContratista = null,
        codDescargador = null,
        rutDescargador = null,
        nombreDescargador = null,
        patente = null,
        carro = null,
        rutChofer = null,
        nombreChofer = null,
        codTransportista = null,
        rutTransportista = null,
        nombreTransportista = null,
        codProveedor,
        rutProveedor,
        nomProveedor,
        codProyecto,
        rolPredio,
        rolComuna,
        predio,
        anioPlantacion = null,
        codProducto,
        nombreProducto,
        descripcionZona,
        precioCosecha,
        precioCargador = null,
        precioDescargador = null,
        precioFlete = null,
        freeText = null,
        unidadMedida,
        largoTrozo,
        direccionDestinoCliente,
        comunaDestinoCliente,
        ciudadDestinoCliente,
        tipoDoctoRef,
        fechaDoctoRef = null,
        groupNum = null,
        uFeTipoDesp = null,
        diametroMin,
        diametroMax,
        planManejo = null,
        coordenadaX = null,
        coordenadaY = null,
        fsc = null,
        categoria = null,
        sag = null,
        ocCliente = null,
        tipoCertificacion = null,
        codigoCertificacion = null,
        // campos internos opcionales de pouch:
        _id = undefined,
        _rev = undefined,
        type = undefined,
    } = {}) {
        // copia 1:1
        this.numOc = numOc;
        this.codEncargado = codEncargado;
        this.codCliente = codCliente;
        this.rutCliente = rutCliente;
        this.razonSocialCliente = razonSocialCliente;
        this.direccionCliente = direccionCliente;
        this.comunaCliente = comunaCliente;
        this.ciudadCliente = ciudadCliente;
        this.giroCliente = giroCliente;
        this.telefonoCliente = telefonoCliente;
        this.destinoCliente = destinoCliente;
        this.codCargador = codCargador;
        this.rutCargador = rutCargador;
        this.nombreCargador = nombreCargador;
        this.codContratista = codContratista;
        this.rutContratista = rutContratista;
        this.codDescargador = codDescargador;
        this.rutDescargador = rutDescargador;
        this.nombreDescargador = nombreDescargador;
        this.patente = patente;
        this.carro = carro;
        this.rutChofer = rutChofer;
        this.nombreChofer = nombreChofer;
        this.codTransportista = codTransportista;
        this.rutTransportista = rutTransportista;
        this.nombreTransportista = nombreTransportista;
        this.codProveedor = codProveedor;
        this.rutProveedor = rutProveedor;
        this.nomProveedor = nomProveedor;
        this.codProyecto = codProyecto;
        this.rolPredio = rolPredio;
        this.rolComuna = rolComuna;
        this.predio = predio;
        this.anioPlantacion = anioPlantacion;
        this.codProducto = codProducto;
        this.nombreProducto = nombreProducto;
        this.descripcionZona = descripcionZona;
        this.precioCosecha = precioCosecha;
        this.precioCargador = precioCargador;
        this.precioDescargador = precioDescargador;
        this.precioFlete = precioFlete;
        this.freeText = freeText;
        this.unidadMedida = unidadMedida;
        this.largoTrozo = largoTrozo;
        this.direccionDestinoCliente = direccionDestinoCliente;
        this.comunaDestinoCliente = comunaDestinoCliente;
        this.ciudadDestinoCliente = ciudadDestinoCliente;
        this.tipoDoctoRef = tipoDoctoRef;
        this.fechaDoctoRef = fechaDoctoRef;
        this.groupNum = groupNum;
        this.uFeTipoDesp = uFeTipoDesp;
        this.diametroMin = diametroMin;
        this.diametroMax = diametroMax;
        this.planManejo = planManejo;
        this.coordenadaX = coordenadaX;
        this.coordenadaY = coordenadaY;
        this.fsc = fsc;
        this.categoria = categoria;
        this.sag = sag;
        this.ocCliente = ocCliente;
        this.tipoCertificacion = tipoCertificacion;
        this.codigoCertificacion = codigoCertificacion;
    }
}

export default OrdenCompraDTO;
