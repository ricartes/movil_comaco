# Rodal Point Resolution Specification

## Purpose

Given a scanned QR coordinate, `movil_comaco_gde` resolves which rodal (if any) contains that point, bounded to the already-selected predio / orden de compra. This inverts the existing point-in-rodal validation, which today takes the rodal as an input; this capability makes the rodal the output.

## Requirements

### Requirement: Bounded Search Scope

The point-to-rodal lookup MUST be scoped to the already-resolved `(empresa, OCE_TIPODOCTO, NUM_ORDEN)` — the same scope used by `combo_rodal` and `DATOS_ObtenerDatosRodal`. The lookup MUST NOT search rodales outside this scope.

#### Scenario: Scoped search

- GIVEN an orden de compra already resolved to `(empresa, OCE_TIPODOCTO, NUM_ORDEN)`
- WHEN a QR coordinate is looked up against the rodal catalog
- THEN only rodales belonging to that `(empresa, OCE_TIPODOCTO, NUM_ORDEN)` scope are candidates

### Requirement: Zero-Match Resolution

When the scanned coordinate matches no rodal geometry within scope, the system MUST treat the point as unresolved and MUST NOT auto-select any rodal.

#### Scenario: No geometry match

- GIVEN a scanned coordinate that falls outside every in-scope rodal geometry
- WHEN the point-to-rodal lookup runs
- THEN the result is "not resolved" and `#combo_rodal` remains unselected

### Requirement: Single-Match Auto-Selection

When exactly one in-scope rodal geometry contains the coordinate, the system MUST auto-select that rodal in `#combo_rodal`.

#### Scenario: Unambiguous match

- GIVEN a scanned coordinate that falls inside exactly one in-scope rodal geometry
- WHEN the point-to-rodal lookup runs
- THEN `#combo_rodal` is auto-selected to that rodal

### Requirement: Multiple-Match Resolution Never Guesses

When more than one in-scope rodal geometry contains the coordinate, the system MUST treat the result as unresolved and MUST NOT auto-select any of the candidate rodales.

#### Scenario: Ambiguous match

- GIVEN a scanned coordinate that falls inside two or more in-scope rodal geometries
- WHEN the point-to-rodal lookup runs
- THEN the result is "not resolved", no rodal is auto-selected, and no candidate is guessed

### Requirement: Name-to-Geometry Join Failure Is Unresolved

The rodal name catalog (`DATOS_seleccionar_rodales`) and the geometry table (`GDE_GEOCERCA_RODAL`) are joined only by string match with no guaranteed 1:1 relationship. When a geometry hit has no corresponding catalog entry, or vice versa, the system MUST treat the result as unresolved rather than surfacing a partial or synthetic rodal.

#### Scenario: Geometry hit without a catalog name

- GIVEN a scanned coordinate whose containing geometry has no matching entry in the rodal name catalog
- WHEN the point-to-rodal lookup runs
- THEN the result is "not resolved" and no rodal is auto-selected
