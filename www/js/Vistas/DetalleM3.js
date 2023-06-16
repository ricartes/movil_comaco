var $$ = Dom7;
var arregloM3=[];
var arreglo_indices =[];

var zona_activa;
var cod_producto;
var cod_proyecto;
var cod_cliente;
var cod_predio
var id_gde;
var gde_actual;
var precio_actual_m3;
var tipo_emision;

$$(document).on('page:init', '.page[data-name=detalle-aserrable]', function (e,page) {
	

	


	zona_activa=mainView.router.currentRoute.params.idzona;
	id_gde=mainView.router.currentRoute.params.idgde;
	tipo_emision=mainView.router.currentRoute.params.tipoemision;




	DATOS_seleccionar_gde(id_gde, function(result) {

		gde_actual=result;
		cod_producto=result.GDE_COD_PRODUCTO
		cod_proyecto=result.GDE_COD_PROYECTO
		cod_cliente=result.GDE_COD_CLIENTE

		

		obtiene_largoM3(1, function(a) {
			obtiene_precioM3(1, function(b) {
				DATOS_existe_diametros(id_gde, function(contador) {
					//("contador: "+contador);
					if(contador>0){
						//alert("HAY DIAMETROS... CARGAR");
						recargar_diametros(1, function(result) {

							//alert("se crearob los diametros");
						});

					}else{
						carga_diametros();

						crear_diametros(1, function(result) {

							//alert("se crearob los diametros");
						});
					}

				});
			
			});
		});

     });


	$$(document).on('change', '.trozos', function(){
	   var $row = $(this).closest("tr");    // Find the row

	   var diametro_posicion=$$(this).attr('id');
	   diametro_posicion=diametro_posicion.split("_");
	   diametro_posicion=parseInt(diametro_posicion[1]);
	   //alert(diametro_posicion);

	   

	 	var largo = parseFloat ($$("#largom3").val());
	 	var trozos =parseFloat($$(this).val());
	 	var posicion=arreglo_indices.indexOf(diametro_posicion); 

	 	


	 	if(isNaN(trozos)){
	 		trozos=0;
	 	}

			
	 	var volumen=calcula_volumenM3(diametro_posicion,largo,trozos);
	 	arregloM3[posicion].TROZOS=parseInt(trozos);
	 	arregloM3[posicion].VOLUMEN=volumen;
	 	console.log(arregloM3);

	 	calcula_totalM3();

	 	DATOS_actualiza_gdea_aserrable(gde_actual,arregloM3[posicion],function(result) {
			//alert("he actualizado el TROZO");
		});

	});


});


function aumentar_trozos(diametro){

	var trozos =parseFloat($$("#nropieza_"+diametro).val());
	var largo = parseFloat ($$("#largom3").val());
	var posicion=arreglo_indices.indexOf(diametro); 
	if(isNaN(trozos)){
	 	trozos=0;
	}

	trozos++;
	
	var volumen=calcula_volumenM3(diametro,largo,trozos);

	arregloM3[posicion].TROZOS=parseInt(trozos);
	arregloM3[posicion].VOLUMEN=volumen;
	console.log(arregloM3);
	 	//alert(volumen);


	 	//$row.find(".volumen").text(formatear_decimal(volumen));
	

	$$("#nropieza_"+diametro).val(trozos);

	DATOS_actualiza_gdea_aserrable(gde_actual,arregloM3[posicion],function(result) {
			calcula_totalM3();
		});


}

function pagina_comentarios_m3(){

	if($$("#total_vol").text()==0){
		alerta(10);
		return false;
	}


	if($$("#total_guia").text()==0){
		alerta(11);
		return false;
	}


	mainView.router.navigate('/Comentarios/'+zona_activa+'/'+id_gde+'/1/'+tipo_emision);
}


function carga_diametros(bandera){
	var htmls="";
	var iterador=0;
	it=2;
	vol=1.5;
	htmls+="<tr>";
	arregloM3=[];
	arreglo_indices=[];
	for(i=14;i<=76;i+=2){

		var detalle= new Cl_DetalleM3(i,0,0)
		detalle.GDE_UNIDAD_MEDIDA=gde_actual.GDE_UNIDAD_MEDIDA;
		detalle.ID_UNICO_MOVIL="GDEA"+obtener_IDUNICO();
		detalle.PRECIO_UNITARIO=precio_actual_m3;
		detalle.TOTAL=0;
		arregloM3.push(detalle);
		arreglo_indices.push(i);


		
		if(iterador%3==0 && i>0){
			htmls+="</tr>";
			htmls+="<tr>";
		}
			//htmls+="<td class='diametro numeric-cell'>"+i+"</td>";
		htmls+="<td class='numeric-cell' style='width:33%'><input type='hidden' class='diametro'  value='"+i+"'/> <div class='divtrozo' onclick='aumentar_trozos("+i+")' style=' margin-top:6px; height:60px; border: 1px solid white;background:green;font-size: 30px; text-align: center;'><strong style='margin-top:50%;'>"+i+"</strong> </div><input type='number' maxlength='5' class='trozos' value='' id='nropieza_"+i+"'' style='width:100%;font-size: 24px; background:red; font-weight: bold;height:40px;margin-top:3px;text-align: center;  border: 1px solid white;'/> </td>";
	
		it++;
		vol+=0.5;
		iterador++;
	}
	$$("#datos_m3").html(htmls);
}





function recargar_diametros(bandera,callback){
	DATOS_seleccionar_diametros(id_gde, function(result) {
		arregloM3=result;
		/*alert(arregloM3[0].DIAMETRO);
		alert(arregloM3[0].TROZOS);
		alert(arregloM3[0].VOLUMEN);*/

		var htmls="";
		var iterador=0;
		it=2;
		vol=1.5;
		htmls+="<tr>";
		for(i=0;i<arregloM3.length;i++){
			arreglo_indices.push(arregloM3[i].DIAMETRO);
			if(iterador%3==0 && i>0){
			htmls+="</tr>";
			htmls+="<tr>";
			}
			var valor=arregloM3[i].TROZOS;
			if(arregloM3[i].TROZOS==0){
				valor='';
			}
			if(gde_actual.GDE_ESTADO_MOVIL=="I" || gde_actual.GDE_ESTADO_MOVIL=="M" || gde_actual.GDE_ESTADO_MOVIL=="E" || gde_actual.GDE_ESTADO_MOVIL=="N"){
				htmls+="<td class='numeric-cell' style='width:25%;'><input type='hidden' class='diametro'  value='"+arregloM3[i].DIAMETRO+"'/> <div class='divtrozo'  style=' margin-top:6px; height:60px; border: 1px solid white;background:green;font-size: 30px; text-align: center;font-size: 18px;'><strong style='margin-top:50%;'>"+arregloM3[i].DIAMETRO+"</strong> </div><input type='number' maxlength='5' class='trozos' disabled value='"+valor+"' id='nropieza_"+arregloM3[i].DIAMETRO+"'' style='width:100%; font-size: 24px;background:red; font-weight: bold;height:40px;margin-top:3px;text-align: center;  border: 1px solid white;'/></td>";
			}else{
				htmls+="<td class='numeric-cell' style='width:25%;'><input type='hidden' class='diametro'  value='"+arregloM3[i].DIAMETRO+"'/> <div class='divtrozo' onclick='aumentar_trozos("+arregloM3[i].DIAMETRO+")' style=' margin-top:6px; height:60px; border: 1px solid white;background:green;font-size:30px; text-align: center;'><strong style='margin-top:50%;'>"+arregloM3[i].DIAMETRO+"</strong> </div><input type='number' maxlength='5' class='trozos' value='"+valor+"' id='nropieza_"+arregloM3[i].DIAMETRO+"'' style='width:100%;font-size: 24px; background:red; font-weight: bold;height:40px;margin-top:3px;text-align: center;  border: 1px solid white;'/></td>";
			}
			
		it++;
		vol+=0.5;
		iterador++;
		}
		$$("#datos_m3").html(htmls);
		//calcula_totalM3();

		$("#total_vol").text(formatear_decimal_m3(gde_actual.GDE_VOLUMEN_TOTAL));
		$("#total_guia").text(formatear_precio(gde_actual.GDE_TOTAL));

		typeof callback == "function" && callback(1);

	});	

}



function crear_diametros(bandera,callback){
	guardado=0;
	for (var i = arregloM3.length - 1; i >= 0; --i)
	{	
		DATOS_guarda_gdea_aserrable(gde_actual,arregloM3[i], function(result) {
			guardado++;
			if(confirma_guardado_m3(guardado,arregloM3.length)==1){
				typeof callback == "function" && callback(1);
			}

		});
	}



}

function calcula_volumenM3(diametro,largo,trozos){
	/*alert(diametro);
	alert(largo);
	alert(trozos);*/
	var area=((diametro/100)*(diametro/100));
	var volumen = (area*largo*trozos);
	return volumen;
}

function calcula_totalM3(){
	total=0;

	for (var i = arregloM3.length - 1; i >= 0; --i)
	{
		total += arregloM3[i].VOLUMEN;
	}

	total_precio =total*precio_actual_m3;
	$("#total_vol").text(formatear_decimal_m3(total));
	$("#total_guia").text(formatear_precio(total_precio));


	DATOS_actualiza_totales(id_gde,total,total_precio,function(result) {
			//alert("totales actualizados");
	});



}



function obtiene_largoM3(bandera,callback){


	DATOS_rut_por_codigo_cliente(cod_cliente, function(rut_cliente) {
		var rut_parte = rut_cliente.split("-");
        var rut =rut_parte[0];
        var dv =rut_parte[1];

        DATOS_cliente_es_emisor(rut,dv, function(contador) {

        	if(contador>0){

        		/*alert(gde_actual.GDE_COD_PRODUCTO);
        		alert(gde_actual.GDE_COD_CLIENTE);
        		alert(gde_actual.GDE_COD_PROVEEDOR);
        		alert(gde_actual.GDE_ROL_PREDIO);*/
        		DATOS_largo_producto_OC(gde_actual.GDE_COD_PRODUCTO,gde_actual.GDE_COD_CLIENTE,gde_actual.GDE_COD_PROVEEDOR,gde_actual.GDE_ROL_PREDIO, function(largo) {
		
			        if(largo!=-1){

			           $$("#largom3").val(largo);

			            DATOS_actualiza_largo_trozo_gde(id_gde,largo, function(result) {
			            	typeof callback == "function" && callback(1);

			            });


			        }else{
			            hay_parametro=0;
			            typeof callback == "function" && callback(1);
			        }
			        
			    });

        	}else{
        		DATOS_largo_producto(cod_producto,cod_proyecto,cod_cliente, function(largo) {
		
			        if(largo!=-1){

			           $$("#largom3").val(largo);
			           DATOS_actualiza_largo_trozo_gde(id_gde,largo, function(result) {
			            	typeof callback == "function" && callback(1);
			            });
			        }else{
			            hay_parametro=0;
			            typeof callback == "function" && callback(1);
			        }
			        
			    });
        	}

        });

	});
	
	/*alert(cod_producto)
	alert(cod_proyecto)
	alert(cod_cliente)*/

}


function obtiene_precioM3(bandera,callback){
	DATOS_precio_producto(cod_producto,cod_cliente, function(precioproducto) {
		//alert(precioproducto);
		if(precioproducto!=-1){
			

			precio_actual_m3=precioproducto.PPR_PRECIO;

			$$("#preciom3").val(precio_actual_m3);
		}else{
			//alert("precio no encontrado");
			DATOS_seleccionar_PrecioPorDefecto(2, function(preciodefecto) {

				precio_actual_m3=parseFloat(preciodefecto);
				$$("#preciom3").val(precio_actual_m3);
			});
		}
		  typeof callback == "function" && callback(1);

    });

}


function confirma_guardado_m3(conta,tamano){

	//alert(conta+"--"+tamano);
	if(conta==tamano)return 1;
	else return 0;
}

function volver_encabezadoM3(){
	//alert(zona_activa);
	//alert(id_gde);
    mainView.router.navigate('/EmisionDesdeFaena/'+zona_activa+'/'+id_gde+'/'+tipo_emision);
}