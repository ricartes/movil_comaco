var id_gde_actual;
var tipo_evidencia_camion_cargado=2;
var tipo_evidencia_camion_cargado_2=4;
$$(document).on('page:init', '.page[data-name="camion-cargado"]', function (e,page) {

	id_gde_actual=mainView.router.currentRoute.params.idgde;


	DATOS_seleccionar_evidencia_guia(id_gde_actual,tipo_evidencia_camion_cargado, function(datos_evidencia) {
		
		if(datos_evidencia!="-1"){
			$$("#imagen_camion_cargado").attr("src",datos_evidencia[0].ARCHIVO);
		}
		DATOS_seleccionar_evidencia_guia(id_gde_actual,tipo_evidencia_camion_cargado_2, function(datos_evidencia_2) {
			if(datos_evidencia_2!="-1"){
				$$("#imagen_camion_cargado_2").attr("src",datos_evidencia_2[0].ARCHIVO);
			}

		});


	});






	$$("#btn_padron_guia").click(function() {
		DATOS_seleccionar_evidencia_guia(id_gde_actual,tipo_evidencia_camion_cargado, function(datos_evidencia) {
			DATOS_seleccionar_evidencia_guia(id_gde_actual,tipo_evidencia_camion_cargado_2, function(datos_evidencia_2) {
				if(datos_evidencia!="-1" && datos_evidencia_2!="-1"){
					mainView.router.navigate('/PadronVehiculo/'+0+'/'+id_gde_actual+'/'+0);
				}else{
					app.dialog.alert("Antes de continuar. Debe capturar las imágenes del camión cargado","Evidencia", function () {
						return false;
					});
				}

			});
		});
  		
	});

});


function capturar_evidencia_camion_cargado(tipo_evidencia){

    //TODO: BUSCAR LA ULTIMA EVIDENCIA CAMION VACIO DE LA GUIA Y A PARTIR DE ESAS FECHA CALCULAR LA HORA

	if(tipo_evidencia==2){
		capturePhotoWithFile(id_gde_actual, tipo_evidencia);
	}

	if(tipo_evidencia==4){
		capturePhotoWithFile(id_gde_actual, tipo_evidencia);
	}
	
}


function cargar_evidencia_camion_cargado(evidencia, tipo){
	if(tipo==2){
		$$("#imagen_camion_cargado").attr("src",evidencia.ARCHIVO);
	}
	if(tipo==4){
		$$("#imagen_camion_cargado_2").attr("src",evidencia.ARCHIVO);
	}
}


function volver_punto_gde(){
	mainView.router.navigate('/PuntosGDE/'+0+'/'+id_gde_actual+'/'+0);
}