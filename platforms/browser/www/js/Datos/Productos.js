function DATOS_largo_producto_OC(codproducto,cliente,proveedor,predio,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	//alert(codproducto)
	
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT LARGO_TROZO FROM ORDEN_COMPRA WHERE COD_PRODUCTO=? AND COD_CLIENTE=? AND  COD_PROVEEDOR=? AND ROL_PREDIO=?  ", [codproducto,cliente,proveedor,predio], function(tr, rs) {

			var n = rs.rows.length;
			
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var largo = rs.rows.item(0).LARGO_TROZO;
				//alert(largo);
				typeof callback == "function" && callback(largo);
			}
		});
	});
}



function DATOS_largo_producto(codproducto,codproyecto,codcliente,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	
	
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT LARGO_TROZO FROM ORDEN_VENTA WHERE COD_PRODUCTO=? AND COD_PROYECTO=? AND COD_CLIENTE=?", [codproducto,codproyecto,codcliente], function(tr, rs) {

			var n = rs.rows.length;
			
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var largo = rs.rows.item(0).LARGO_TROZO;
				//alert(largo);
				typeof callback == "function" && callback(largo);
			}
		});
	});
}



function DATOS_seleccionar_producto(codproyecto, callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	
	
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT ItemCode, Description FROM ORDEN_COMPRA WHERE project=?", [codproyecto], function(tr, rs) {

			var n = rs.rows.length;
			
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{

				var ar=[];
				for(i=0;i<n;i++){
					var rs_datos = rs.rows.item(i);
					var producto = new CL_PRODUCTO(rs_datos.ItemCode,rs_datos.Description,null,null);
					ar.push(producto);
				}

				
				
				typeof callback == "function" && callback(ar);
			}
		});
	});
}





function DATOS_seleccionar_producto_OC(proveedor,predio,codproducto,codcliente,destino_cliente,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	
	
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT COD_PRODUCTO, NOMBRE_PRODUCTO, UNIDAD_MEDIDA, LARGO_TROZO FROM ORDEN_COMPRA WHERE COD_PRODUCTO=? AND COD_CLIENTE=? AND COD_PROVEEDOR=? AND ROL_PREDIO=? AND DESTINO_CLIENTE=? ", [codproducto,codcliente,proveedor,predio,destino_cliente], function(tr, rs) {

			var n = rs.rows.length;
			
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var rs_datos = rs.rows.item(0);
				var producto = new CL_PRODUCTO(rs_datos.COD_PRODUCTO,rs_datos.NOMBRE_PRODUCTO ,rs_datos.UNIDAD_MEDIDA,rs_datos.LARGO_TROZO);
				//alert(rs_datos.NOMBRE_PRODUCTO);
				typeof callback == "function" && callback(producto);
			}
		});
	});
}


function DATOS_orden_venta_producto(codproducto,codproyecto,codcliente,destino_cliente,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	
	/*alert(codproducto);
	alert(codproyecto);
	alert(codcliente);*/
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT NUM_DOCUMENTO FROM ORDEN_VENTA WHERE COD_PRODUCTO=? AND COD_PROYECTO=? AND COD_CLIENTE=? AND DESTINO_CLIENTE=?", [codproducto,codproyecto,codcliente,destino_cliente], function(tr, rs) {

			var n = rs.rows.length;
		
			
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var numdoc = rs.rows.item(0).NUM_DOCUMENTO;
				//alert(largo);
				typeof callback == "function" && callback(numdoc);
			}
		});
	});
}


function DATOS_precio_producto(codproducto,codcliente,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	//'0001-01-01T00:00:00
	//alert(codproducto);
	//alert(codcliente);
	this.db.transaction(function(tr) {
		tr.executeSql("SELECT * FROM PRECIO_PRODUCTO WHERE PPR_COD_PRODUCTO=? AND PPR_COD_CLIENTE=? AND PPR_FECHA_INICIAL<= date('now') AND  (PPR_FECHA_FINAL>=  date('now') OR PPR_FECHA_FINAL='0001-01-01T00:00:00')  ", [codproducto,codcliente], function(tr, rs) {
		//tr.executeSql("SELECT * FROM PRECIO_PRODUCTO", [], function(tr, rs) {

			var n = rs.rows.length;
			//alert(n);
			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var rs_datos = rs.rows.item(0);
				var precioproducto= new CL_PrecioProducto();
				precioproducto.EMP_ID=rs_datos.EMP_ID;
				precioproducto.PPR_COD_PRODUCTO=rs_datos.PPR_COD_PRODUCTO;
				precioproducto.PPR_COD_CLIENTE=rs_datos.PPR_COD_CLIENTE;
				precioproducto.PPR_FECHA_INICIAL=rs_datos.PPR_FECHA_INICIAL;
				precioproducto.PPR_FECHA_FINAL=rs_datos.PPR_FECHA_FINAL;
				precioproducto.PPR_PRECIO=rs_datos.PPR_PRECIO;
				typeof callback == "function" && callback(precioproducto);
			}
		});
	});
}