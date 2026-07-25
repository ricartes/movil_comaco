// La validación normal utiliza únicamente la credencial técnica. La contraseña
// local se envía al servidor sólo cuando éste confirma que el token está
// desfasado y requiere una rotación autenticada.
(function () {
    if (typeof CREDENCIAL_postAsegurar !== "function") return;

    var postBase = CREDENCIAL_postAsegurar;

    CREDENCIAL_postAsegurar = function (baseUrl, entrada) {
        entrada = entrada || {};
        var passwordRenovacion = String(entrada.password || "");
        var validacion = {
            usuario: entrada.usuario || "",
            password: "",
            idUsuario: Number(entrada.idUsuario || 0),
            tokenInstalacion: entrada.tokenInstalacion || "",
            auditoria: entrada.auditoria
        };

        return postBase(baseUrl, validacion).then(function (respuesta) {
            if (!respuesta || respuesta.EXITO === true ||
                    respuesta.CODIGO !== "CREDENCIAL_REQUIERE_RENOVACION") {
                passwordRenovacion = "";
                return respuesta;
            }

            if (!passwordRenovacion) {
                passwordRenovacion = "";
                return respuesta;
            }

            var renovacion = {
                usuario: entrada.usuario || "",
                password: passwordRenovacion,
                idUsuario: Number(entrada.idUsuario || 0),
                tokenInstalacion: entrada.tokenInstalacion || "",
                auditoria: entrada.auditoria
            };

            return postBase(baseUrl, renovacion).finally(function () {
                renovacion.password = "";
                passwordRenovacion = "";
            });
        }).catch(function (error) {
            passwordRenovacion = "";
            throw error;
        });
    };
})();
