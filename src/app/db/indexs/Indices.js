export async function crearIndicesTipo(db) {
    try {
        // Intenta crear el índice compuesto
        await db.createIndex({ index: { fields: ['tipo'] } });
        await db.createIndex({ index: { fields: ['id_team'] } });
        await db.createIndex({ index: { fields: ['fechaHora'] } });
        // La creación del índice fue exitosa, puedes manejar el resultado si es necesario
        
    } catch (err) {
        // Manejo de errores mejorado
        console.error('Error creando índice de tipo:', err);
        throw new Error('Error creando índice de tipo');
    }
}
