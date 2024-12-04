function Datos_validaGeocerca(rolPredio, punto, callback) {
    //alert(usuario.user)


    return new Promise((resolve, reject) => {
        var pertenece = false;
        this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

        let query = "SELECT g.FLAG_CONTROL, ST_Contains(GeomFromGeoJSON(g.GEOCERCA), ST_GeomFromText ('POINT(" + punto + ")')) PERTENECE from PREDIO_GEOCERCA g where g.ROL_PREDIO =?";
        this.db.transaction(function (tr) {
            tr.executeSql(query, [rolPredio], function (tr, rs) {
                var n = rs.rows.length;
                let geocercaValida = {
                    encontrado: false,
                    pertenece: -1,
                    flagControl: 0
                };
                if (n > 0) {
                    var rs_datos = rs.rows.item(0);
                    geocercaValida.encontrado = true;
                    geocercaValida.pertenece = rs_datos.PERTENECE,
                    geocercaValida.flagControl = rs_datos.FLAG_CONTROL
                }

               resolve(geocercaValida);
            }, function (tr, error) {
                reject(JSON.stringify(error));
            });
        });


    });

}


function DATOS_borrar_geocercas(callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });

    this.db.transaction(function (tr) {
        tr.executeSql("DELETE FROM PREDIO_GEOCERCA", [], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}


function DATOS_nuevo_geocerca(geocerca, callback) {
    this.db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 2 });
    this.db.transaction(function (tr) {
        tr.executeSql("INSERT INTO PREDIO_GEOCERCA (ROL_PREDIO, GEOCERCA, FLAG_CONTROL) VALUES(?,?,?)", [geocerca.ROL_PREDIO, geocerca.GEOCERCA, geocerca.FLAG_CONTROL], function (tr, rs) {
            typeof callback == "function" && callback(rs);
        });
    });
}