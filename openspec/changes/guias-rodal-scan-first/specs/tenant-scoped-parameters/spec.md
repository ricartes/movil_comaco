# Tenant-Scoped Parameters Specification

## Purpose

`movil_comaco_gde` reads `PARAMETRO_GENERAL` rows to resolve app-wide flags, including the new scan-first manual fallback flag. The current read (`DATOS_seleccionar_valorParametro`, `www/js/Datos/Parametros.js`) queries `SELECT * FROM PARAMETRO_GENERAL WHERE PAG_ID=?` and takes `rs.rows.item(0)` with no `EMP_ID` filter. On a multi-empresa device this can silently resolve to another empresa's value. This capability defines an empresa-scoped read, modeled on `movil_comaco`'s `getParametroMovilPorNombre(idEmp, nombre)` pattern.

## Requirements

### Requirement: Empresa-Scoped Parameter Read

The system MUST scope every `PARAMETRO_GENERAL` read used by this change by both `PAG_ID` and `EMP_ID`, and MUST NOT return a value belonging to an empresa other than the one requested.

#### Scenario: Single-empresa device

- GIVEN a device holding `PARAMETRO_GENERAL` rows for one empresa only
- WHEN a parameter is read for that empresa's `EMP_ID`
- THEN that empresa's row value is returned

#### Scenario: Multi-empresa device

- GIVEN a device holding `PARAMETRO_GENERAL` rows for empresa A and empresa B with different values for the same `PAG_ID`
- WHEN the parameter is read for empresa A's `EMP_ID`
- THEN empresa A's row value is returned
- AND empresa B's row value is never returned for that read

### Requirement: Missing Row For Empresa Is Not A Cross-Tenant Fallback

When no `PARAMETRO_GENERAL` row exists for the requested `(EMP_ID, PAG_ID)` pair, the system MUST resolve the read as "not found" and MUST NOT substitute a row belonging to a different empresa.

#### Scenario: No row for the requested empresa

- GIVEN `PARAMETRO_GENERAL` holds a row for empresa B but none for empresa A, for the same `PAG_ID`
- WHEN the parameter is read for empresa A's `EMP_ID`
- THEN the read resolves as "not found"
- AND empresa B's row is never returned

### Requirement: Server-Provisioned Fallback Flag Replaces The Hardcoded Constant

The scan-first "advance without validation" fallback MUST be sourced from an empresa-scoped `PARAMETRO_GENERAL` read rather than the hardcoded `QR_TRAZABILIDAD_PERMITIR_AVANCE_SIN_VALIDACION` constant. When the row is absent for the active empresa, or the read fails, the system MUST default to denying advance without validation (fail closed).

#### Scenario: Server permits fallback for this empresa

- GIVEN the active empresa's `PARAMETRO_GENERAL` row for the fallback flag is set to permit
- WHEN the flag is read during the scan-first flow
- THEN advancing without validation is permitted

#### Scenario: Flag absent or unreadable fails closed

- GIVEN the active empresa has no `PARAMETRO_GENERAL` row for the fallback flag, or the read fails
- WHEN the flag is evaluated during the scan-first flow
- THEN advancing without validation is denied
