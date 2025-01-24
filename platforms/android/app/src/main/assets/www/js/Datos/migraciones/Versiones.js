var version1Esquema = {
    versionNumber: 1,
    queries: [
        "CREATE TABLE IF NOT EXISTS PREDIO_GEOCERCA (ROL_PREDIO TEXT, GEOCERCA TEXT, FLAG_CONTROL INTEGER DEFAULT 0)"
    ]
}

var version2Esquema = {
    versionNumber: 2,
    queries: [
        "ALTER TABLE GDE ADD COLUMN GDE_COD_ORIGEN TEXT",
    ]
}

var version3Esquema = {
    versionNumber: 3,
    queries: [
        "ALTER TABLE ORDEN_COMPRA ADD COLUMN tiempo_espera_carguio INTEGER",
        "ALTER TABLE GDE ADD GDE_HORA_CARGUIO_INICIO TEXT",
        "ALTER TABLE GDE ADD GDE_HORA_CARGUIO_TERMINO TEXT",
        "ALTER TABLE GDE ADD GDE_ALERTA_CARGUIO INTEGER DEFAULT 0",
        "ALTER TABLE GDE ADD GDE_CAPTURA_FOTO_CAMION_VACIO INTEGER DEFAULT 0",
    ]
}


var version4Esquema = {
    versionNumber: 4,
    queries: [
        "CREATE TABLE IF NOT EXISTS LOG_USUARIO(ID INTEGER PRIMARY KEY AUTOINCREMENT, USU_USUARIO_SISTEMA VARCHAR(40) NOT NULL, fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP, DATOS TEXT);"
    ]
}

var version5Esquema = {
    versionNumber: 5,
    queries: [
        "ALTER TABLE GDE_EVIDENCIA ADD COLUMN CANTIDAD_INTENTOS INTEGER DEFAULT 1"
    ]
}


//ARRAY DE VERSIONES, CUANDO ESTEN LOS CAMBIOS, SE COLOCA ACA LA VARIABLE
var versionesEsquema = [
    version1Esquema,
    version2Esquema,
    version3Esquema,
    version4Esquema,
    version5Esquema
];


