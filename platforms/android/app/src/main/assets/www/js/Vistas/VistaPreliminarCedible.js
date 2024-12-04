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
$$(document).on('page:init', '.page[data-name="vista-preliminar-cedible"]', function (e,page) {

	
	
	alert("cedible");
	zona_activa=mainView.router.currentRoute.params.idzona;
	id_gde=mainView.router.currentRoute.params.idgde;
	tipo_volumen=parseInt(mainView.router.currentRoute.params.tipovolumen);
	tipo_emision= mainView.router.currentRoute.params.tipoemision;
	origen= mainView.router.currentRoute.params.origen;

	DATOS_seleccionar_empresas(1, function(result) {
		empresa_actual=result;
		var rut_empresa =empresa_actual.EMP_RUT+"-"+empresa_actual.EMP_RUT_DV;
		$$("#rut_empresa").text(formateaRut(rut_empresa));
		$$("#unidad_sii").text(empresa_actual.EMP_COMUNA.toUpperCase());
		$$("#ciudad_emisor").text(empresa_actual.EMP_COMUNA.toUpperCase());
		$$("#razon_social_emisor").text(empresa_actual.EMP_RAZON_SOCIAL.toUpperCase());
		$$("#giro_emisor").text(empresa_actual.EMP_GIRO.toUpperCase());
		$$("#direccion_emisor").text(empresa_actual.EMP_DIRECCION.toUpperCase()+", "+empresa_actual.EMP_COMUNA.toUpperCase());
		$$("#email_emisor").text(empresa_actual.EMP_MAIL.toUpperCase());
		$$("#telefono_emisor").text(empresa_actual.EMP_TELEFONO);

		 DATOS_seleccionar_gde(id_gde, function(result1) {
		 	gde_actual=result1;

		 	//alert("EL TED"+ gde_actual.GDE_TED);

		 	if(gde_actual.GDE_ESTADO_MOVIL=='I' || gde_actual.GDE_ESTADO_MOVIL=='E'){
		 		$$("#nro_guia").text(gde_actual.GDE_FOLIO);
		 	}else{
		 		$$("#nro_guia").text("SIN FOLIO ASIGNADO");
		 		if(gde_actual.GDE_ESTADO_MOVIL=='N'){
		 			$$("#nro_guia").text("GUÍA ANULADA");
		 		}
		 	}

		 	var newDate = gde_actual.GDE_FECHA_EMISION.split(' ');
		 	newDate = newDate[0].split('-');
		 	var anio = newDate[0];
		 	var mes = newDate[1];
		 	var dia = newDate[2];
		 	mes=nombre_mes(parseInt(mes));
		 	$$("#dia_emision").text(dia);
		 	$$("#mes_emision").text(mes);
		 	$$("#anio_emision").text(anio);
		 	DATOS_seleccionar_clientes_por_codigo(gde_actual.GDE_COD_CLIENTE, function(result2) {
		 		cliente_actual=result2;
		 		$$("#rut_receptor").text(formateaRut(cliente_actual.RUT_CLIENTE));
		 		$$("#razon_social_receptor").text(cliente_actual.RZ_CLIENTE.toUpperCase());
		 		$$("#giro_receptor").text(cliente_actual.GIRO_CLIENTE.toUpperCase());
		 		$$("#direccion_receptor").text(cliente_actual.DIR_CLIENTE.toUpperCase()+", "+cliente_actual.COM_CLIENTE.toUpperCase());
		 		$$("#telefono_receptor").text(cliente_actual.TEL_CLIENTE);
		 		DATOS_seleccionar_producto(gde_actual.GDE_COD_PRODUCTO,gde_actual.GDE_COD_PROYECTO,gde_actual.GDE_COD_CLIENTE, function(result3) {
		 			producto_actual=result3;
		 			$$("#nombre_producto").text(producto_actual.NOM_PRODUCTO.toUpperCase());
		 			$$("#precio_producto").text(formatear_precio(gde_actual.GDE_PRECIO_UNITARIO));
		 			$$("#volumen_producto").text(formatear_decimal(gde_actual.GDE_VOLUMEN_TOTAL));
		 			$$("#valor_producto").text(formatear_precio(gde_actual.GDE_TOTAL));
		 			$$("#subtotal").text(formatear_precio(gde_actual.GDE_TOTAL));
		 			$$("#afecto").text(formatear_precio(gde_actual.GDE_TOTAL));
		 			var iva = calcula_iva_cedible(parseFloat(gde_actual.GDE_TOTAL));
		 			$$("#iva").text( formatear_precio(iva));	
		 			$$("#total").text( formatear_precio(iva+gde_actual.GDE_TOTAL));


		 			if(gde_actual.GDE_ESTADO_MOVIL=='I'){
		 				var canvas = document.getElementById("barcode");
                		PDF417.draw(gde_actual.GDE_TED, canvas)
                		var img    = canvas.toDataURL("image/png");
                		$$("#mi_timbre").attr("src",img);
		 			}
		 		});
		 	});
		 });
	});
});


function calcula_iva_cedible(valor){
	var iva =valor*0.19;
	return iva;
}

function calcula_total_cedible(valor,iva){
	var total = valor+iva;
}



function generar_pdf_cedible(){
	var html = $$("#contenido_guia").html();
	//alert(html);
	let options = {
            type: 'share'
        }
 
	pdf.fromData(html, options)
	    .then((stats)=> console.log('status', stats) )   // ok..., ok if it was able to handle the file to the OS.  
	    .catch((err)=>console.err(err))

}

function volver_impresion_cedible(){
	mainView.router.navigate('/Impresion/'+zona_activa+'/'+id_gde+'/'+tipo_volumen+'/'+tipo_emision);
}