// src/app/DTO/Parametros/ClienteDestinoCanchaDTO.js
export default class ClienteDestinoCanchaDTO {
    constructor({ empId, rutCliente, destinoCliente, nombreCancha } = {}) {
        this.empId = empId;
        this.rutCliente = rutCliente;
        this.destinoCliente = destinoCliente;
        this.nombreCancha = nombreCancha;
    }
}
