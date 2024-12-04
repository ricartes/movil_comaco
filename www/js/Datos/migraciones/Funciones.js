function DATOS_ultimaVersion() {
    const db = window.sqlitePlugin.openDatabase({
        name: "bd.db",
        location: "default",
        androidDatabaseImplementation: "system"
    });

    return new Promise((resolve, reject) => {
        db.transaction(function (tr) {
            tr.executeSql(
                "SELECT MAX(versionNumber) AS maxVersion FROM version_history",
                [],
                function (tr, rs) {
                    var maxVersion = rs.rows.item(0).maxVersion;
                    resolve(maxVersion);
                },
                function (error) {
                    reject(error);
                }
            );
        });
    });
}


function DATOS_guardaHistoricoCambios(versionNumber) {
    const db = window.sqlitePlugin.openDatabase({
        name: "bd.db",
        location: "default",
        androidDatabaseImplementation: "system"
    });

    return new Promise((resolve, reject) => {
        db.transaction(function (tr) {
            tr.executeSql(
                "INSERT INTO version_history (versionNumber, migratedAt) VALUES (?, ?)",
                [versionNumber, new Date()],
                function (tr, rs) {
                    resolve(rs);
                },
                function (error) {
                    reject(error);
                }
            );
        });
    });
}



function DATOS_ejecutaSecuenciaQuery(queries) {
    const db = window.sqlitePlugin.openDatabase({
        name: "bd.db",
        location: "default",
        androidDatabaseImplementation: "system"
    });

    return new Promise((resolve, reject) => {
        db.transaction(
            function (tr) {
                // Función recursiva para ejecutar consultas en orden
                function executeNext(index) {
                    if (index >= queries.length) {
                        resolve(); // Si todas las consultas se han ejecutado, resuelve la promesa
                        return;
                    }

                    const query = queries[index].trim();
                    tr.executeSql(query, [], function () {
                        executeNext(index + 1); // Una vez que se ha completado la consulta actual, ejecuta la siguiente
                    }, function (error) {
                        reject(error); // Si hay un error, rechaza la promesa
                    });
                }

                executeNext(0); // Inicia la ejecución con la primera consulta
            }
        );
    });
}



