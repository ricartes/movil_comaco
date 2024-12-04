function DATOS_ExistenFoliosDisponible(usuario,empresa,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	this.db.transaction(function(tr) {
		tr.executeSql("SELECT COUNT(*) AS CONTADOR FROM GDE_RANGO_FOLIO WHERE DISPONIBLE>0 AND EMP_ID=? AND USU_RUT=? ", [empresa,usuario], function(tr, rs) {
			contador=rs.rows.item(0).CONTADOR
			typeof callback == "function" && callback(contador);
		});
	});
}


function DATOS_BorraRangosFolios(empresa,usuario, callback){
	//alert("ID GDE EMN DATOS "+id);
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	//alert("entro a guardar gde");
	this.db.transaction(function(tr) {
		tr.executeSql("DELETE FROM GDE_RANGO_FOLIO WHERE  EMP_ID=? AND USU_RUT=? AND DISPONIBLE=0", [empresa,usuario], function(tr, rs) {
			var n = rs.rows.length;
				//alert(n);
			typeof callback == "function" && callback(n);
				
		});
	});
}


function DATOS_BorraFolios(empresa,rut, callback){
	//alert("ID GDE EMN DATOS "+id);
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	//alert("entro a guardar gde");
	this.db.transaction(function(tr) {
		tr.executeSql("DELETE FROM GDE_FOLIO_USUARIO WHERE EMP_ID=? AND USU_RUT=? AND ESTADO_FOLIO IN('O','N')", [empresa,rut], function(tr, rs) {
			var n = rs.rows.length;
				//alert("BORRA"+n);
			typeof callback == "function" && callback(n);
				
		});
	});
}


function DATOS_existe_rango_folio(rango_folio, callback){
	//alert("ID GDE EMN DATOS "+id);
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	//alert("entro a guardar gde");
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT EMP_ID FROM GDE_RANGO_FOLIO WHERE FOLIO_INICIAL=? AND FOLIO_FINAL=?  ", [rango_folio.FOLIO_INICIAL,rango_folio.FOLIO_FINAL], function(tr, rs) {
			var n = rs.rows.length;
			
			typeof callback == "function" && callback(n);
				
		});
	});
}



function DATOS_GuardaRangoFolio(rango_folio, callback){

this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("INSERT INTO GDE_RANGO_FOLIO (EMP_ID,URF_ID,USU_RUT,FOLIO_INICIAL,FOLIO_FINAL,CANTIDAD,VERIFICADO,CAF, DISPONIBLE) VALUES(?,?,?,?,?,?,?,?,?)", [rango_folio.EMP_ID,rango_folio.URF_ID,rango_folio.USU_RUT,rango_folio.FOLIO_INICIAL,rango_folio.FOLIO_FINAL,rango_folio.CANTIDAD,rango_folio.VERIFICADO,rango_folio.CAF,rango_folio.CANTIDAD], function(tr, rs) {
			//alert("si guardo"+ GDE.ROWID);
			typeof callback == "function" && callback(rs);
		});
	});
}


function DATOS_GuardaRangoFolioPrueba(rango_folio, callback){

this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {

		tr.executeSql("SELECT URF_ID GDE_RANGO_FOLIO GDE_FOLIO_USUARIO WHERE EMP_ID=? AND USU_RUT=? AND FOLIO_INICIAL=?", [empresa,rut,rango_folio.FOLIO_INICIAL], function(tr, rs) {
			var n = rs.rows.length;
			alert(n);
			if(n==0){
				tr.executeSql("INSERT INTO GDE_RANGO_FOLIO (EMP_ID,URF_ID,USU_RUT,FOLIO_INICIAL,FOLIO_FINAL,CANTIDAD,VERIFICADO,CAF, DISPONIBLE) VALUES(?,?,?,?,?,?,?,?,?)", [rango_folio.EMP_ID,rango_folio.URF_ID,rango_folio.USU_RUT,rango_folio.FOLIO_INICIAL,rango_folio.FOLIO_FINAL,rango_folio.CANTIDAD,rango_folio.VERIFICADO,rango_folio.CAF,rango_folio.CANTIDAD], function(tr, rs) {
			//alert("si guardo"+ GDE.ROWID);
					typeof callback == "function" && callback(rs);
				});
			}else{

			}

		});


	});
}

function DATOS_SelectFolios(estado,callback){

	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT * from GDE_FOLIO_USUARIO ", [], function(tr, rs) {
			var n = rs.rows.length;
			alert(n);
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var ar=[];
				for(i=0;i<n;i++){
					var rs_datos = rs.rows.item(i);
					var folio = new CL_Folio(rs_datos.EMP_ID,rs_datos.URF_ID,rs_datos.USU_RUT,rs_datos.NUM_FOLIO,rs_datos.ESTADO_FOLIO);
					ar.push(folio);
				}
				typeof callback == "function" && callback(ar);

			}
		});

	});

}


function DATOS_SelectRangoFolios(empresa,rut,callback){

	//alert("selecciono mis rangos folios");
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT * from GDE_RANGO_FOLIO WHERE EMP_ID=? AND USU_RUT=?", [empresa,rut], function(tr, rs) {
			var n = rs.rows.length;
			//alert(n);
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var ar=[];
				for(i=0;i<n;i++){
					var rs_datos = rs.rows.item(i);
					var rango_folio =new CL_Usuario_RF(rs_datos.EMP_ID,rs_datos.URF_ID,rs_datos.USU_RUT,rs_datos.FOLIO_INICIAL,rs_datos.FOLIO_FINAL,rs_datos.CANTIDAD,rs_datos.VERIFICADO,"");
					rango_folio.DISPONIBLE=rs_datos.DISPONIBLE;
					//var folio = new CL_Folio(rs_datos.EMP_ID,rs_datos.URF_ID,rs_datos.USU_RUT,rs_datos.NUM_FOLIO,rs_datos.ESTADO_FOLIO);
					ar.push(rango_folio);

					//alert(rango_folio);
				}
				typeof callback == "function" && callback(ar);

			}
		});

	});

}



function DATOS_SelectRangoFolioPorID(id,callback){
                      
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT * from GDE_RANGO_FOLIO WHERE URF_ID=?", [id], function(tr, rs) {
			var n = rs.rows.length;
			//alert(n);
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var ar=[];
				for(i=0;i<n;i++){
					var rs_datos = rs.rows.item(i);
					var rango_folio =new CL_Usuario_RF(rs_datos.EMP_ID,rs_datos.URF_ID,rs_datos.USU_RUT,rs_datos.FOLIO_INICIAL,rs_datos.FOLIO_FINAL,rs_datos.CANTIDAD,rs_datos.VERIFICADO,"");
					rango_folio.DISPONIBLE=rs_datos.DISPONIBLE;
					//var folio = new CL_Folio(rs_datos.EMP_ID,rs_datos.URF_ID,rs_datos.USU_RUT,rs_datos.NUM_FOLIO,rs_datos.ESTADO_FOLIO);
					ar.push(rango_folio);

					//alert(rango_folio);
				}
				typeof callback == "function" && callback(ar);

			}
		});

	});

}



function DATOS_SelectCAF(num_folio,id_empresa,rut_usuario,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT CAF FROM GDE_RANGO_FOLIO WHERE ?>= FOLIO_INICIAL AND ?<=FOLIO_FINAL AND EMP_ID=? AND USU_RUT=?", [num_folio,num_folio,id_empresa,rut_usuario], function(tr, rs) {
			var n = rs.rows.length;
			//alert(n);
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var rs_datos = rs.rows.item(0);
				var caf=rs_datos.CAF.trim();
				typeof callback == "function" && callback(caf);

			}
		});

	});

}




function DatosINsertFolio(folio,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("INSERT INTO GDE_FOLIO_USUARIO  VALUES(?,?,?,?,?)", [folio.EMP_ID,folio.USU_RUT,folio.URF_ID,folio.NUM_FOLIO,folio.ESTADO_FOLIO], function(tx, rs){
			//alert("INSERTADO "+folio.NUM_FOLIO);
			typeof callback == "function" && callback(rs);
		});
	});
}



function DATOS_ObtenerNumFolio(rut,empresa,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT * from GDE_FOLIO_USUARIO WHERE NUM_FOLIO=(SELECT MIN(NUM_FOLIO) from GDE_FOLIO_USUARIO WHERE ESTADO_FOLIO='D' AND USU_RUT=? AND EMP_ID=?)  ", [rut,empresa], function(tr, rs) {
			var n = rs.rows.length;
			//alert("la seleccion de folios "+n);
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var ar=[];
				for(i=0;i<n;i++){
					var rs_datos = rs.rows.item(i);
					var folio = new CL_Folio(rs_datos.EMP_ID,rs_datos.URF_ID,rs_datos.USU_RUT,rs_datos.NUM_FOLIO,rs_datos.ESTADO_FOLIO);
					ar.push(folio);
				}
				typeof callback == "function" && callback(ar);

			}
		});

	});

}



function DATOS_ObtenerNumFolioPorID(id,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT MIN(NUM_FOLIO) as MINIMO from GDE_FOLIO_USUARIO WHERE ESTADO_FOLIO='D' AND URF_ID=?  ", [id], function(tr, rs) {
			var n = rs.rows.length;
			//alert("la seleccion de folios "+n);
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var rs_datos = rs.rows.item(0);
				var minimo = rs_datos.MINIMO;
				
				typeof callback == "function" && callback(minimo);

			}
		});

	});

}


function DATOS_Existe_folio(estado,rut,empresa,num_folio,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT NUM_FOLIO FROM GDE_FOLIO_USUARIO  WHERE EMP_ID=? AND USU_RUT=? AND NUM_FOLIO=?", [empresa,rut,num_folio], function(tr, rs) {
			var n = rs.rows.length;
			typeof callback == "function" && callback(n);
			
		});
	});
}


function DATOS_SeleccionarAdvertenciaFolios(rut,empresa,callback){
	DATOS_SeleccionarDisponiblesPorUsuario(rut,empresa, function(cantidad_disponibles) {
		//alert(cantidad_disponibles);
		DATOS_seleccionar_Parametro_general(empresa,5 ,function(parametro) {
			//alert(parametro.PAG_VALOR);
			//alert(cantidad_disponibles+"--"+parametro.PAG_VALOR);

			if(parametro==-1){
				typeof callback == "function" && callback("");
			}else{
				if(cantidad_disponibles<=parseInt (parametro.PAG_VALOR)){

					if(cantidad_disponibles==0){
						typeof callback == "function" && callback("No dispone de folios para emitir. Solo podrá guardar la nueva guía como borrador");
					}else{
						typeof callback == "function" && callback( "Actualmente dispone menos de  "+parametro.PAG_VALOR +" folios para emitir ("+cantidad_disponibles+" folios disponibles). Se recomienda solicitar al administrador asignar mas folios para continuar.");
					}
				}  
				else {
					typeof callback == "function" && callback("");
				}
			}



		});

	});
}



function DATOS_SeleccionarDisponiblesPorUsuario(rut,empresa,callback){
	var suma =0;
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT DISPONIBLE FROM GDE_RANGO_FOLIO  WHERE EMP_ID=? AND USU_RUT=?", [empresa,rut], function(tr, rs) {
			var n = rs.rows.length;
			
			for(i=0;i<n;i++){
				var rs_datos = rs.rows.item(i);
				suma+=parseInt(rs_datos.DISPONIBLE)
			}
		
			//alert("me da la "+ suma);
			typeof callback == "function" && callback(suma);
			
		});
	});
}




function DATOS_Cambia_estado_folio(estado,rut,empresa,num_folio,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("UPDATE GDE_FOLIO_USUARIO SET ESTADO_FOLIO=? WHERE EMP_ID=? AND USU_RUT=? AND NUM_FOLIO=?", [estado,empresa,rut,num_folio], function(tr, rs) {
			//alert("si guardo");
			typeof callback == "function" && callback(rs);
		});
	});
}


function DATOS_Descuenta_cantidad_folio(rut,empresa,num_folio,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("UPDATE GDE_RANGO_FOLIO SET DISPONIBLE=(SELECT DISPONIBLE FROM GDE_RANGO_FOLIO  WHERE ?>= FOLIO_INICIAL AND ?<=FOLIO_FINAL AND EMP_ID=? AND USU_RUT=? )-1 WHERE ?>= FOLIO_INICIAL AND ?<=FOLIO_FINAL AND EMP_ID=? AND USU_RUT=?", [num_folio,num_folio,empresa,rut,num_folio,num_folio,empresa,rut], function(tr, rs) {
			//alert("si guardo");
			typeof callback == "function" && callback(rs);
		});
	});
}


function DATOS_BorrarFolios(rut,id,desde,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("DELETE FROM GDE_FOLIO_USUARIO WHERE NUM_FOLIO >=? AND URF_ID=? ", [desde,id], function(tr, rs) {
			//alert("si guardo");
			typeof callback == "function" && callback(rs);
		});
	});
}



function DATOS_reasigna_rango_folio(rut,id,hasta,disponibles,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	this.db.transaction(function(tr) {
		tr.executeSql("UPDATE GDE_RANGO_FOLIO SET FOLIO_FINAL=?, DISPONIBLE=? WHERE URF_ID=?", [hasta,disponibles,id], function(tr, rs) {
			//alert("si guardo");
			typeof callback == "function" && callback(rs);
		});
	});
}