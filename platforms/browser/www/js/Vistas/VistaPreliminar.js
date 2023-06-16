var $$ = Dom7;
var zona_activa;
var id_gde;
var tipo_volumen;
var gde_actual;
var tipo_emision;
var origen;
var empresa_actual;
var cliente_actual;
var producto_actual;
var rut_empresa;
var arreglo;
var es_venta=1;
var canvas_image;
var destino_actual_vp;
var iva_actual;
var cadena_impresora_seleccionada;
var canvas2;
var canvas;
var myImage;
var myImage2;
var folderpath = "file:///storage/emulated/0/";
var filename = "myimage4.png";
var a_imprimir;
var tempCanvas=document.createElement("canvas");
var tctx=tempCanvas.getContext("2d");
var proveedor_actual;
var algo_no_encontrado;
var contador_trozos=0;

$$(document).on('page:init', '.page[data-name="vista-preliminar"]', function (e,page) {
	algo_no_encontrado=0;
	app.dialog.preloader("Generando vista preliminar...");




	/*QUITAR CUADROS Y DEJAR EN NEGRITA LOS TITULOS
	  AL COLOCAR LA REFERENCIA, SEPARAR CON LINEAS*/
	

	//alert(mainView.router.currentRoute);

	cadena_impresora_seleccionada =Obtener_dato_local("cadena_impresora");

	zona_activa=mainView.router.currentRoute.params.idzona;
	id_gde=mainView.router.currentRoute.params.idgde;
	tipo_volumen=parseInt(mainView.router.currentRoute.params.tipovolumen);
	tipo_emision= mainView.router.currentRoute.params.tipoemision;
	origen= mainView.router.currentRoute.params.origen;
	

	DATOS_seleccionar_gde_proveedor(id_gde, function(result) {
		gde_actual=result;


		
		//alert(gde_actual.GDE_ESTADO_MOVIL);
		if(gde_actual.GDE_ESTADO_MOVIL=='I' || gde_actual.GDE_ESTADO_MOVIL=='E' || gde_actual.GDE_ESTADO_MOVIL=='N'){
			$$("#rut_receptor").text(gde_actual.GDE_COD_CLIENTE);
			$$("#razon_social_receptor").text(gde_actual.GDE_NOMBRE_CLIENTE.toUpperCase());
		 	//$$("#giro_receptor").text(gde_actual.GDE_NOMBRE_CLIENTE.toUpperCase());
		 	$$("#fecha_emision").text(gde_actual.GDE_FECHA_FORMAT.toUpperCase());
		 	$$("#predio_origen").text(gde_actual.GDE_NOMBRE_PREDIO);
		 	$$("#rol_origen").text(gde_actual.GDE_ROL);
		 	$$("#comuna_origen").text(gde_actual.GDE_ROL_COMUNA);
		 	$$("#transportista").text(gde_actual.GDE_NOMBRE_TRANSPORTISTA);
		 	$$("#patente").text(gde_actual.GDE_PATENTE_CAMION);
		 	$$("#carro").text(gde_actual.GDE_PATENTE_CARRO);
		 	$$("#nombre_chofer").text(gde_actual.GDE_NOM_CONDUCTOR);
		 	$$("#rut_chofer").text(gde_actual.GDE_RUT_CONDUCTOR);
		 	$$("#guia_proveedor").text(gde_actual.GDE_GUIA_PROVEEDOR);
		 	$$("#volumen_proveedor").text(gde_actual.GDE_VOLUMEN_PROVEEDOR);
		 	$$("#destino").text(gde_actual.GDE_DESTINO);
		 	$$("#anio_cosecha").text(gde_actual.GDE_ANO_COSECHA);
		 	//$$("#nro_guia").text(gde_actual.GDE_COD_DESPACHADOR+""+gde_actual.ROWID);
		 	//$$("#razon_social_emisor").text(empresa_actual.EMP_RAZON_SOCIAL.toUpperCase());

		 	$$("#observacion").text(gde_actual.GDE_COMENTARIO);
		 	$$("#coordenada_x_inicial").text(gde_actual.GDE_COORDENADA_INICIAL_X);
		 	$$("#coordenada_y_inicial").text(gde_actual.GDE_COORDENADA_INICIAL_Y);
		 	$$("#coordenada_x_final").text(gde_actual.GDE_COORDENADA_FINAL_X);
		 	$$("#coordenada_y_final").text(gde_actual.GDE_COORDENADA_FINAL_Y);


		 	var newDate = gde_actual.GDE_FECHA_EMISION.split(' ');
			//alert(newDate);
			newDate = newDate[0].split('-');
			var anio = newDate[0];
			var mes = newDate[1];
			var dia = newDate[2];
			//alert(dia);
			
			/*pequeña condicion cuando las guias lleguen de vuelta*/
			if(dia.includes("T")){
				var split_dia =dia.split('T');
				if(split_dia.length>1){
				//alert("entro aca");
				dia=split_dia[0];
				//alert(split_dia[0]);

				}
			}

			if(gde_actual.GDE_ACTUALIZA_NUM_GUIA==-1){
				$$("#btn_cambiar_numero_guia").css("display", "none");
			}else{
				$$("#btn_cambiar_numero_guia").css("display", "block");
			}
			


			mes=nombre_mes(parseInt(mes));
			$$("#dia_emision").text(dia);
			$$("#mes_emision").text(mes);
			$$("#anio_emision").text(anio);




		 	//datos gps
		 	$$("#coordenada_x").text(gde_actual.GDE_COORDENADA_X);
		 	$$("#coordenada_y").text(gde_actual.GDE_COORDENADA_Y);

		 	//alert("paso3");


		 	$$("#nombre_producto").text(gde_actual.GDE_NOMBRE_PRODUCTO.toUpperCase());
			//$$("#precio_producto").text("$"+new Intl.NumberFormat('es-CL').format( formatear_precio(gde_actual.GDE_PRECIO_UNITARIO)));



			DATOS_seleccionar_empresas(1, function(result) {

				empresa_actual=result;
				rut_empresa =empresa_actual.EMP_RUT+"-"+empresa_actual.EMP_RUT_DV;
				//$$("#rut_empresa").text(formateaRut(rut_empresa));
				$$("#ciudad_emisor").text(empresa_actual.EMP_CIUDAD.toUpperCase());
				$$("#unidad_sii").text(empresa_actual.EMP_COMUNA_SII.toUpperCase());
				
				//$$("#anio_res").text(empresa_actual.EMP_ANIO_RESOLUCION);


				datos_usuario_por_codigo(Obtener_dato_local("rut_activo"), function(result_usuarios) {

					

					$$("#nro_guia").text(Obtener_dato_local("user_activo")+""+gde_actual.ROWID);
					var nombre_apellido_usuario= result_usuarios.nombre+" "+result_usuarios.apellido;
					$$("#razon_social_emisor").text(nombre_apellido_usuario.toUpperCase());

					DATOS_seleccionar_evidencia_guia(id_gde,0, function(datos_evidencia) {


						var htmls="";


						if(datos_evidencia.length>0){
							for(i=0;i<datos_evidencia.length;i++){
								htmls+="<tr style='border-color: black;border-style: solid;'>";
								htmls+="<td style='border-color: black;border-style: solid; width: 40%;'>";
								htmls+='<img style="width:100%;" src="'+datos_evidencia[i].ARCHIVO+'"/>';
								htmls+="</td>";
								htmls+="<td style='border-color: black;border-style: solid;width: 60%;'>";
								htmls+=datos_evidencia[i].OBSERVACION;
								htmls+="</td>";
								htmls+="</tr>";

							}
						}else{
							htmls+="<tr><td colspan='2'>No hay registro asociados.</td> </tr>";
						}



						$$("#tbody_evidencias").html(htmls);

					});


				});

			});

	}else{


	}

		app.dialog.close();
	});
	
});


function calcula_iva(valor){

	var ponderador = iva_actual/100;
	return valor*ponderador;	
}




function calcula_total(valor,iva){
	var total = valor+iva;
}

(function(API){
    API.myText = function(txt, options, x, y) {
        options = options ||{};
        /* Use the options align property to specify desired text alignment
         * Param x will be ignored if desired text alignment is 'center'.
         * Usage of options can easily extend the function to apply different text 
         * styles and sizes 
        */
        if( options.align == "center" ){
            // Get current font size
            var fontSize = this.internal.getFontSize();

            // Get page width
            var pageWidth = this.internal.pageSize.width;

            // Get the actual text's width
            /* You multiply the unit width of your string by your font size and divide
             * by the internal scale factor. The division is necessary
             * for the case where you use units other than 'pt' in the constructor
             * of jsPDF.
            */
            txtWidth = this.getStringUnitWidth(txt)*fontSize/this.internal.scaleFactor;

            // Calculate text's x coordinate
            x = ( pageWidth - txtWidth ) / 2;
        }

        // Draw text at x,y
        this.text(txt,x,y);
    }
})(jsPDF.API);









function volver_impresion(){
	mainView.router.navigate('/Impresion/'+zona_activa+'/'+id_gde+'/'+tipo_volumen+'/'+tipo_emision);
}


function cambiar_texto_gde_proveedor(valor){
	$$("#guia_proveedor").text(valor);
}


function cambiar_numero_guia(){
	 app.dialog.prompt('Ingrese nuevo número de guía',"GFE", function (nro_guia) {
	 	if(nro_guia!=""){
	 		
			DATOS_actualiza_num_guia(id_gde, nro_guia, 1, function(result) {
				 app.dialog.alert("Número de Guía Cambiado correctamente.","GFE", function () {
				 		cambiar_texto_gde_proveedor(nro_guia);
				 });
			});	

	 	}else{
	 		app.dialog.alert("No ha especificado número de gúia","GFE");
	 	}
	});
}
