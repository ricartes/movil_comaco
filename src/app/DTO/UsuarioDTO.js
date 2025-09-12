export class UsuarioDTO {
    constructor(id, nombre, username) {
        this._id = id; // PouchDB utiliza _id como clave primaria
        // Validación del nombre
        if (!nombre) {
            throw new Error('El campo "nombre" es obligatorio.');
        } else {
            this.nombre = nombre;
        }

        // Validación del username
        if (!username) {
            throw new Error('El campo "username" es obligatorio.');
        } else {
            this.username = username;
        }
        this.tipo = 'usuario'; // Utilizado para los índices y las búsquedas
    }

    // Métodos de validación o manipulación aquí
}
