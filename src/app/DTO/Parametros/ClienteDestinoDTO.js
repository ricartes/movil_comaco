// src/app/DTO/Parametros/ClienteDestinoDTO.js
export default class ClienteDestinoDTO {
    constructor({
        destinoCliente,
        direccionCliente,
        direccionDestinoCliente,
        comunaDestinoCliente,
        ciudadDestinoCliente,
        nombreDestino,
        rolDestino,
        coordenadasDestino,
        latitudDestino,
        longitudDestino,
    } = {}) {
        this.destinoCliente = destinoCliente;
        this.direccionCliente = direccionCliente;
        this.direccionDestinoCliente = direccionDestinoCliente;
        this.comunaDestinoCliente = comunaDestinoCliente;
        this.ciudadDestinoCliente = ciudadDestinoCliente;
        this.nombreDestino = nombreDestino;
        this.rolDestino = rolDestino;
        this.coordenadasDestino = coordenadasDestino;
        this.latitudDestino = latitudDestino;
        this.longitudDestino = longitudDestino;
    }
}
