# Delta for Guias Rodal Scan-First

## ADDED Requirements

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
