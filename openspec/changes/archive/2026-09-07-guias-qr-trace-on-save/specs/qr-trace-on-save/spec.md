# Qr Trace On Save Specification

## Purpose

Single-write-point persistence of the origin-QR trace for a scan-first guía. `guardar_datos_guia` (create and update) is the only point that writes the 15 `QR_TRAZABILIDAD_*` columns. Governs field ownership vs. the rodal catalog, the partial-trace policy, write ordering against the association check, and mapping parity with the association screen.

## Requirements

### Requirement: Save Is The Only Write Point

The system MUST persist the trace only when Save runs (`guardar_datos_guia`, insert and update). Scanning or validating a QR alone MUST NOT persist any `QR_TRAZABILIDAD_*` column.

#### Scenario: Scan without save persists nothing

- GIVEN the operator scans a QR and it validates
- WHEN Save is not pressed
- THEN no `QR_TRAZABILIDAD_*` column is written

#### Scenario: Save persists the trace on insert and update

- GIVEN a validated QR trace held in memory
- WHEN Save runs, on a new guía or an existing one
- THEN all 15 `QR_TRAZABILIDAD_*` columns persist on that branch

### Requirement: Catalog Owns The Guía's Own Fields

The system MUST source `GDE_SECCION`, `GDE_AVISO_CORTA`, and `GDE_PLAN_MANEJO` only from the rodal catalog path; the trace write MUST NOT overwrite or null them. Validated geocerca values MUST persist only to `QR_TRAZABILIDAD_SECCION_VALIDADA`, `_AEF_VALIDADO`, and `_PM_VALIDADO`.

#### Scenario: Divergent catalog and geocerca values both survive

- GIVEN catalog `GDE_SECCION` differs from the validated geocerca's sección
- WHEN Save runs
- THEN `GDE_SECCION` keeps the catalog value
- AND `QR_TRAZABILIDAD_SECCION_VALIDADA` carries the geocerca value

### Requirement: Partial Trace, Never Silence

When a validated QR payload exists at save time, the system MUST persist its payload-derived columns (`_ID`, `_ID_UNICO_MOVIL`, `_TEXTO`, `_LATITUD_CARGA`, `_LONGITUD_CARGA`, `_ROL_ORIGEN`). When no validated result exists, or the advance guard rejects it, the system MUST persist `QR_TRAZABILIDAD_VALIDADO = 0` with a `QR_TRAZABILIDAD_RESULTADO` reason instead of silence.

#### Scenario: Validated scan persists the full payload

- GIVEN `qrTrazabilidadPayloadValidado` is set
- WHEN Save runs
- THEN the 6 payload-derived columns persist with that data

#### Scenario: Fallback reveal persists a reasoned partial trace

- GIVEN the form was revealed via the governed manual fallback, no scan
- WHEN Save runs
- THEN `QR_TRAZABILIDAD_VALIDADO = 0` with a fallback reason

#### Scenario: No-catalog reveal persists a reasoned partial trace

- GIVEN the form was revealed via `orden_sin_catalogo_rodal`
- WHEN Save runs
- THEN `QR_TRAZABILIDAD_VALIDADO = 0` with a no-catalog reason

#### Scenario: Warning-accepted reveal with a rejected guard persists a reasoned partial trace

- GIVEN the operator accepted a QR warning whose geocerca `FLAG_CONTROL !== 1`
- WHEN Save runs
- THEN `QR_TRAZABILIDAD_VALIDADO = 0` with a guard-rejected reason

### Requirement: Trace Write Ordered After The Association Check, Survives It

The system MUST run the trace write after `prepararQrPendienteOConservarAsociacionGde` and MUST NOT let its non-association branch erase a trace about to be persisted.

#### Scenario: Traced borrador without active association keeps its trace on re-save

- GIVEN a borrador carries a QR trace and has no active association
- WHEN it is saved again
- THEN the 15 columns persist unchanged from memory, not null

### Requirement: Legacy Borrador Fields Stay Intact

Writing the trace MUST NOT null `GDE_SECCION` or `GDE_AVISO_CORTA`. Editing a legacy borrador with no QR MUST leave its guía fields exactly as the catalog path set them.

#### Scenario: Legacy borrador re-save keeps guía fields from the catalog

- GIVEN a legacy borrador with no QR trace, revealed via `borrador_legado_sin_qr`
- WHEN Save runs
- THEN `GDE_SECCION` and `GDE_AVISO_CORTA` equal the catalog-derived values, no column nulled

#### Scenario: Traced borrador re-save without re-scan preserves the trace

- GIVEN a borrador carries a QR trace and the operator does not re-scan
- WHEN Save runs
- THEN the previously persisted trace columns remain unchanged

### Requirement: Single Mapping Across Save And Association

The persisted column set MUST be identical whether written by Save or by the association screen, covering all 15 columns including `QR_TRAZABILIDAD_RESULTADO`.

#### Scenario: Save-path and association-path outputs match

- GIVEN the same validated QR trace state
- WHEN persisted via Save and, separately, via the association screen
- THEN both write the same 15 columns and values, including `QR_TRAZABILIDAD_RESULTADO`

### Requirement: Save-Time Trace Does Not Preempt A Later Association

The system MUST NOT let the save-time trace write alter what the association screen later persists; a completed association's `UPDATE GDE` remains authoritative for the trace columns.

#### Scenario: Association after save overwrites the save-time trace

- GIVEN a guía was saved with a save-time trace and no active association
- WHEN the operator later completes an association for that guía
- THEN the association's `UPDATE GDE` values persist
