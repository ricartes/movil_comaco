// src/app/DTO/Parametros/RodalDTO.js
export default class ClienteDTO {
    constructor({ codCliente, rutCliente, razonSocialCliente, direccionCliente, comunaCliente, ciudadCliente, giroCliente, telefonoCliente } = {}) {
        this.codCliente = codCliente;
        this.rutCliente = rutCliente;
        this.razonSocialCliente = razonSocialCliente;
        this.direccionCliente = direccionCliente;
        this.comunaCliente = comunaCliente;
        this.ciudadCliente = ciudadCliente;
        this.giroCliente = giroCliente;
        this.telefonoCliente = telefonoCliente;
    }
}