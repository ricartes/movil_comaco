// src/app/DTO/Parametros/ClienteDestinoDTO.js
export default class ClienteDestinoDTO {
    constructor({ destinoCliente, direccionCliente, direccionDestinoCliente, comunaDestinoCliente, ciudadDestinoCliente } = {}) {
        this.destinoCliente = destinoCliente;
        this.direccionCliente = direccionCliente;
        this.direccionDestinoCliente = direccionDestinoCliente;
        this.comunaDestinoCliente = comunaDestinoCliente;
        this.ciudadDestinoCliente = ciudadDestinoCliente;
    }
}
