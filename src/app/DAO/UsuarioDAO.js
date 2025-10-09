import config from "@/Common/json/config.json"
import { makeId } from "../mappers/_id";
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
            throw error; // Re-lanzar para manejo externo
        }
    }

    async obtenerPorRut(rut) {
        try { return await this.db.get(makeId(config.bd.tipoEntidad.usuario, rut)) } catch (e) {
            if (e.status === 404) return null; throw e
        }
    }

    async eliminarPorRut(rut) {
        try {
            const usuario = await this.obtenerPorRut(rut);
            if (!usuario) {
                return false; // No existe
            }

            await this.db.remove(usuario._id, usuario._rev); // usa id y rev para evitar conflictos
            return true; // Eliminado correctamente
        } catch (err) {
            if (err.status === 404) {
                // No existía → no es un error fatal
                return false;
            }
            console.error('Error eliminando usuario por RUT:', err);
            throw err;
        }
    }


    async listarPorRut(rut) {
        console.log(config.bd.tipoEntidad.usuario);
        const res = await this.db.find({
            selector: {
                type: config.bd.tipoEntidad.usuario,
            },

        });

        console.log(res);

        return res;
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
