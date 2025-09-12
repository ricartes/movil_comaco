

export default class UsuarioResponseDTO {
    constructor(token, informacion, esTokenValido) {
        this.token = token;
        this.informacion = informacion;
        this.esTokenValido = esTokenValido;
    }
}
