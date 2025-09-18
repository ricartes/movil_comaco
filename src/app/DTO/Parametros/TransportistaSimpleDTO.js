// src/app/DTO/Parametros/RodalDTO.js
export default class TransportistaSimpleDTO {
    constructor({ rutTransportista, nomTransportista } = {}) {
        this.rutTransportista = rutTransportista;
        this.nomTransportista = nomTransportista;
    }
}