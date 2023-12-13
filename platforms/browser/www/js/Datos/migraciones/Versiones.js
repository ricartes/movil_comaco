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

//ARRAY DE VERSIONES, CUANDO ESTEN LOS CAMBIOS, SE COLOCA ACA LA VARIABLE
var versionesEsquema = [
    version1Esquema,
    version2Esquema
];


