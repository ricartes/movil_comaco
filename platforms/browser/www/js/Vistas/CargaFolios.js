var $$ = Dom7;

$$(document).on('page:init', '.page[data-name="carga-folios"]', function (e,page) {

	

	$$('#btn_carga_folios').on('click', function () {

		app.dialog.confirm('¿Está seguro que desea cargar folios?\n...',"Carga Folios" ,function () {
			envio_automatico_activado=0;
			$$('#btn_atras_folio').addClass("disabled");
			$$('#btn_carga_folios').addClass("disabled");
			app.dialog.preloader("Cargando folios");
			carga_folios("1", function(arreglo_rango_folio) {

				if(arreglo_rango_folio==-1){
					envio_automatico_activado=1;
					app.dialog.close();
					app.dialog.alert("Aun existen folios disponibles","Carga folios", function () {					
						mainView.router.navigate('/');
						seleccion_zonas();
					});

				}else{

					if(arreglo_rango_folio==-2){
						envio_automatico_activado=1;
						app.dialog.close();
						$$('#btn_atras_folio').removeClass("disabled");
						$$('#btn_carga_folios').removeClass("disabled");
						app.dialog.alert("No hay conexión a Internet disponible","Carga folios", function () {});
					}else{
						if(arreglo_rango_folio==-4){
							envio_automatico_activado=1;
							app.dialog.close();
							$$('#btn_atras_folio').removeClass("disabled");
							$$('#btn_carga_folios').removeClass("disabled");
							app.dialog.alert("No se ha podido establecer la conexión al servidor","Carga folios", function () {
								mainView.router.navigate('/');
								seleccion_zonas();});
						}else{

							if(arreglo_rango_folio==0){
								envio_automatico_activado=1;
								app.dialog.close();
								$$('#btn_atras_folio').removeClass("disabled");
								$$('#btn_carga_folios').removeClass("disabled");
								app.dialog.alert("No hay folios disponibles para cargar. Comuníquese con el administrador","Carga folios", function () {					
									mainView.router.navigate('/');
									seleccion_zonas();
								});
							}else{

								enviar_confirmacion_carga_folios(arreglo_rango_folio, function(result1) {
									envio_automatico_activado=1;
									$$('#btn_atras_folio').removeClass("disabled");
									$$('#btn_carga_folios').removeClass("disabled");
									app.dialog.close();
									app.dialog.alert("Folios cargados correctamente","Carga folios", function () {					
										mainView.router.navigate('/');
										seleccion_zonas();
									});
								});
							}
						}
					}
				}
			});
		});
	});
});





function carga_folios(estado,callback){

	var rut =Obtener_dato_local("rut_activo");
	var empresa =Obtener_dato_local("empresa_activo");
	

	if(checkConnection()=="No network connection"){
		typeof callback == "function" && callback(-2);
	}else{

		comprueba_conexion("0", function(result_conexion) {
			if(result_conexion==1){
				ws_carga_folios(rut,empresa, function(arreglo_rango_folio) {

					if(arreglo_rango_folio==0){
						typeof callback == "function" && callback(0);

					}else{
						var i,j,guardados=0;
						for( i =0;i<arreglo_rango_folio.length;i++){
							arreglo_rango_folio[i].CAF="";
							GuardaFolio(arreglo_rango_folio[i], function(result) {
								guardados++;

								if(confirma_guardado(arreglo_rango_folio.length,guardados)){
									typeof callback == "function" && callback(arreglo_rango_folio);
								}
							});			
						}
					}
				});
			}else{
				typeof callback == "function" && callback(-4);
			}
		});
	}
}


function GuardaFolio(rango_folio, callback){


	var conta=0;
	//alert(rango_folio.FOLIO_INICIAL+"- "+rango_folio.FOLIO_FINAL);
	for(var i= rango_folio.FOLIO_INICIAL;i<=rango_folio.FOLIO_FINAL; i++){
   		//alert(i);
   		var id =i;
   		
   		var folio = new CL_Folio(rango_folio.EMP_ID,rango_folio.URF_ID,rango_folio.USU_RUT,i,'D');

   		DatosINsertFolio(folio, function(resultado) {
        	//alert("insertado: "+folio.NUM_FOLIO);
        	conta++;
        	if(confirma_guardado(rango_folio.CANTIDAD,conta)){
        		typeof callback == "function" && callback(1);
        	}


        });
   	}

   }



   function confirma_guardado(tamano,conta){
	//alert(conta+"--"+tamano);
	if(conta==tamano)return 1;
	else return 0;
}







