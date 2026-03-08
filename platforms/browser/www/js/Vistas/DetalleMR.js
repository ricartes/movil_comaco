var $$ = Dom7;
var zona_activa;
var cod_producto;
var cod_proyecto;
var cod_cliente;
var cod_predio
var precio_actual;
var largo_actual;
var total_volumen_actual=0;
var total_precio_actual=0;
var id_gde;
var gde_actual;
var arreglo =[]
var tipo_emision;
var advertido;
var orden_actual;


$$(document).on('page:init', '.page[data-name="detalle-pulpable"]', function (e,page) {

	

	zona_activa=mainView.router.currentRoute.params.idzona;
	id_gde=mainView.router.currentRoute.params.idgde;
	tipo_emision=mainView.router.currentRoute.params.tipoemision;

	advertido=0;



	//width:100%; border: 1px solid white;height: 40px;font-size: 24px;
	if(Obtener_dato_local("tema_oscuro")=="no" || Obtener_dato_local("tema_oscuro")==null ){
		$$(".ancho").css("border","1px solid black");
		$$(".alturaizq").css("border","1px solid black");
		$$(".alturader").css("border","1px solid black");
	}




	/*$$("#largomr").val(3.2);
	$$("#preciomr").val(22000);*/
	

	

	DATOS_seleccionar_gde(id_gde, function(result) {
		
		gde_actual=result;
		
		cod_producto=result.GDE_COD_PRODUCTO
		cod_proyecto=result.GDE_COD_PROYECTO
		cod_cliente=result.GDE_COD_CLIENTE
		orden_actual=result.GDE_ID_OC;


		obtiene_largo(1, function(a) {
			obtiene_precio(1, function(b) {
				DATOS_existe_bancos(id_gde, function(contador) {
					
					if(contador>0){
						recargar_bancos(1,function(result2) {
							//alert("REcargar bancos");
						});
					}else{
						crear_bancos(1,function(result3) {
							//alert("cargar bancos");
						});
					}

				});

			});


		});

	});



	





	$$(document).on('input', '.ancho', function(){

		advertido=0;
		//alert("cambio");
	    var $row = $$(this).closest("tr");    // Find the row
	 	var banco = parseInt($row.find(".banco").text()); // Find the text
	 	var altura_izquierda = parseFloat($row.find(".alturaizq").val());
	 	var altura_derecha = parseFloat($row.find(".alturader").val());
	 	var largo = parseFloat ($$("#largomr").val());
	 	var ancho = parseFloat($row.find(".ancho").val());
	 	var precio = parseFloat ($$("#preciomr").val());

	 	


	 	if(isNaN(altura_izquierda))altura_izquierda=0;
	 	if(isNaN(altura_derecha))altura_derecha=0;
	 	if(isNaN(ancho))ancho=0;

	 	var volumen=calcula_volumen(banco,ancho,altura_izquierda,altura_derecha,largo,precio);



	 	$row.find(".volumen").text(formatear_decimal(volumen));

	 	if(volumen==0)$row.find(".volumen").text("");

	 		//alert("he actualizado el total");
	 		DATOS_actualiza_gdep_pulpable(gde_actual,arreglo[banco-1],function(result) {
				calcula_totalMR(1, function(result1) {
				//calcula_total(1);


				});
			});
	 	
	 	});


	$$(document).on('input', '.alturaizq', function(){
		advertido=0;
	    var $row = $$(this).closest("tr");    // Find the row
	 	var banco = parseInt($row.find(".banco").text()); // Find the text
	 	var altura_izquierda = parseFloat($row.find(".alturaizq").val());
	 	var altura_derecha = parseFloat($row.find(".alturader").val());
	 	var largo = parseFloat ($$("#largomr").val());
	 	var ancho = parseFloat($row.find(".ancho").val());
	 	var precio = parseFloat ($$("#preciomr").val());

	 	if(isNaN(altura_izquierda))altura_izquierda=0;
	 	if(isNaN(altura_derecha))altura_derecha=0;
	 	if(isNaN(ancho))ancho=0;

	 	var volumen=calcula_volumen(banco,ancho,altura_izquierda,altura_derecha,largo,precio);
	 	$row.find(".volumen").text(formatear_decimal(volumen));
	 	if(volumen==0)$row.find(".volumen").text("");

	 	DATOS_actualiza_gdep_pulpable(gde_actual,arreglo[banco-1],function(result) {
			//alert("he actualizado el banco");
			calcula_totalMR(1, function(result1) {
				//calcula_total(1);


			});
		});


	 });



	$$(document).on('input', '.alturader', function(){
		//alert("entro");
		advertido=0;
	    var $row = $$(this).closest("tr");    // Find the row
	 	var banco = parseInt($row.find(".banco").text()); // Find the text
	 	var altura_izquierda = parseFloat($row.find(".alturaizq").val());
	 	var altura_derecha = parseFloat($row.find(".alturader").val());
	 	var largo = parseFloat ($$("#largomr").val());
	 	var ancho = parseFloat($row.find(".ancho").val());
	 	var precio = parseFloat ($$("#preciomr").val());

	 	if(isNaN(altura_izquierda))altura_izquierda=0;
	 	if(isNaN(altura_derecha))altura_derecha=0;
	 	if(isNaN(ancho))ancho=0;

	 	var volumen=calcula_volumen(banco,ancho,altura_izquierda,altura_derecha,largo,precio);
	 	$row.find(".volumen").text(formatear_decimal(volumen));
	 	if(volumen==0)$row.find(".volumen").text("");

	 	DATOS_actualiza_gdep_pulpable(gde_actual,arreglo[banco-1],function(result) {
			//alert("he actualizado el banco");
			calcula_totalMR(1, function(result1) {
				//calcula_total(1);
			});
		});



	 });

	$$(document).on('input','#total_volmr', function(){
		calcula_totalMR(2);
		limpiar_volumenesMR()
	});


	$( "#total_volmr" ).focus(function() {
		
		if (advertido==0){
			//alerta(8);
			advertido=1;
		}
  		
	});

});




function volver_encabezadoMR(){
    mainView.router.navigate('/EmisionDesdeFaena/'+zona_activa+'/'+id_gde+'/'+tipo_emision);
}

function limpiar_volumenesMR(){

	for(i=0;i<6;i++){

		arreglo[i].ANCHO=0;
		arreglo[i].ALTURA_IZQUIERDA=0;
		arreglo[i].ALTURA_DERECHA=0;
		arreglo[i].VOLUMEN=0;
		arreglo[i].PRECIO=0;

	}

	$$("#ancho1").val("");
	$$("#alturaizq1").val("");
	$$("#alturader1").val("");
	$$("#volMR1").text("");

	$$("#ancho2").val("");
	$$("#alturaizq2").val("");
	$$("#alturader2").val("");
	$$("#volMR2").text("");

	$$("#ancho3").val("");
	$$("#alturaizq3").val("");
	$$("#alturader3").val("");
	$$("#volMR3").text("");

	$$("#ancho4").val("");
	$$("#alturaizq4").val("");
	$$("#alturader4").val("");
	$$("#volMR4").text("");

	$$("#ancho5").val("");
	$$("#alturaizq5").val("");
	$$("#alturader5").val("");
	$$("#volMR5").text("");

	$$("#ancho6").val("");
	$$("#alturaizq6").val("");
	$$("#alturader6").val("");
	$$("#volMR6").text("");

}


function obtiene_largo(bandera,callback){
	

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
						largo_actual= parseFloat(largo);
						$$("#largomr").val(largo);


						DATOS_actualiza_largo_trozo_gde(id_gde,largo, function(result) {
			            	typeof callback == "function" && callback(1);
			            });


					}else{
						$$("#largomr").val(0);
						largo_actual=0;
						hay_parametro=0;
						typeof callback == "function" && callback(1);
					}
			       
			    });
        	}else{
        		DATOS_largo_producto(cod_producto,cod_proyecto,cod_cliente, function(largo) {
					if(largo!=-1){
						largo_actual= parseFloat(largo);
						$$("#largomr").val(largo);

						DATOS_actualiza_largo_trozo_gde(id_gde,largo, function(result_actualiza) {
			            	typeof callback == "function" && callback(1);
			            });

					}else{
						$$("#largomr").val(0);
						largo_actual=0;
						hay_parametro=0;
						typeof callback == "function" && callback(1);
					}

					

				});
        	}

        });

	});



}


function obtiene_precio(bandera,callback){
	//alert(cod_producto);
	//alert(cod_cliente);
	DATOS_precio_producto(cod_producto,cod_cliente, function(precioproducto) {
		//alert(precioproducto.PPR_PRECIO);
		if(precioproducto!=-1){
			precio_actual=parseFloat (precioproducto.PPR_PRECIO);
			$$("#preciomr").val(precioproducto.PPR_PRECIO);
		}else{
			//alert("precio no encontrado");
			DATOS_seleccionar_PrecioPorDefecto(2, function(preciopordefecto) {

				//alert(preciopordefecto)
				precio_actual=parseFloat(preciopordefecto);
				$$("#preciomr").val(precio_actual);
			});

			
		}

		typeof callback == "function" && callback(1);
	});
}

function calcula_volumen(banco,ancho,altura_izquierda,altura_derecha,largo,precio){

	var promedio =(altura_izquierda+altura_derecha)/2;
	var area =promedio*ancho;
	var total =(area*largo)/2.44;
	var precio_total =total*precio;

	arreglo[banco-1].ANCHO=ancho;
	arreglo[banco-1].ALTURA_IZQUIERDA=altura_izquierda;
	arreglo[banco-1].ALTURA_DERECHA=altura_derecha;
	arreglo[banco-1].VOLUMEN=total;
	arreglo[banco-1].PRECIO=precio_total;

	return total;

}


function pagina_comentarios(){

	var error=0;
	for (var i = arreglo.length - 1; i >= 0; --i)
	{	

		if((arreglo[i].ANCHO!=0 && arreglo[i].ALTURA_IZQUIERDA!=0 && arreglo[i].ALTURA_DERECHA==0) || ( arreglo[i].ANCHO!=0 && arreglo[i].ALTURA_IZQUIERDA==0 && arreglo[i].ALTURA_DERECHA!=0)  || (arreglo[i].ANCHO!=0 && arreglo[i].ALTURA_IZQUIERDA==0 && arreglo[i].ALTURA_DERECHA==0 )){
			error=1;
			break;
		}
	}


	//alert(total_volumen_actual);
	if($$("#total_volmr").val()==0){
		alerta(10);
		return false;
	}

	if($$("#total_guiamr").text()==0){
		alerta(11);
		return false;
	}

	if(error==1){
		alerta(2);
		return false;
	}else{
		mainView.router.navigate('/Comentarios/'+zona_activa+'/'+id_gde+'/2/'+tipo_emision);
	}


}


function calcula_totalMR(origen,callback){

	//alert("entra a calcular total");

	if(origen==1){
		var total_volumen=0;
		var total_precio=0;
		//alert("origen 1");

		for (var i = arreglo.length - 1; i >= 0; --i)
		{
			total_volumen += arreglo[i].VOLUMEN;
			total_precio+=arreglo[i].PRECIO;
		}

		total_volumen_actual=total_volumen;
		total_precio_actual=total_precio;

		//total_precio =total_volumen*precio_producto;

		var a =formatear_decimal(total_volumen);
		a=parseFloat(a);

		$$("#total_volmr").val(a);
		$$("#total_guiamr").text( new  Intl.NumberFormat('es-CL').format(formatear_precio(total_precio)));

		if(a==0)$$("#total_volmr").val("");
		DATOS_actualiza_totales(id_gde,total_volumen,total_precio,function(result) {
			typeof callback == "function" && callback(1);
		});


	}
	if(origen==2){
		var total_volumen = parseFloat($$("#total_volmr").val());
		if(isNaN(total_volumen))total_volumen=0;
		var total_precio = total_volumen*precio_actual;
		total_volumen_actual=total_volumen;
		total_precio_actual=total_precio;
		$$("#total_guiamr").text( new  Intl.NumberFormat('es-CL').format(formatear_precio(total_precio)));

		DATOS_actualiza_totales(id_gde,total_volumen,total_precio,function(result) {
			DATOS_restaura_gdep_pulpable(gde_actual, function(result1) {
				typeof callback == "function" && callback(1);
			});
		});
	}


	if(origen==3){

	 	$$("#total_volmr").val(formatear_decimal(gde_actual.GDE_VOLUMEN_TOTAL));
		var total_volumen = parseFloat($$("#total_volmr").val());
		var total_precio = total_volumen*precio_actual;
		$$("#total_guiamr").text(new  Intl.NumberFormat('es-CL').format(formatear_precio(total_precio)));
		total_volumen_actual=total_volumen;
		total_precio_actual=total_precio;

		if(total_volumen==0)$$("#total_volmr").val("");

		DATOS_actualiza_totales(id_gde,total_volumen,total_precio,function(result) {
			DATOS_restaura_gdep_pulpable(gde_actual, function(result1) {
				typeof callback == "function" && callback(1);
			});
		});

	}

	if(origen==4){
		var total_volumen=0;
		var total_precio=0;
		var largo = parseFloat ($$("#largomr").val());
		var precio = parseFloat ($$("#preciomr").val());
		//alert("origen 1");

		for (var i = arreglo.length - 1; i >= 0; --i)
		{	
			arreglo[i].VOLUMEN=calcula_volumen(i+1,arreglo[i].ANCHO,arreglo[i].ALTURA_IZQUIERDA,arreglo[i].ALTURA_DERECHA,largo,precio);
			total_volumen += arreglo[i].VOLUMEN;
			total_precio+=arreglo[i].PRECIO;
		}


		var a =formatear_decimal(total_volumen);
		a=parseFloat(a);
		total_volumen_actual=total_volumen;
		total_precio_actual=total_precio;
		$$("#total_volmr").val(a);
		$$("#total_guiamr").text(new  Intl.NumberFormat('es-CL').format(formatear_precio(total_precio)));

		if(a==0)$$("#total_volmr").val("");

		DATOS_actualiza_totales(id_gde,total_volumen,total_precio,function(result) {
			//alert("volumenes actualizados");
			typeof callback == "function" && callback(1);
		});
	}
}



/*FORMULA CALCULA MR

	16.	Volumen Bancos
	Promedio de las alturas, por ancho del banco, por el largo del trozo, dividido por la constante 2.44.
	Suma de todos los bancos.


	CUANDO LA FECHA FINAL ES NULA, SE ASIGNA PRECIO
	CUANDO LA FECHA FINAL 

	*/

	function crear_bancos(bandera,callback){
	//son 5 bancos, no es necesario hacer un for
	arreglo=[];
	var banco = new CL_DetalleMR(1,0,0,0,0,0);
	banco.UNIDAD_MEDIDA=gde_actual.GDE_UNIDAD_MEDIDA;
	banco.LARGO=largo_actual;
	banco.ID_UNICO_MOVIL="GDEP"+obtener_IDUNICO();
	arreglo.push(banco);
	banco = new CL_DetalleMR(2,0,0,0,0,0);
	banco.UNIDAD_MEDIDA=gde_actual.GDE_UNIDAD_MEDIDA;
	banco.LARGO=largo_actual;
	banco.ID_UNICO_MOVIL="GDEP"+obtener_IDUNICO();
	arreglo.push(banco);
	banco = new CL_DetalleMR(3,0,0,0,0,0);
	banco.UNIDAD_MEDIDA=gde_actual.GDE_UNIDAD_MEDIDA;
	banco.LARGO=largo_actual;
	banco.ID_UNICO_MOVIL="GDEP"+obtener_IDUNICO();
	arreglo.push(banco);
	banco = new CL_DetalleMR(4,0,0,0,0,0);
	banco.UNIDAD_MEDIDA=gde_actual.GDE_UNIDAD_MEDIDA;
	banco.LARGO=largo_actual;
	banco.ID_UNICO_MOVIL="GDEP"+obtener_IDUNICO();
	arreglo.push(banco);
	banco = new CL_DetalleMR(5,0,0,0,0,0);
	banco.UNIDAD_MEDIDA=gde_actual.GDE_UNIDAD_MEDIDA;
	banco.LARGO=largo_actual;
	banco.ID_UNICO_MOVIL="GDEP"+obtener_IDUNICO();
	arreglo.push(banco);
	banco = new CL_DetalleMR(6,0,0,0,0,0);
	banco.UNIDAD_MEDIDA=gde_actual.GDE_UNIDAD_MEDIDA;
	banco.LARGO=largo_actual;
	banco.ID_UNICO_MOVIL="GDEP"+obtener_IDUNICO();
	arreglo.push(banco);

	guardado=0;


	
	for (var i = arreglo.length - 1; i >= 0; --i)
	{	
		//alert(arreglo[i].ID_UNICO_MOVIL);
		DATOS_guarda_gdep_pulpable(gde_actual,arreglo[i], function(result) {
			//falert("guardado");
			guardado++;
			if(confirma_guardado_mr(guardado,arreglo.length)==1){
				typeof callback == "function" && callback(1);
			}

		});

	}

}


function recargar_bancos(bandera,callback){
	//alert("vamos a recargar los bancos");
	DATOS_seleccionar_bancos(id_gde,precio_actual, function(result) {
		//alert(result[0].BANCO);
		arreglo=result;
		
		if(gde_actual.GDE_ESTADO_MOVIL=="I" || gde_actual.GDE_ESTADO_MOVIL=="M" || gde_actual.GDE_ESTADO_MOVIL=="E" || gde_actual.GDE_ESTADO_MOVIL=="N"){
			//$("#btn_mr").css("display", "none");
			$$("#ancho1").prop("disabled", true);
			$$("#ancho2").prop("disabled", true);
			$$("#ancho3").prop("disabled", true);
			$$("#ancho4").prop("disabled", true);
			$$("#ancho5").prop("disabled", true);
			$$("#ancho6").prop("disabled", true);
			$$("#alturaizq1").prop("disabled", true);
			$$("#alturaizq2").prop("disabled", true);
			$$("#alturaizq3").prop("disabled", true);
			$$("#alturaizq4").prop("disabled", true);
			$$("#alturaizq5").prop("disabled", true);
			$$("#alturaizq6").prop("disabled", true);
			$$("#alturader1").prop("disabled", true);
			$$("#alturader2").prop("disabled", true);
			$$("#alturader3").prop("disabled", true);
			$$("#alturader4").prop("disabled", true);
			$$("#alturader5").prop("disabled", true);
			$$("#alturader6").prop("disabled", true);
			$$("#total_volmr").prop("disabled", true);
		
		}

		//ANCHOS
		$$("#ancho1").val((arreglo[0].ANCHO==0)?'':arreglo[0].ANCHO);
		$$("#ancho2").val((arreglo[1].ANCHO==0)?'':arreglo[1].ANCHO);
		$$("#ancho3").val((arreglo[2].ANCHO==0)?'':arreglo[2].ANCHO);
		$$("#ancho4").val((arreglo[3].ANCHO==0)?'':arreglo[3].ANCHO);
		$$("#ancho5").val((arreglo[4].ANCHO==0)?'':arreglo[4].ANCHO);
		$$("#ancho6").val((arreglo[5].ANCHO==0)?'':arreglo[5].ANCHO);

		//ALTURA IZQUIERDA
		$$("#alturaizq1").val((arreglo[0].ALTURA_IZQUIERDA==0)?'':arreglo[0].ALTURA_IZQUIERDA);
		$$("#alturaizq2").val((arreglo[1].ALTURA_IZQUIERDA==0)?'':arreglo[1].ALTURA_IZQUIERDA);
		$$("#alturaizq3").val((arreglo[2].ALTURA_IZQUIERDA==0)?'':arreglo[2].ALTURA_IZQUIERDA);
		$$("#alturaizq4").val((arreglo[3].ALTURA_IZQUIERDA==0)?'':arreglo[3].ALTURA_IZQUIERDA);
		$$("#alturaizq5").val((arreglo[4].ALTURA_IZQUIERDA==0)?'':arreglo[4].ALTURA_IZQUIERDA);
		$$("#alturaizq6").val((arreglo[5].ALTURA_IZQUIERDA==0)?'':arreglo[5].ALTURA_IZQUIERDA);

		//ALTURA DERECHA
		$$("#alturader1").val((arreglo[0].ALTURA_DERECHA==0)?'':arreglo[0].ALTURA_DERECHA);
		$$("#alturader2").val((arreglo[1].ALTURA_DERECHA==0)?'':arreglo[1].ALTURA_DERECHA);
		$$("#alturader3").val((arreglo[2].ALTURA_DERECHA==0)?'':arreglo[2].ALTURA_DERECHA);
		$$("#alturader4").val((arreglo[3].ALTURA_DERECHA==0)?'':arreglo[3].ALTURA_DERECHA);
		$$("#alturader5").val((arreglo[4].ALTURA_DERECHA==0)?'':arreglo[4].ALTURA_DERECHA);
		$$("#alturader6").val((arreglo[5].ALTURA_DERECHA==0)?'':arreglo[5].ALTURA_DERECHA);


		//VOLUMEN
		$$("#volMR1").text((arreglo[0].VOLUMEN==0)?'':formatear_decimal(arreglo[0].VOLUMEN));
		$$("#volMR2").text((arreglo[1].VOLUMEN==0)?'':formatear_decimal(arreglo[1].VOLUMEN));
		$$("#volMR3").text((arreglo[2].VOLUMEN==0)?'':formatear_decimal(arreglo[2].VOLUMEN));
		$$("#volMR4").text((arreglo[3].VOLUMEN==0)?'':formatear_decimal(arreglo[3].VOLUMEN));
		$$("#volMR5").text((arreglo[4].VOLUMEN==0)?'':formatear_decimal(arreglo[4].VOLUMEN));
		$$("#volMR6").text((arreglo[5].VOLUMEN==0)?'':formatear_decimal(arreglo[5].VOLUMEN));

		DATOS_tiene_bancos_gdep_pulpable(gde_actual, function(contador) {

	
			if(contador>0){
				calcula_totalMR(4, function(result2) {
				});
			}else{
				calcula_totalMR(3, function(result2) {
				});
			}

			/*calcula_totalMR(3, function(result2) {
			//alert("si");

			});*/

		});


		

		//alert("ES "+gde_actual.GDE_VOLUMEN_TOTAL);
		//alert("ES "+gde_actual.GDE_TOTAL);

		//$$("#total_volmr").val(formatear_decimal(gde_actual.GDE_VOLUMEN_TOTAL));
		//$$("#total_guiamr").text(formatear_precio(gde_actual.GDE_TOTAL));
	});

}



function confirma_guardado_mr(conta,tamano){
	if(conta==tamano)return 1;
	else return 0;
}



