function existe_usuario(usuario,callback){
	//alert(usuario.user)
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	this.db.transaction(function(tr) {
		tr.executeSql("SELECT * FROM USUARIO WHERE USU_USUARIO_SISTEMA=?", [usuario.user], function(tr, rs) {
			contador=rs.rows.length

			typeof callback == "function" && callback(contador);
		});
	});
}



function login_movil(usuario,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	this.db.transaction(function(tr) {
		tr.executeSql("SELECT COUNT(*) FROM USUARIO WHERE USU_USUARIO_SISTEMA=? AND USU_PASSWORD=?", [usuario.user,usuario.password], function(tr, rs) {
			contador=rs.rows.length
			typeof callback == "function" && callback(contador);
		});
	});
}



function datos_usuario(usuario,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	this.db.transaction(function(tr) {
		
		tr.executeSql("SELECT * FROM USUARIO WHERE USU_USUARIO_SISTEMA=? ", [usuario.user], function(tr, rs) {
			
			var n = rs.rows.length;

			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var rs_datos = rs.rows.item(0);
				usuario.rut=rs.rows.item(0).USU_RUT;
				usuario.nombre=rs.rows.item(0).USU_NOMBRE;
				usuario.apellido=rs.rows.item(0).USU_APELLIDO;
				usuario.id_emp=rs.rows.item(0).USU_EMP_ID;
				usuario.username=rs.rows.item(0).USU_USUARIO_SISTEMA;
				usuario.clave=rs.rows.item(0).USU_PASSWORD;
				typeof callback == "function" && callback(usuario);
			}
		});
	});
}


function datos_usuario_por_codigo(codigo,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	this.db.transaction(function(tr) {
		
		tr.executeSql("SELECT * FROM USUARIO WHERE USU_RUT=? ", [codigo], function(tr, rs) {
			
			var n = rs.rows.length;


			if(n==0){
				typeof callback == "function" && callback(-1);
			}
			else{
				var rs_datos = rs.rows.item(0);
				usuario.rut=rs.rows.item(0).USU_RUT;
				usuario.nombre=rs.rows.item(0).USU_NOMBRE;
				usuario.apellido=rs.rows.item(0).USU_APELLIDO;
				usuario.id_emp=rs.rows.item(0).USU_EMP_ID;
				usuario.username=rs.rows.item(0).USU_USUARIO_SISTEMA;
				usuario.clave=rs.rows.item(0).USU_PASSWORD;
				usuario.fecha_login=rs.rows.item(0).USU_ULTIMO_LOGIN;
				typeof callback == "function" && callback(usuario);
			}
		});
	});
}




function guarda_usuario(usuario,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});

	this.db.transaction(function(tr) {
		tr.executeSql("INSERT INTO USUARIO VALUES(?,?,?,?,?,?,?,datetime('now','localtime'))", [usuario.rut,1,usuario.id_emp,usuario.nombre,usuario.apellido,usuario.user,usuario.password], function(tr, rs) {
			//alert(rs);
			typeof callback == "function" && callback(rs);
		});
	});
}


function guarda_ultimo_login(usuario,callback){
	this.db = window.sqlitePlugin.openDatabase({name: "bd.db", location: 'default', androidDatabaseImplementation: 2});
	
	//alert(usuario.user);
	this.db.transaction(function(tr) {
		tr.executeSql("UPDATE USUARIO SET USU_ULTIMO_LOGIN=datetime('now','localtime') WHERE USU_USUARIO_SISTEMA=?", [usuario.user], function(tr, rs) {
			//alert("ok");
			typeof callback == "function" && callback(rs);
		});
	});
}