$$(document).on('page:init', '.page[data-name="configuracion"]', function (e, page) {









    DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {
        $$("#tx_direccion_servidor").val(result_param.PAG_VALOR);

        var tema_oscuro = Obtener_dato_local("tema_oscuro");
        var nombre_impresora = Obtener_dato_local("nombre_impresora");

        var numero_impresora = Obtener_dato_local("numero_impresora");

        var cadena_impresora = Obtener_dato_local("cadena_impresora");
        //alert(tema_oscuro);
        if (tema_oscuro != null) {

            if (tema_oscuro == "si") {
                $('#check_oscuro').attr('checked', 'checked');
            }
        }

        if (nombre_impresora != null) {
            $$("#tx_impresora").val(nombre_impresora);
        }

        if (numero_impresora != null) {
            $$("#tx_impresora_numero").val(numero_impresora);
        }


        $('#check_oscuro').change(function () {
            if (this.checked) {
                //alert("check");
                $$("#mibody").addClass("theme-dark color-theme-gray");
                Guardar_dato_local("tema_oscuro", "si");
            } else {
                $$("#mibody").removeClass("theme-dark color-theme-gray");
                Guardar_dato_local("tema_oscuro", "no");
            }
            $('#check_oscuro').val(this.checked);
        });
    });
});



function cambiar_nombre_impresora() {
    Guardar_dato_local("nombre_impresora", $$("#tx_impresora").val().trim());
    Guardar_dato_local("cadena_impresora", $$("#tx_impresora").val().trim() + "_" + $$("#tx_impresora_numero").val().trim());

}


function cambiar_numero_impresora() {
    Guardar_dato_local("numero_impresora", $$("#tx_impresora_numero").val().trim());
    Guardar_dato_local("cadena_impresora", $$("#tx_impresora").val().trim() + "_" + $$("#tx_impresora_numero").val().trim());
}


function cambiar_direccion_servidor_web() {

    app.dialog.prompt('Ingresar dirección servidor web.\n Debe indicar SOLO la dirección web, sin incluir "/" despues de ella.\nSiempre incluir el protocolo al comienzo \nEjemplo: http://192.168.1', "GFE", function (direccion) {
        direccion = direccion.toLowerCase();

        if (direccion == "") {
            app.dialog.alert("Error, la dirección ingresada no puede ser vacia", "GFE", function () {
            });
        } else {
            if (direccion.substring(0, 4) != "http" && direccion.substring(0, 5) != "https") {
                app.dialog.alert("Error, la dirección ingresada no incluye el protocolo (http, https)", "GFE", function () {
                });

            } else {
                DATOS_seleccionar_Parametro_movil_por_nombre(1, "DIRECCION_SERVIDOR", function (result_param) {

                    DATOS_actualizar_Parametro_movil(result_param.PAG_ID, direccion, function (result_actualiza) {

                        app.dialog.alert("Dirección modificada correctamente", "GFE", function () {
                            $$("#tx_direccion_servidor").val(direccion);
                            cargarUrlServidorWeb();
                        });

                    });

                });
            }
        }
    });
}




