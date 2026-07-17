var $$ = Dom7;

$$(document).on('page:init', '.page[data-name="carga-guias"]', function (e,page) {
	


	//alert("carga guias")
	//carga_grilla_folios(empresa,rut);

	
});




function btn_carga_guias(){
	app.dialog.preloader("Cargando Guías");
	var rut =Obtener_dato_local("rut_activo");
	var empresa =Obtener_dato_local("empresa_activo");
	var username =Obtener_dato_local("user_activo");
	

	if(checkConnection()!="No network connection"){
		comprueba_conexion("0", function(result_conexion) {

			if(result_conexion==1){
				
				ws_cargar_guias(username, empresa, function(result_guias) {

					
						
						app.dialog.close();
						if(result_guias!=1 && result_guias!=0){
							
				
							app.dialog.alert("Error al obtener las guias","Carga de guías")

						}else{
							app.dialog.close();
							if(result_guias==0){
								app.dialog.alert("No se han encontrado guías por cargar","GFE PROVEEDORES", function () {
									mainView.router.navigate('/');																				
								});
							}else{
								app.dialog.alert("Guias cargadas correctamente","GFE PROVEEDORES", function () {
									mainView.router.navigate('/');																				
								});
							}

							/*ws_cargar_evidencia(username, empresa, function(result_evidencias) {
						
								app.dialog.close();
								app.dialog.alert("Guias cargadas","Carga de guías")
							});*/
						}
					
				});


			}else{
				app.dialog.close();
				app.dialog.close();
				app.dialog.alert("No se ha podido establecer la conexion con el servidor","Carga de guías")
			}

		});
	}else{
		app.dialog.close();
		app.dialog.close();
		app.dialog.alert("Conexión a Internet no detectada","Carga de guías")
	}



}
