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
        "ALTER TABLE GDE_EVIDENCIA ADD COLUMN CANTIDAD_INTENTOS INTEGER DEFAULT 0"
    ]
}

var version6Esquema = {
    versionNumber: 6,
    queries: [
        "ALTER TABLE GDE ADD GDE_CONFIRMA_INGRESO_PLANTA INTEGER DEFAULT 0"
    ]
}

var version7Esquema = {
    versionNumber: 7,
    queries: [
        "ALTER TABLE ORDEN_COMPRA ADD COLUMN codigo_destino TEXT",
        "ALTER TABLE GDE ADD GDE_COD_DESTINO TEXT"
    ]
}

var version8Esquema = {
    versionNumber: 8,
    queries: [
        `CREATE TABLE IF NOT EXISTS QR_TRAZABILIDAD_ORIGEN (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,

            QR_ID TEXT NOT NULL UNIQUE,
            ID_UNICO_MOVIL_GDE TEXT NOT NULL UNIQUE,

            FECHA_GENERACION TEXT NOT NULL,
            FECHA_EXPIRACION TEXT,
            FECHA_VALIDACION_GDE TEXT,

            ESTADO TEXT NOT NULL,

            LATITUD_CARGA REAL,
            LONGITUD_CARGA REAL,
            ACCURACY_CARGA REAL,

            COD_ORIGEN TEXT,
            ROL_ORIGEN TEXT,
            ROL_COMUNA_ORIGEN TEXT,
            VIGENCIA_TIPO TEXT,

            PAYLOAD_ENCRIPTADO TEXT NOT NULL,
            PAYLOAD_HASH TEXT,

            QR_RETORNO_ENCRIPTADO TEXT,
            DATOS_RETORNO TEXT,

            ENVIADO INTEGER DEFAULT 0
        )`
    ]
}

var version9Esquema = {
    versionNumber: 9,
    queries: [
        "ALTER TABLE USUARIO ADD COLUMN USU_ID_SERVIDOR INTEGER"
    ]
}


//ARRAY DE VERSIONES, CUANDO ESTEN LOS CAMBIOS, SE COLOCA ACA LA VARIABLE
var versionesEsquema = [
    version1Esquema,
    version2Esquema,
    version3Esquema,
    version4Esquema,
    version5Esquema,
    version6Esquema,
    version7Esquema,
    version8Esquema,
    version9Esquema
];


