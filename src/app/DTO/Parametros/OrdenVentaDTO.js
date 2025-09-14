// src/app/DTO/Parametros/OrdenVentaDTO.js

export class OrdenVentaDTO {
    /**
     * @param {number|string} numOv
     * @param {number|string} codProyecto
     * @param {number|string} codCliente
     * @param {string} nomCliente
     * @param {number|string} codProducto
     * @param {string} nomProducto
     * @param {string|null} comentario
     * @param {string} unidadMedida
     * @param {string} codZona
     * @param {number|string} largoPorTrozo
     * @param {number|string|null} codOcReferencia
     * @param {string|null} ocReferencia
     * @param {string|null} fechaOcReferencia
     */
    constructor(
        numOv,
        codProyecto,
        codCliente,
        nomCliente,
        codProducto,
        nomProducto,
        comentario,
        unidadMedida,
        codZona,
        largoPorTrozo,
        codOcReferencia,
        ocReferencia,
        fechaOcReferencia
    ) {
        this.numOv = numOv;
        this.codProyecto = codProyecto;
        this.codCliente = codCliente;
        this.nomCliente = nomCliente;
        this.codProducto = codProducto;
        this.nomProducto = nomProducto;
        this.comentario = comentario ?? null;
        this.unidadMedida = unidadMedida;
        this.codZona = codZona;
        this.largoPorTrozo = largoPorTrozo;
        this.codOcReferencia = codOcReferencia ?? null;
        this.ocReferencia = ocReferencia ?? null;
        this.fechaOcReferencia = fechaOcReferencia ?? null;
    }
}

export default OrdenVentaDTO;
