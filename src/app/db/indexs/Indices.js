export async function crearIndicesTipo(db) {
    try {
        // Intenta crear el índice compuesto
        // crearIndicesTipo.js
        await db.createIndex({ index: { fields: ['type'] } })
        await db.createIndex({ index: { fields: ['type', 'rut'] } })
        await db.createIndex({ index: { fields: ['type', 'rut', 'empresa'] } })

        // La creación del índice fue exitosa, puedes manejar el resultado si es necesario

    } catch (err) {
        // Manejo de errores mejorado
        console.error('Error creando índice de tipo:', err);
        throw new Error('Error creando índice de tipo');
    }
}
