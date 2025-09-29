let instance = null;

export default class BaseDAO {
    constructor(db) {
        if (!instance) {
            this.db = db;
            instance = this;
        }
        return instance;
    }


    async listarPorTipo(tipo) {
        try {
            // Recuperar todos los documentos, incluyendo sus contenidos completos
            const resultado = await this.db.find({
                selector: {
                    type: tipo
                },
            });
            return resultado.docs;
        } catch (error) {
            console.error("Error al listar documentos:", error);
            throw error;  // Re-lanzar para manejo externo
        }
    }

    async insertar(item) {
        try {
            const resultado = await this.db.post(item);
            return resultado;
        } catch (error) {
            console.error("Error al crear documento:", error);
            throw error; // Re-lanzar para manejo externo
        }
    }





    async eliminar(item) {
        try {
            // Obtener última versión del documento
            const currentDoc = await this.db.get(item._id);
        
            // Marcar para eliminación con la revisión actual
            const documentoParaEliminar = {
                ...currentDoc,
                _deleted: true,
            };

            // Eliminar documento usando la revisión correcta
            const respuestaEliminacion = await this.db.put(documentoParaEliminar);

            return respuestaEliminacion;
        } catch (error) {
            console.error("Error al eliminar documento:", error);
            throw error;
        }
    }
}
