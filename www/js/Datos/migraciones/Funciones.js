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

function DATOS_aplicaMigracionVersionada(version) {
    const db = window.sqlitePlugin.openDatabase({
        name: "bd.db",
        location: "default",
        androidDatabaseImplementation: "system"
    });

    return new Promise((resolve, reject) => {
        db.transaction(
            function (tr) {
                function abortarTransaccion() {
                    return true;
                }

                function registrarVersion() {
                    tr.executeSql(
                        "INSERT INTO version_history (versionNumber, migratedAt) VALUES (?, ?)",
                        [version.versionNumber, new Date()],
                        function () {},
                        abortarTransaccion
                    );
                }

                function ejecutarConsultas(index) {
                    if (index >= version.queries.length) {
                        registrarVersion();
                        return;
                    }
                    tr.executeSql(
                        version.queries[index].trim(),
                        [],
                        function () {
                            ejecutarConsultas(index + 1);
                        },
                        abortarTransaccion
                    );
                }

                if (version.versionNumber !== 9) {
                    ejecutarConsultas(0);
                    return;
                }

                tr.executeSql(
                    "PRAGMA table_info(USUARIO)",
                    [],
                    function (tr, rs) {
                        var existeIdUsuarioServidor = false;
                        for (var i = 0; i < rs.rows.length; i++) {
                            if (String(rs.rows.item(i).name).toUpperCase() === "USU_ID_SERVIDOR") {
                                existeIdUsuarioServidor = true;
                                break;
                            }
                        }
                        if (existeIdUsuarioServidor) {
                            registrarVersion();
                        } else {
                            ejecutarConsultas(0);
                        }
                    },
                    abortarTransaccion
                );
            },
            function (error) {
                reject(error);
            },
            function () {
                resolve();
            }
        );
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



