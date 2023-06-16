var zona_activa;
var id_gde;
var tipo_volumen;
var gde_actual;
var tipo_emision

$$(document).on('page:init', '.page[data-name="Comentarios"]', function (e,page) {


	zona_activa=mainView.router.currentRoute.params.idzona;
	id_gde=mainView.router.currentRoute.params.idgde;
	tipo_volumen=mainView.router.currentRoute.params.tipovolumen;
	tipo_emision=mainView.router.currentRoute.params.tipoemision;

	cargar_datos_usuario(zona_activa);

	jQuery.datetimepicker.setLocale('es');
	$('#tx_horallegada, #tx_horasalida').datetimepicker({
	 	format:'d/m/Y H:i',
	 	//mask:true
	});


	DATOS_seleccionar_gde(id_gde, function(result) {

		gde_actual=result;

		//alert(gde_actual.GDE_PLAN_MANEJO);
		$$("#tx_comentario").val(gde_actual.GDE_COMENTARIO);
		$$("#tx_horallegada").val(gde_actual.GDE_HORA_LLEGADA);
		$$("#tx_horasalida").val(gde_actual.GDE_HORA_SALIDA);
		$$("#tx_sector_origen").val(gde_actual.GDE_SECTOR_ORIGEN);
		$$("#tx_destino").val(gde_actual.GDE_DESTINO);
		$$("#tx_guia_proveedor").val(gde_actual.GDE_GUIA_PROVEEDOR);
		$$("#tx_volumen_proveedor").val(gde_actual.GDE_VOLUMEN_PROVEEDOR);
		$$("#tx_anio_cosecha").val(gde_actual.GDE_ANO_COSECHA);
		$$("#tx_anio_plantacion").val(gde_actual.GDE_ANIO_PLANTACION);
		$$("#tx_plan_manejo").val(gde_actual.GDE_PLAN_MANEJO);





		if(gde_actual.GDE_COSECHA_PAGADA==1){
			//alert("si1");
			$$("#chk_cosecha_pagada").prop('checked', true);
		}

		if(gde_actual.GDE_MADERA_PAGADA==1){
			//alert("si")
			$$("#chk_madera_pagada").prop('checked', true);
		}


		if(gde_actual.GDE_ESTADO_MOVIL=="I" || gde_actual.GDE_ESTADO_MOVIL=="E" || gde_actual.GDE_ESTADO_MOVIL=="M" ||  gde_actual.GDE_ESTADO_MOVIL=="N" ){
			$$("#tx_comentario").prop("disabled", true);
			$$("#tx_horallegada").prop("disabled", true);
			$$("#tx_horasalida").prop("disabled", true);
			$$("#tx_sector_origen").prop("disabled", true);
			$$("#tx_destino").prop("disabled", true);
			$$("#tx_guia_proveedor").prop("disabled", true);
			$$("#tx_volumen_proveedor").prop("disabled", true);
			$$("#tx_anio_cosecha").prop("disabled", true);
			$$("#tx_anio_plantacion").prop("disabled", true);
			$$("#chk_cosecha_pagada").prop("disabled", true);
			$$("#chk_madera_pagada").prop("disabled", true);
			$$("#tx_plan_manejo").prop("disabled", true);
		}else{

			var currentDate = new Date();

			var date = currentDate.getDate();
			var month = currentDate.getMonth(); //Be careful! January is 0 not 1
			var year = currentDate.getFullYear();


			var dia =currentDate.getDate();

			if(dia<10){
				dia="0"+currentDate.getDate();
			}



			var mes =currentDate.getMonth()+1;
			

			if(mes<10){
				mes=currentDate.getMonth()+1;
			}


			var hora =currentDate.getHours()
			
			if(hora<10){
				hora="0"+currentDate.getHours();
			}

			var minuto =currentDate.getMinutes()
			if(minuto<10){
				minuto="0"+currentDate.getMinutes();
			}


			var dateString = dia + "/" +(mes) + "/" + year+" "+hora + ":" + minuto;
			
			$$("#tx_horallegada").val(dateString);
			$$("#tx_horasalida").val(dateString);

			


		}
	});
});


function pagina_impresion(){


	if($$("#tx_guia_proveedor").val().length>12 && $$("#tx_guia_proveedor").val()!="" ){
		alerta(13);
		return false;
	}

	if($$("#tx_volumen_proveedor").val().length>12 && $$("#tx_volumen_proveedor").val()!=""){
		alerta(14);
		return false;
	}

	if(  ($$("#tx_anio_plantacion").val().length!=4 && $$("#tx_anio_plantacion").val()!="" )){
		alerta(15);
		return false;
	}



	if( (!ValidateDate($$("#tx_horallegada").val()) && $$("#tx_horallegada").val()!="") || (!ValidateDate($$("#tx_horasalida").val()) &&  $$("#tx_horasalida").val()!="")) {
		alerta(6);
		return false;
	}

	var horallegada =$$("#tx_horallegada").val();
	DATOS_actualiza_horallegada(id_gde,horallegada, function(result) {
		var horasalida =$$("#tx_horasalida").val();
		DATOS_actualiza_horasalida(id_gde,horasalida, function(result) {
			mainView.router.navigate('/Impresion/'+zona_activa+'/'+id_gde+'/'+tipo_volumen+'/'+tipo_emision);
		});

	});



	
}


function volver_volumen(){
	if(tipo_volumen=="1"){
		mainView.router.navigate('/DetalleM3/'+zona_activa+'/'+id_gde+'/'+tipo_emision);
	}else{
		mainView.router.navigate('/DetalleMR/'+zona_activa+'/'+id_gde+'/'+tipo_emision);
	}
}



function cosecha_pagada(){
	var cosecha_check;

	if($$('#chk_cosecha_pagada').prop('checked')){
		cosecha_check=1;
	}else{
		cosecha_check=0;
	}

	DATOS_actualiza_cosecha_pagada(id_gde,cosecha_check, function(result) {
		//alert("guardado cosecha pagada");

	});

}

function madera_pagada(){
	var madera_check;

	if($$('#chk_madera_pagada').prop('checked')){
		madera_check=1;
	}else{
		madera_check=0;
	}
	DATOS_actualiza_madera_pagada(id_gde,madera_check, function(result) {
		//alert("guardado madera pagada");

	});

}


function comentario_change(){
	//alert($$("#tx_comentario").val());

	var comentario =$$("#tx_comentario").val();
	
	DATOS_actualiza_comentario(id_gde,comentario, function(result) {
		//alert("guardado madera pagada");

	});
}


function horallegada_change(){
	var horallegada =$$("#tx_horallegada").val();
	//alert(comentario);

	DATOS_actualiza_horallegada(id_gde,horallegada, function(result) {
		//alert("guardado hora llegada");

	});
}


function horasalida_change(){
	var horasalida =$$("#tx_horasalida").val();
	//alert(comentario);

	DATOS_actualiza_horasalida(id_gde,horasalida, function(result) {
		//alert("guardado hora salida");

	});
}


function sectororigen_change(){
	var sectororigen =$$("#tx_sector_origen").val();
	//alert(comentario);

	DATOS_actualiza_sectororigen(id_gde,sectororigen, function(result) {
		//alert("guardado hora salida");

	});

}


function destino_change(){
	var destino =$$("#tx_destino").val();
	//alert(comentario);

	DATOS_actualiza_destino(id_gde,destino, function(result) {
		//alert("guardado hora salida");

	});

}

function guiaproveedor_change(){
	var guiaproveedor =$$("#tx_guia_proveedor").val();
	//alert(comentario);

	DATOS_actualiza_guiaproveedor(id_gde,guiaproveedor, function(result) {
		//alert("guardado hora salida");

	});	
}


function volumenproveedor_change(){
	var volumenproveedor =$$("#tx_volumen_proveedor").val();
	//alert(comentario);

	DATOS_actualiza_volumenproveedor(id_gde,volumenproveedor, function(result) {
		//alert("guardado hora salida");

	});	
}


function aniocosecha_change(){
	var aniocosecha = $$("#tx_anio_cosecha").val();


	//alert(aniocosecha);

	DATOS_actualiza_aniocosecha(id_gde,aniocosecha, function(result) {
		//alert("guardado aniocosecha");

	});	

}

function anioplantacion_change(){
	var aniocplantacion = parseInt ($$("#tx_anio_plantacion").val());


	//alert(aniocosecha);

	DATOS_actualiza_anioplantacion(id_gde,aniocplantacion, function(result) {
		//alert("guardado hora salida");

	});	

}


function plan_manejo_change(){
	//alert("cambia plan de manejo");
	var planmanejo =$$("#tx_plan_manejo").val();
	//alert(planmanejo);

	DATOS_actualiza_planmanejo(id_gde,planmanejo, function(result) {
		//alert("guardado planmanejo");

	});

}