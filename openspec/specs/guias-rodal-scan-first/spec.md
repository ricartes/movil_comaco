# Guias Rodal Scan-First Specification

## Purpose

In `movil_comaco_gde`'s `EmisionDesdeFaena` header entry, invert the current flow (manual rodal selection, QR validated against it) into scan-first: the operator scans the origin QR before selecting a rodal, `rodal-point-resolution` resolves which rodal the scanned point belongs to, that rodal is auto-selected, and only then does the rest of the header entry become visible. This capability governs the header-entry visibility state machine and the scan-trigger placement; it does not govern the point-to-rodal matching logic itself (see `rodal-point-resolution`) or the parameter tenancy fix (see `tenant-scoped-parameters`).

## Requirements

### Requirement: Hidden By Default On Header Entry

The system MUST keep `#contenido_posterior_qr_trazabilidad_faena` hidden when the `EmisionDesdeFaena` header entry loads and MUST keep it hidden through any state reset, until a rodal is resolved (auto-selected) or the governed manual fallback permits revealing it.

#### Scenario: Fresh entry, nothing scanned yet

- GIVEN the operator opens the `EmisionDesdeFaena` header entry
- WHEN the form initializes and no QR has been scanned
- THEN `#contenido_posterior_qr_trazabilidad_faena` is hidden

#### Scenario: State reset keeps content hidden

- GIVEN QR trazabilidad state is cleared (equivalent of `limpiar_qr_trazabilidad_faena`)
- WHEN the reset runs
- THEN `#contenido_posterior_qr_trazabilidad_faena` remains hidden, not shown

### Requirement: Scan Precedes Rodal Selection

The system MUST present the QR scan control above `#block_rodal` and MUST NOT require a rodal to already be selected before the scanner can be triggered.

#### Scenario: Scan available with no rodal selected

- GIVEN no rodal is selected in `#combo_rodal`
- WHEN the operator triggers the scan control
- THEN the scanner opens
- AND no "select a rodal first" blocking message is shown

### Requirement: Resolved Rodal Auto-Selects And Reveals The Form

When `rodal-point-resolution` resolves the scanned coordinate to exactly one in-scope rodal, the system MUST auto-select that rodal in `#combo_rodal` and MUST reveal `#contenido_posterior_qr_trazabilidad_faena`.

#### Scenario: Unique resolution reveals the form

- GIVEN a scanned QR whose point resolves to exactly one rodal within the current orden de compra scope
- WHEN the resolution completes
- THEN `#combo_rodal` is auto-selected to that rodal
- AND `#contenido_posterior_qr_trazabilidad_faena` becomes visible

### Requirement: Unresolved Scan Keeps The Form Hidden

When `rodal-point-resolution` reports zero matches, multiple matches, or a catalog/geometry join failure, the system MUST NOT auto-select any rodal and MUST keep `#contenido_posterior_qr_trazabilidad_faena` hidden.

#### Scenario: No match keeps the form hidden

- GIVEN a scanned QR whose point does not resolve to any in-scope rodal
- WHEN the resolution completes
- THEN no rodal is auto-selected
- AND `#contenido_posterior_qr_trazabilidad_faena` stays hidden

### Requirement: Governed Manual Fallback

When the tenant-scoped fallback parameter (see `tenant-scoped-parameters`) permits advancing without validation, and the scan either fails to resolve a rodal or cannot be completed (camera unavailable, read error, cancelled scan), the system MUST allow the operator to manually select a rodal and reveal the rest of the form. When the fallback parameter denies advancing (including its default state), the system MUST NOT offer this manual path.

#### Scenario: Fallback permits manual advance

- GIVEN the fallback parameter permits advancing without validation for the active empresa
- WHEN a scan fails to resolve a rodal or the scanner is unavailable
- THEN the operator can manually select a rodal
- AND `#contenido_posterior_qr_trazabilidad_faena` becomes visible

#### Scenario: Fallback denies manual advance (default)

- GIVEN the fallback parameter denies advancing without validation
- WHEN a scan fails to resolve a rodal
- THEN `#contenido_posterior_qr_trazabilidad_faena` stays hidden
- AND no manual override is offered

### Requirement: Reveal Path Determines The Save-Time Trace Outcome

Each reveal path this capability governs MUST determine, at save time, a defined outcome under `qr-trace-on-save`: an auto-selected resolved rodal maps to a full validated trace; the governed manual fallback, the no-catalog reveal, and a warning-accepted reveal with `FLAG_CONTROL !== 1` each map to a partial trace (`QR_TRAZABILIDAD_VALIDADO = 0` with a reason); a legacy-borrador reveal maps to no trace, guía fields left as the catalog path sets them. This capability decides which path applies; it does not write persistence — see `qr-trace-on-save`.

#### Scenario: Resolved-rodal reveal maps to a full trace at save

- GIVEN the form was revealed by an auto-selected resolved rodal
- WHEN the guía is saved
- THEN the save-time trace is the full validated trace

#### Scenario: Governed fallback reveal maps to a partial trace at save

- GIVEN the form was revealed via the governed manual fallback
- WHEN the guía is saved
- THEN the save-time trace is a reasoned partial trace

#### Scenario: Legacy-borrador reveal maps to no trace and untouched guía fields

- GIVEN the form was revealed via `borrador_legado_sin_qr`
- WHEN the guía is saved
- THEN no trace is written and `GDE_SECCION`/`GDE_AVISO_CORTA` stay as the catalog path sets them
