import config from "../../Common/json/config.json"
let instance = null;

export default class UsuarioDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }

    async insertar(usuario) {
        try {
            const resultado = await this.db.put({
                ...usuario,
            });
            return resultado;
        } catch (error) {
            console.error("Error al crear usuario:", error);
            throw error; // Re-lanzar para manejo externo
        }
    }

    async obtener(rut) {
        const rutStr = String(rut).replace(/\D/g, '')
        const id = `user:${rutStr}`
        console.log(id);
        try {
            return await this.db.get(id)    // trae TODO el doc, incluido offlinePin*
        } catch (e) {
            if (e.status === 404) return null
            throw e
        }
    }


    async eliminar(username) {
        try {
            const usuario = await this.obtener(username);
            if (usuario) {
                await this.db.remove(usuario);
                return true; // Eliminación exitosa
            } else {
                return false; // Usuario no encontrado
            }
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            throw error;
        }
    }


    // Aquí puedes agregar métodos adicionales para actualizar y eliminar usuarios
}
