async function insertLogUsuario(userRut, datos) {
    return new Promise((resolve, reject) => {


        const insertQuery = 'INSERT INTO LOG_USUARIO (USU_USUARIO_SISTEMA, DATOS, fecha_hora) VALUES (?, ?, ?)';
        const insertValues = [userRut, JSON.stringify(datos), datos.fechaHora];

        db.transaction(function (tx) {
            tx.executeSql(insertQuery, insertValues,
                function (tx, resultSet) {
                    resolve('Registro insertado con éxito');
                },
                function (tx, error) {
                    reject('Error al insertar el registro: ' + error.message);
                }
            );
        });
    });
}


async function Datos_eliminarLogUsuario(id) {
    return new Promise((resolve, reject) => {


        const deleleteQuery = 'DELETE FROM LOG_USUARIO WHERE ID = ?';
        const deleteValues = [id];

        db.transaction(function (tx) {
            tx.executeSql(deleleteQuery, deleteValues,
                function (tx, resultSet) {
                    resolve('Registro eliminado con éxito');
                },
                function (tx, error) {
                    reject('Error al eliminar el registro: ' + error.message);
                }
            );
        });
    });
}



function DATOS_ListarTrazabilidad() {
    return new Promise((resolve, reject) => {
        const db = window.sqlitePlugin.openDatabase({ name: "bd.db", location: 'default', androidDatabaseImplementation: 'system' });
        db.executeSql("SELECT ID, USU_USUARIO_SISTEMA, fecha_hora as fecha_hora_local , DATOS FROM LOG_USUARIO", [], function (rs) {
            var items = [];
            for (var i = 0; i < rs.rows.length; i++) {
                items.push(rs.rows.item(i));
            }
            resolve(items);
        }, function (error) {
            reject('SELECT SQL statement ERROR: ' + error.message);
        });

    });
}
