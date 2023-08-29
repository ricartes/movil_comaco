function DATOS_crearTablaMigracion() {
    return new Promise((resolve, reject) => {

      
        const db = window.sqlitePlugin.openDatabase({
            name: "bd.db",
            location: "default",
            androidDatabaseImplementation: "system"
        });
        db.transaction(
            tr => {
               
                tr.executeSql("CREATE TABLE IF NOT EXISTS version_history(versionNumber INTEGER PRIMARY KEY NOT NULL, migratedAt DATE)");
            },
            error => reject(error),
            () => resolve()
        );
    });
}