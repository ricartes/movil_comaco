
import HelperWebServices from "../Webservices/HelperWebServices"

var HelperService = {
    validarConexion() {
        return new Promise((resolve, reject) => {
            HelperWebServices.validarConexion().then((response) => {
                resolve(response)
            }).catch((error) => {
                reject(error);
            });
        });
    },
}

export default HelperService;



