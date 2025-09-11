/**
 * 
 */
var VersionesBd = {
    version1: {
        versionNumber: 1,
        queries: [
            "ALTER TABLE FAENA ADD COLUMN LONGITUD REAL",
            "ALTER TABLE FAENA ADD COLUMN LATITUD REAL",
            "ALTER TABLE FAENA ADD COLUMN RADIO INTEGER DEFAULT 0.0",
        ]
    },
    version2: {
        versionNumber: 2,
        queries: [
            "ALTER TABLE FAENA ADD COLUMN FLAG INTEGER",
        ]
    },
    version3: {
        versionNumber: 3,
        queries: [
            "ALTER TABLE FAENA ADD COLUMN DSCTO INTEGER",
            "ALTER TABLE FAENA ADD COLUMN FLAG_DSCTO TEXT",
            "ALTER TABLE INVENTARIO ADD COLUMN VOLUMEN_CDSTO REAL DEFAULT 0",
            "ALTER TABLE INVENTARIO ADD COLUMN MONTO_DSTCO REAL DEFAULT 0",
            "ALTER TABLE RUMA ADD COLUMN VOLUMEN_CDSTO REAL DEFAULT 0",
            "ALTER TABLE RUMA ADD COLUMN DSCTO REAL DEFAULT 0",
            "ALTER TABLE RUMA ADD COLUMN MONTO_DSTCO REAL DEFAULT 0",
        ]
    },
}


var arrayVersiones = [VersionesBd.version1, VersionesBd.version2, VersionesBd.version3]
/**
 * V1: OK
 * V2: OK
 * V3: DESARROLLO
 */

export default arrayVersiones;