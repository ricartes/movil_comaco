// src/app/DTO/Parametros/ClienteDestinoDTO.js
export default class ClienteDestinoDTO {
    constructor({ destinoCliente, direccionDestinoCliente, comunaDestinoCliente, ciudadDestinoCliente } = {}) {
        this.destinoCliente = destinoCliente;
        this.direccionDestinoCliente = direccionDestinoCliente;
        this.comunaDestinoCliente = comunaDestinoCliente;
        this.ciudadDestinoCliente = ciudadDestinoCliente;
    }
}