
import { crearIndicesTipo } from '@/app/db/indexs/Indices';
import Utilidades from '../Utilidades';

//import { myViews } from '../dbViews/dbViews';

let localDbInstance = null;


async function initializeDatabases() {
    let nameDB = 'control_faena_';
    const uid = await Utilidades.getUIDevice();
    nameDB += uid;

    localDbInstance = new PouchDB(nameDB);
    //dbLocal.set(localDbInstance); // Actualiza el store si necesitas reactividad

    // Configurar índices para usuarios
    crearIndicesTipo(localDbInstance).then(() => {

    }).catch(err => {
        console.log('Error configurando índices de usuario:', err);
    });
}



// Función para insertar un documento en la base de datos local
async function insertarDocumento(documento) {
    if (!localDbInstance) {
        throw new Error("La base de datos local no está inicializada.");
    }

    try {
        const resultado = await localDbInstance.post(documento);
        console.log("Documento insertado con éxito. ID generado:", resultado.id);
        return resultado; // El objeto resultado incluye el _id generado y el _rev
    } catch (error) {
        alert("Error al insertar el documento:", error);
        throw error;
    }
}

export { localDbInstance, initializeDatabases };
