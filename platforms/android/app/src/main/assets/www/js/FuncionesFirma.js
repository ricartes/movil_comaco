function GenerarTED(id_gde,callback){

	var xml="<TED version=\"1.0\">";

	//primero obtengo la gde para formar el ted
	DATOS_seleccionar_gde(id_gde, function(guia) {

		

		//alert("SELECCIONO LA GUIA");

		//alert(Obtener_dato_local("empresa_activo"));
		 DATOS_seleccionar_empresas(Obtener_dato_local("empresa_activo"), function(empresa) {

		 	///alert("SELECCIONO LA EMPRESA");
		 	

		 	DATOS_SelectCAF(guia.GDE_FOLIO,Obtener_dato_local("empresa_activo"), Obtener_dato_local("rut_activo"), function(AUTORIZACION) {

		 			//alert("CAF ES "+AUTORIZACION);
		 			DATOS_seleccionar_clientes_por_codigo(guia.GDE_COD_CLIENTE, function(cli) {
		 				//alert("SELECCIONO EL CLIENTE");
		 				//alert(cli.RZ_CLIENTE);
		 				//alert("EL CLIENTE ES "+cli.RUT_CLIENTE);
		 				
		 				//alert("producto "+guia.GDE_COD_PRODUCTO);*/

		 				DATOS_rut_por_codigo_cliente(guia.GDE_COD_CLIENTE, function(rut_cliente) {

		 					var rut_parte = rut_cliente.split("-");
					        var rut =rut_parte[0];
					        var dv =rut_parte[1];
					        //alert(rut_parte);
					        //var seleccionado_destino =guia.GDE_CLIENTE_COMBO.split("_")[1];

					        DATOS_cliente_es_emisor(rut,dv, function(contador) {
					        	if(contador>0){
					        		//alert("por orden compra");
					        		DATOS_seleccionar_producto_OC(guia.GDE_COD_PROVEEDOR,guia.GDE_ROL_PREDIO,guia.GDE_COD_PRODUCTO,guia.GDE_COD_CLIENTE,guia.GDE_DESTINO_CLIENTE, function(prod) {
					        			//alert("PRODUCTO POR ORDEN COMPRA");
					        			var CAF =ExtraerCAF(AUTORIZACION);	
								 		//alert(CAF);
								 		//TENGO LA CLAVE PRIVADA DEL CAF
								 		var CLAVE_PRIVADA =ExtraerClavePrivada(AUTORIZACION);
								 		//alert(CLAVE_PRIVADA);
								 		//alert("PROD ES "+prod.NOM_PRODUCTO);
								 		var DD = ObtenerDD(cli,guia,CAF,empresa,52,prod,1);
								 		//alert("MI DD");
								 		//alert(DD);

								 		var rsa = new RSAKey();
									  	rsa.readPrivateKeyFromPEMString(CLAVE_PRIVADA);
									  	var hashAlg = "sha1"
									    var hSig = rsa.sign(DD, hashAlg);
									    var aa =linebrk(hSig, 64);
			      						//console.log(aa);

			      						var base64_encoded_signature = hex2b64(hSig);

			      						////alert("EL FIRMADO ES "+base64_encoded_signature);

			      						xml+=DD+'<FRMT algoritmo="SHA1withRSA">'+base64_encoded_signature+'</FRMT>'+"</TED>";
			      						////alert(xml);

			      						guia.GDE_TED=xml.trim();
			      						DATOS_ingresa_TED(guia, function(resultado_ted) {

			      							typeof callback == "function" && callback(1);
			      						});
					        		});
					        	}else{
					        		//alert("por orden venta");
					 				DATOS_seleccionar_productoPorCodigo(guia.GDE_COD_PRODUCTO, function(prod) {
						 				
					 					//alert("PRODUCTO ORDEN VENTA");
										//TENGO EL CAF
								 		var CAF =ExtraerCAF(AUTORIZACION);	
								 		//alert(CAF);
								 		//TENGO LA CLAVE PRIVADA DEL CAF
								 		var CLAVE_PRIVADA =ExtraerClavePrivada(AUTORIZACION);
								 		//alert(CLAVE_PRIVADA);
								 		//alert("PROD ES "+prod.DESCRIPCION);
								 		var DD = ObtenerDD(cli,guia,CAF,empresa,52,prod,0);
								 		//alert("MI DD");
								 		//alert(DD);

								 		var rsa = new RSAKey();
									  	rsa.readPrivateKeyFromPEMString(CLAVE_PRIVADA);
									  	var hashAlg = "sha1"
									    var hSig = rsa.sign(DD, hashAlg);
									    var aa =linebrk(hSig, 64);
			      						//console.log(aa);

			      						var base64_encoded_signature = hex2b64(hSig);

			      						////alert("EL FIRMADO ES "+base64_encoded_signature);

			      						xml+=DD+'<FRMT algoritmo="SHA1withRSA">'+base64_encoded_signature+'</FRMT>'+"</TED>";
			      						////alert(xml);

			      						guia.GDE_TED=xml.trim();
			      						DATOS_ingresa_TED(guia, function(resultado_ted) {

			      							typeof callback == "function" && callback(1);
			      						});
		 							});
					        	}
					        });
		 				});
		 			});
		 	});

		 });

	 });


}

function ExtraerCAF(xml_autorizacion){

	xml_autorizacion =xml_autorizacion.replace(/(\r\n|\n|\r)/gm, "");
	var testRE = xml_autorizacion.match('<AUTORIZACION>(.*)</CAF>');
	testRE[1]+="</CAF>";
	return testRE[1];
}


function ExtraerClavePrivada(xml_autorizacion){

	xml_autorizacion =xml_autorizacion.replace(/(\r\n|\n|\r)/gm, "");
	var testRE = xml_autorizacion.match('<RSASK>(.*)</RSASK>');
	return testRE[1];
}


function ObtenerDD(cliente,guia,CAF,empresa,tipodoc,producto,devolucion){

	//mydate = new Date(guia.GDE_FECHA_EMISION.trim());
	////alert(mydate);

	var parts =guia.GDE_FECHA_EMISION.trim().split(' ');
	


	var dd ="<DD>";
	dd+="<RE>"+empresa.EMP_RUT.trim()+"-"+empresa.EMP_RUT_DV.trim()+"</RE>";
	//alert(dd);
	dd+="<TD>"+tipodoc+"</TD>";
	//alert(dd);
	dd+="<F>"+guia.GDE_FOLIO+"</F>";
	//alert(dd);
	dd+="<FE>"+parts[0].trim()+"</FE>";
	//alert(dd);
	dd+="<RR>"+cliente.RUT_CLIENTE.trim()+"</RR>";
	//alert(dd);
	dd+="<RSR>"+cliente.RZ_CLIENTE.trim()+"</RSR>";
	//alert(dd);
	dd+="<MNT>"+formatear_precio(guia.GDE_TOTAL)+"</MNT>";
	//alert(dd);

	//alert(producto.NOM_PRODUCTO.trim());
	if(devolucion==1){

		if(producto.NOM_PRODUCTO.trim().length>40){
			dd+="<IT1>"+producto.NOM_PRODUCTO.substring(0, 39).trim()+"</IT1>";
			
		}else{
			dd+="<IT1>"+producto.NOM_PRODUCTO.trim()+"</IT1>";
		}
	

	}else{


		if(producto.DESCRIPCION.trim().length>40){
			dd+="<IT1>"+producto.DESCRIPCION.substring(0, 39).trim()+"</IT1>";
				
		}else{
			dd+="<IT1>"+producto.DESCRIPCION.trim()+"</IT1>";
		}


	}

	
	//alert(dd);

	dd+=CAF;
	//alert(dd);
	dd+="<TSTED>"+parts[0].trim()+"T"+parts[1].trim()+"</TSTED>";
	//alert(dd);
	dd+="</DD>";
	//alert(dd);


	return dd;

}


