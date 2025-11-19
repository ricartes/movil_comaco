function compruebaHoraSistema() {
    let respuesta = new ResponseDTO();
    return new Promise((resolve, reject) => {
        if (checkConnection() != "No network connection") {
            comprueba_conexion("0", function (result_conexion) {
                if (result_conexion == 1) {
                    var fecha_hora = FechaHoraActual();
                    comparar_fecha_hora_ws(fecha_hora, function (result_fecha) {
                        if (result_fecha == 0) {
                            reject("Hay una diferencia de fecha/hora entre el dispositivo móvil y el servidor web. Se recomienda corroborar con el administrador");
                        }
                        respuesta.status = true;
                        resolve(respuesta);

                    });
                } else {
                    reject("No se puede establecer conexión con el servidor");
                }
            });

        } else {
            reject("No hay conexión a internet");
        }
    });
}


/**
 * Valida versionApp
 */
async function validarVersionApp() {
    const empresa = Obtener_dato_local("empresa_activo");
    const versionMovil = Obtener_dato_local("version_app"); // aquí tendrás "4000"

    // 1) Obtener la dirección del servidor
    const paramServidor = await getParametroMovilPorNombre(1, "DIRECCION_SERVIDOR");
    const ruta = paramServidor.PAG_VALOR + "/Webserviceproveedor.asmx/Cargar_Parametro_General";

    // 2) Consumir el asmx con fetch (POST x-www-form-urlencoded)
    const body = new URLSearchParams({ id_emp: empresa }).toString();

    const response = await fetch(ruta, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: body
    });

    if (!response.ok) {
        throw new Error("Error HTTP: " + response.status);
    }

    const xmlText = await response.text();
    const versionServidor = obtenerVersionDesdeXml(xmlText); // ej: "4000"

    if (!versionServidor) {
        throw new Error("No se encontró el parámetro de versión (PAG_ID = 6)");
    }

    // Aquí comparamos directamente string con string: "4000" === "4000"
    return versionMovil === versionServidor;
}



function obtenerVersionDesdeXml(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Todos los nodos <CL_Param_General>
    const nodosParam = xmlDoc.getElementsByTagName("CL_Param_General");

    for (let i = 0; i < nodosParam.length; i++) {
        const nodo = nodosParam[i];

        const pagIdNode = nodo.getElementsByTagName("PAG_ID")[0];
        if (!pagIdNode) continue;

        const pagId = pagIdNode.textContent.trim();

        if (pagId === "6") {
            const valorNode = nodo.getElementsByTagName("PAG_VALOR")[0];
            if (!valorNode) return null;

            const valor = valorNode.textContent.trim(); // "2.4"
            return valor;
        }
    }

    return null; // no se encontró PAG_ID = 6
}


function getParametroMovilPorNombre(idEmp, nombre) {
    return new Promise((resolve, reject) => {
        DATOS_seleccionar_Parametro_movil_por_nombre(idEmp, nombre, function (result_param) {
            if (!result_param || result_param === "-1") {
                reject("No se encontró el parámetro " + nombre);
            } else {
                resolve(result_param);
            }
        });
    });
}

function obtenerVersionDesdeXml(xmlText) {
    const param = obtenerParametroDesdeXml(xmlText, 6); // PAG_ID = 6

    if (!param) return null;

    return param.valor;    // "2.4"
    // si quisieras más info: return param;
}

/**
 * Busca un CL_Param_General dentro del XML por PAG_ID y retorna sus datos.
 *
 * @param {string} xmlText  XML en texto bruto
 * @param {string|number} pagIdBuscado  ID del parámetro (ej: 6)
 * @returns {object|null}  { empId, pagId, glosa, valor } o null si no lo encuentra
 */
function obtenerParametroDesdeXml(xmlText, pagIdBuscado) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const nodosParam = xmlDoc.getElementsByTagName("CL_Param_General");
    const idStr = String(pagIdBuscado);

    for (let i = 0; i < nodosParam.length; i++) {
        const nodo = nodosParam[i];

        const pagIdNode = nodo.getElementsByTagName("PAG_ID")[0];
        if (!pagIdNode) continue;

        const pagId = pagIdNode.textContent.trim();
        if (pagId !== idStr) continue;

        const empIdNode = nodo.getElementsByTagName("EMP_ID")[0];
        const glosaNode = nodo.getElementsByTagName("PAG_GLOSA")[0];
        const valorNode = nodo.getElementsByTagName("PAG_VALOR")[0];

        return {
            empId: empIdNode ? empIdNode.textContent.trim() : null,
            pagId: pagId,
            glosa: glosaNode ? glosaNode.textContent.trim() : null,
            valor: valorNode ? valorNode.textContent.trim() : null
        };
    }

    return null;
}
