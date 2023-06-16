var $$ = Dom7;

$$(document).on('page:init', '.page[data-name="libera-folios"]', function (e,page) {
	var rut =Obtener_dato_local("rut_activo");
	var empresa =Obtener_dato_local("empresa_activo");
	carga_grilla_folios(empresa,rut);

	
});



function carga_grilla_folios(empresa,rut){

 DATOS_SelectRangoFolios(empresa,rut, function(rango_folios) {
	 	if(rango_folios==-1){
	 		app.dialog.alert("No hay folios cargados. Comuníquese con el administrador","Carga folios", function () {					
				mainView.router.navigate('/');
				seleccion_zonas();
			});
	 	}else{
	 		var htmls="";
	 		for(i=0;i<rango_folios.length;i++){

	 			if(rango_folios[i].DISPONIBLE>0){
	 				htmls+="<tr ><td class='numeric-cell' style='width: 50%; padding-right: 100px;'>"+rango_folios[i].FOLIO_INICIAL+"- "+rango_folios[i].FOLIO_FINAL+" </td>   <td class='numeric-cell' style='width: 50%; padding-right: 100px;'>"+rango_folios[i].DISPONIBLE+"</td> <td class='numeric-cell' style='width: 50%; padding-right: 100px;'> <button class='col button button-fill' onclick='liberar_rango("+rango_folios[i].URF_ID+");' >Liberar</button></td></tr>";
	 			}else{
	 				htmls+="<tr ><td class='numeric-cell' style='width: 50%; padding-right: 100px;'>"+rango_folios[i].FOLIO_INICIAL+"- "+rango_folios[i].FOLIO_FINAL+" </td>   <td class='numeric-cell' style='width: 50%; padding-right: 100px;'>"+rango_folios[i].DISPONIBLE+"</td> <td class='numeric-cell' style='width: 50%; padding-right: 100px;'></td> </tr>";
	 			}

	 			
	 		}

	 		$$("#tb_liberar").html(htmls);
	 	}

	 });

}

function liberar_rango(id_rango){
	DATOS_SelectRangoFolioPorID(id_rango, function(rango_folio) {
		app.dialog.prompt('Ingresar cantidad folios a liberar',"GFE", function (cantidad) {
			if(!isNaN(cantidad)){
				if(cantidad>rango_folio[0].DISPONIBLE || cantidad<1){

					if(cantidad>rango_folio[0].DISPONIBLE){
						app.dialog.alert("Cantidad de folios a liberar es mayor que el disponible","Liberar folios");
						return false;
					}
					if(cantidad<1){
						app.dialog.alert("Cantidad de folios a liberar debe ser mayor a 0","Liberar folios");
						return false;
					}

					
				}else{
					app.dialog.preloader("Liberando folios");
					var cantidad_int =parseInt(cantidad);
					var maximo = parseInt(rango_folio[0].FOLIO_FINAL);
					var disponible =parseInt(rango_folio[0].DISPONIBLE);
					
					if(checkConnection()=="No network connection"){
						app.dialog.close();
						app.dialog.alert("No hay conexión a Internet","GFE");
						return false;
					}else{
						
						comprueba_conexion("0", function(result_conexion) {
							if(result_conexion==1){
								liberar_rango_folios_ws(Obtener_dato_local("rut_activo"),id_rango,maximo,cantidad_int, function(respuesta) {
									
									if(respuesta=="ok"){
										var minimo;
										if(disponible==cantidad_int)minimo=(maximo-cantidad_int)+1;
										else minimo=maximo-cantidad_int;
										DATOS_BorrarFolios(Obtener_dato_local("rut_activo"),id_rango,minimo, function(borrado) {
											//alert("BORRO");
											var cantidad_nueva =(disponible-cantidad_int);
											DATOS_reasigna_rango_folio(Obtener_dato_local("rut_activo"),id_rango,minimo,cantidad_nueva, function(actualizado) {
													app.dialog.close();
													var rut =Obtener_dato_local("rut_activo");
													var empresa =Obtener_dato_local("empresa_activo");
													carga_grilla_folios(empresa,rut);
													app.dialog.alert("Folios liberados correctamente","Liberar folios");
											});
										});
									}
									envio_automatico_activado=1;
								});
							}else{
								app.dialog.close();
								app.dialog.alert("No se ha podido establecer la conexión al servidor","Liberar folios");
								return false;
							}
						});
					}
				}
			}else{
				
				app.dialog.alert("Dato debe ser numérico","Liberar folios");
				return false;
			}
		});
	});
}


