
$$(document).on('page:init', '.page[data-name="lista-guias"]', function (e,page) {
	listado_guias("","",-1);
});



function listado_guias(fecha_inicial, fecha_final,numero_guia){

	var estado=-1;
	DATOS_seleccionar_gde_proveedor_por_estado_lista_PRUEBA(estado, fecha_inicial, fecha_final,numero_guia, function(result) {
		var htmls="";
		
		
        //alert(json1);

		for(i=0;i<result.length;i++){
			var estado_string="";
			//alert(result[i].GDE_TIPO_EMISION);
			
			if(result[i].GDE_ESTADO_MOVIL=="B")estado_string="BORRADOR";
			if(result[i].GDE_ESTADO_MOVIL=="M")estado_string="EMITIDA";
			if(result[i].GDE_ESTADO_MOVIL=="P")estado_string="PROVISORIA";
			if(result[i].GDE_ESTADO_MOVIL=="I")estado_string="IMPRESA";
			if(result[i].GDE_ESTADO_MOVIL=="E"){
				estado_string="ENVIADA";

			
			}

			if (result[i].ENVIADO==1){
				estado_string="ENVIADA";
			}

			if(result[i].GDE_ESTADO_MOVIL=="N" && result[i].ENVIADA==0 ){
				estado_string="ANULADA";
			}
			if(result[i].GDE_ESTADO_MOVIL=="SD")estado_string="DATOS NO ENCONTRADOS";


			var num_string ="SIN FOLIO ASIGNADO"
			if(result[i].GDE_ESTADO_MOVIL=="I" || result[i].GDE_ESTADO_MOVIL=="E" || result[i].GDE_ESTADO_MOVIL=="N" )
			{
				num_string="N° "+result[i].ROWID;
			}


			
		
			var link='<a href="#" id="detalle_guia_'+result[i].ROWID+'" onclick="abrir_guia(this,\'' + result[i].ROWID +'\',\'' + 0 +'\',\'' + 0 +'\',\'' + result[i].GDE_ESTADO_MOVIL +'\',\'' + 0 +'\');" class="item-link item-content"><div class="item-inner"><div class="item-title"> <div class="item-header">'+result[i].GDE_FECHA_FORMAT+' ('+estado_string+')<br>Proveedor: '+result[i].NOMBRE_USUARIO_PROV+'('+result[i].RUT_USUARIO_PROV+') <br>Cliente: '+result[i].GDE_NOMBRE_CLIENTE+' ('+result[i].GDE_COD_CLIENTE+')  <br>Camión: '+result[i].GDE_PATENTE_CAMION+' </div>| Guía '+num_string+'</div> </div></div></a>';
			htmls+="<li>";

			//alert(link);
			
			if( result[i].GDE_ESTADO_MOVIL=="E" ){
				link='<a href="#" id="detalle_guia_'+result[i].ROWID+'" onclick="abrir_guia(this,\'' + result[i].ROWID +'\',\'' + 0 +'\',\'' + 0 +'\',\'' + result[i].GDE_ESTADO_MOVIL +'\',\'' + 0 +'\');" class="item-link item-content"><div class="item-inner"><div class="item-title"> <div class="item-header">'+result[i].GDE_FECHA_FORMAT+' ('+estado_string+')<br>Proveedor: '+result[i].NOMBRE_USUARIO_PROV+'('+result[i].RUT_USUARIO_PROV+') <br>Cliente: '+result[i].GDE_NOMBRE_CLIENTE+' ('+result[i].GDE_COD_CLIENTE+')  <br>Camión: '+result[i].GDE_PATENTE_CAMION+' </div>| Guía '+num_string+'</div> </div></div></a>';
			}


			if( result[i].GDE_ESTADO_MOVIL=="SD" ){
				link='<a href="#" id="detalle_guia_'+result[i].ROWID+'"  class="item-link item-content"><div class="item-inner"><div class="item-title"> <div class="item-header">'+result[i].GDE_FECHA_FORMAT+' ('+estado_string+')<br>Proveedor: '+result[i].NOMBRE_USUARIO_PROV+'('+result[i].RUT_USUARIO_PROV+') <br>Cliente: '+result[i].GDE_NOMBRE_CLIENTE+' ('+result[i].GDE_COD_CLIENTE+') <br>Camión: '+result[i].GDE_PATENTE_CAMION+' </div>| Guía '+num_string+'</div> </div></div></a>';
			}


			htmls+=link;
			htmls+="</li>";
			//alert(result[i].ROWID);
		}

		$$("#lista_guias").html(htmls);


	});
}

function volver_menu_principal_guias(){

	mainView.router.navigate('/');
}



function abrir_guia(item,id,zona,tipo_emision,estado_guia,tipo_volumen){
	/*alert(id);
	alert(zona);
	alert(tipo_volumen);
	alert(tipo_emision);*/


	if(id=="" || id==null || zona=="" || zona==null || tipo_volumen=="" || tipo_volumen==null || tipo_emision=="" || tipo_emision==null){
		return false;
	}else{
		if(estado_guia=="E" || estado_guia=="I" || estado_guia=="N"){
			//alert("funcionalidad en proceso");
			mainView.router.navigate('/VistaPreliminar/'+zona+'/'+id+'/'+tipo_volumen+'/'+tipo_emision+'/1');
		}else{
			mainView.router.navigate('/EmisionDesdeFaena/'+zona+'/'+id+'/'+tipo_emision);
		}
	}


	
}

function filtro_fecha_lista(valor){

	if(valor==1){
		$$("#tx_numero_guia").val("");
		if($$("#tx_fecha_inicial_lista").val()=="" || $$("#tx_fecha_final_lista").val()=="" ){
		app.dialog.alert("Fecha inicial y fecha final es obligatorio para filtrar por fechas ","Lista guías", function () {});
		}else{
			var arreglo_fecha_inicio =$$("#tx_fecha_inicial_lista").val()
			var arreglo_fecha_final =$$("#tx_fecha_final_lista").val()

			var fecha_inicial = arreglo_fecha_inicio;
			var fecha_final = arreglo_fecha_final;
			



			listado_guias(arreglo_fecha_inicio,arreglo_fecha_final,-1);



			//alert(fecha_inicial);
			//alert(fecha_final);	
		}

	}else{

		var num_guia_filtrar=-1;
		$$("#tx_fecha_inicial_lista").val("");
		$$("#tx_fecha_final_lista").val("");

		if(valor==2)$$("#tx_numero_guia").val("");
		
		if(valor==3){
			num_guia_filtrar=$$("#tx_numero_guia").val();
		}

		listado_guias("","",num_guia_filtrar);
	}
}