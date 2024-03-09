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
        "ALTER TABLE GDE ADD GDE_ALERTA_CARGUIO INTEGER DEFAULT 0"
    ]
}


//ARRAY DE VERSIONES, CUANDO ESTEN LOS CAMBIOS, SE COLOCA ACA LA VARIABLE
var versionesEsquema = [
    version1Esquema,
    version2Esquema,
    version3Esquema
];


