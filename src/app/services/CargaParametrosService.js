import CargaParametrosWebServices from "@/app/webservices/CargaParametrosWebServices";
import { getOrdenCompraDao } from "@/app/services/initServices";

var CargaParametrosService = {
    async cargarOrdenesCompra(empId, rut) {
        console.log("pasa");
        const response = await CargaParametrosWebServices.cargarOrdenesCompra(empId, rut);
        if (response.status) {
            const areas = this.generarColeccionDesdeArray(response.data);
            await getOrdenCompraDao().eliminarTodos();
            await Promise.all(areas.map(area => getOrdenCompraDao().insertar(area)));
            respuesta.data = areas; // Mover esta línea fuera de .then()
            respuesta.status = true;
            return respuesta; // Asegurarte de que este return está en el scope correcto
        } else {
            let error = new Error(response.error_msj);
            throw error;
        }
    },

}
export default CargaParametrosService;
