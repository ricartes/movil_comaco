$$(document).on('page:init', '.page[data-name="enviar-datos"]', function (e,page) {

	envio_automatico_activado=0;
	$$("#enviados_appbar").text("Envio automático desactivado...");

	$$('#btn_enviar').on('click', function () {
		enviar_datos();
	});

});



function enviar_datos(){
	var mensaje="";
	app.dialog.preloader("Enviando Guías");
	var error_aserrable=0;
	var error_pulpable=0;




if(checkConnection()!="No network connection"){
		envio_automatico_activado=0;
		Guardar_dato_local("bloqueado",1);
		comprueba_conexion("0", function(result_conexion) {
			//alert(result_conexion);
			if(result_conexion==1){

				

				enviar_guias_proveedor("0", function(result_guias) {
					
					//lert(result_guias);
					if(result_guias==1 || result_guias==0){

						enviar_evidencias_proveedor("0", function(result_evidencias) {

							enviar_imagenes("0", function(result_imagenes) {
								Guardar_dato_local("bloqueado",0);
								envio_automatico_activado=1;
								app.dialog.close();

								if(result_evidencias==1 || result_evidencias==0 || result_imagenes==1 || result_imagenes==0){

									app.dialog.alert("Datos enviados correctamente","Envio de guías", function () {
										mainView.router.navigate('/');																				
									});

								}else{
									Guardar_dato_local("bloqueado",0);
									envio_automatico_activado=1;
									app.dialog.close();
									app.dialog.alert("Error al enviar las evidencias","Envio de guías");
								}
							});

						});


					}else{

						Guardar_dato_local("bloqueado",0);
						envio_automatico_activado=1;
						app.dialog.close();
						app.dialog.alert("Error al enviar las guías","Envio de guías");
					}
				});
			}else{
				Guardar_dato_local("bloqueado",0);
				envio_automatico_activado=1;
				app.dialog.close();
				app.dialog.alert("No se ha podido establecer la conexion con el servidor","Envio de guías");
			}

		});
	}else{
		Guardar_dato_local("bloqueado",0);
		envio_automatico_activado=1;
		app.dialog.close();
		app.dialog.alert("Conexión a Internet no detectada","Envio de guías");
	}
}