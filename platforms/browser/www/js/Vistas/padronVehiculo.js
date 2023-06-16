var id_gde_actual;
var tipo_evidencia_padron=5;

$$(document).on('page:init', '.page[data-name="padron-vehiculo"]', function (e,page) {

	id_gde_actual=mainView.router.currentRoute.params.idgde;


	DATOS_seleccionar_evidencia_guia(id_gde_actual,tipo_evidencia_padron, function(datos_evidencia) {
		if(datos_evidencia!="-1"){
			$$("#imagen_padron").attr("src",datos_evidencia[0].ARCHIVO);
		}
	});




	$$("#btn_evidencia_guia").click(function() {

		DATOS_seleccionar_evidencia_guia(id_gde_actual, tipo_evidencia_padron, function(datos_evidencia) {
			
			if(datos_evidencia!="-1"){
				mainView.router.navigate('/EvidenciaGuia/'+0+'/'+id_gde_actual+'/'+0);
			}else{
				app.dialog.alert("Antes de continuar. Debe capturar una imagen del padrón del vehículo","Evidencia", function () {
					return false;
				});
			}
		});
  		
	});

});




function capturar_evidencia_padron(tipo_evidencia){
	if(tipo_evidencia==5){
		capturePhotoWithFile(id_gde_actual, tipo_evidencia);
	}
	
}


function cargar_evidencia_padron_vehiculo(evidencia, tipo){
	//alert(evidencia.ARCHIVO);
	if(tipo==5){
		$$("#imagen_padron").attr("src",evidencia.ARCHIVO);
	}
	

}



function volver_camion_cargado(){
  mainView.router.navigate('/CamionCargado/'+0+'/'+id_gde_actual+'/'+0);
}

/*function volver_emision(){

	mainView.router.navigate('/EmisionDesdeFaena/'+0+'/'+id_gde_actual+'/'+0);

}*/

