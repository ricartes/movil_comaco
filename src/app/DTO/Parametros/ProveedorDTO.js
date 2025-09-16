// src/app/DTO/Parametros/RodalDTO.js
export default class ProveedorDTO {
    constructor({ rutProveedor, nomProveedor, codEncargado } = {}) {
        this.rutProveedor = rutProveedor;
        this.nomProveedor = nomProveedor;
        this.codEncargado = codEncargado;
    }
}
