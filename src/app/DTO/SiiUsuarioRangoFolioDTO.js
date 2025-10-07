export default class SiiUsuarioRangoFolioDTO {
    constructor({
        empId,
        urfId,
        rutUsuario,
        folioInicial,
        folioFinal,
        cantidad,
        verificado,
        srfId,
        caf,
        rsask,
        rsapubk,
    } = {}) {
        this.empId = empId;
        this.urfId = urfId;
        this.rutUsuario = rutUsuario;
        this.folioInicial = folioInicial;
        this.folioFinal = folioFinal;
        this.cantidad = cantidad;
        this.verificado = verificado; // 1|2
        this.srfId = srfId;
        this.caf = caf;       // XML <CAF>… (string)
        this.rsask = rsask;   // clave privada
        this.rsapubk = rsapubk; // clave pública
    }
}
