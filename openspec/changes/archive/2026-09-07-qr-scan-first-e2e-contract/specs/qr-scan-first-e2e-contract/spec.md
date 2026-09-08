# QR Scan-First End-to-End Contract Specification

## Purpose

Bind the producer (`movil_comaco`) and consumer (`movil_comaco_gde`) sides of the scan-first QR flow into one executable, dispatcher-observable contract. Existing suites each prove one layer against a simulated neighbour; this capability proves the seam itself — crypto envelope, SQLite geometry, and OC scoping — using only real production code paths.

## Requirements

### Requirement: Real Cryptographic Producer-to-Consumer Chain

The test MUST invoke the real `movil_comaco` producer function that builds the `GFEQR1:` payload (the function generating the ciphertext with the production AES/HMAC constants) to obtain the QR text. The test MUST NOT construct a ciphertext string or a pre-decrypted payload object by hand. The test MUST then pass that exact ciphertext string into the real `movil_comaco_gde` decrypt-and-validate function. Both sides MUST use the unmodified production AES/HMAC constants (no injected test keys).

#### Scenario: Ciphertext survives the real round trip

- GIVEN a real load-point coordinate and trip identifiers
- WHEN the real producer function generates the `GFEQR1:` ciphertext and the real consumer decrypt-and-validate function processes that exact string
- THEN decryption succeeds and the decoded payload's coordinates match the values the producer encoded
- AND no test-only key or pre-decrypted object was substituted on either side

### Requirement: Real Point-to-Rodal Resolution

The test MUST resolve the decoded coordinate through the real `resolverRodalPorPuntoQr` calling the real `DATOS_buscarRodalPorPunto` against a real in-memory SQLite database seeded with genuine `ST_Contains`/`GeomFromGeoJSON`-evaluable polygon geometry. The test MUST NOT substitute a stubbed DAO or a canned resolver return value.

#### Scenario: Resolution runs through real SQL and geometry

- GIVEN a decoded coordinate and a resolved `(rolPredio, empresa, tipoDocto, numOrden)` scope
- WHEN `resolverRodalPorPuntoQr` is invoked
- THEN the outcome is produced by the real DAO's SQL query and the shimmed spatial function evaluating fixture geometry, not by a stub

### Requirement: End-to-End Happy Path Resolution

When a real ciphertext decodes to a coordinate that falls inside exactly one in-scope rodal's polygon under the correct `(empresa, OCE_TIPODOCTO, NUM_ORDEN)`, the chain MUST resolve with `estado: "RESUELTO"` and the correct catalog `rodal` code.

#### Scenario: Full chain resolves to the correct rodal

- GIVEN a real QR generated at a load point inside rodal R01's polygon, scoped to OC `(empresa, tipoDocto, numOrden)`
- WHEN the full chain (producer → consumer decrypt → point resolution) runs
- THEN the result is `{ estado: "RESUELTO", rodal: "R01" }`

### Requirement: End-to-End Zero-Match Resolution

When the decoded coordinate falls outside every in-scope rodal geometry, the chain MUST resolve with `estado: "SIN_COINCIDENCIA"` and MUST NOT auto-select any rodal.

#### Scenario: Coordinate outside all geometry

- GIVEN a real QR whose coordinate lies outside every rodal polygon registered for the resolved OC scope
- WHEN the full chain runs
- THEN the result is `estado: "SIN_COINCIDENCIA"` with `rodal: null`

### Requirement: Orphan Geometry and OC-Boundary Collision Are Independently Verified

Both a true catalog orphan (a `GDE_GEOCERCA_RODAL` geometry row whose `RODAL` text matches no `RODAL` catalog row under any orden de compra) and an OC-boundary collision (a geometry row whose `RODAL` text matches a catalog row that exists only under a *different* `(EMPRESA, TIPO_DOCTO, NRO_OC)`) produce the identical caller-facing `estado: "GEOMETRIA_HUERFANA"`, because the OC filter lives inside the DAO's LEFT JOIN subquery rather than the outer query. The test MUST cover both root causes as distinct scenarios with distinct fixtures, and MUST assert — independently of the caller-facing outcome — a fixture-level fact that proves which root cause each scenario actually exercises: for the orphan scenario, that zero `RODAL` catalog rows exist for that code under any OC; for the boundary scenario, that exactly one `RODAL` catalog row exists for that code, scoped to an OC tuple other than the one under test.

#### Scenario: True orphan geometry — no catalog entry under any OC

- GIVEN a `GDE_GEOCERCA_RODAL` row whose polygon contains the test point and whose `RODAL` text has zero matching rows in the `RODAL` catalog table under any `(EMPRESA, TIPO_DOCTO, NRO_OC)`
- WHEN the full chain runs
- THEN the result is `estado: "GEOMETRIA_HUERFANA"`
- AND a direct query of the `RODAL` catalog table for that `RODAL` code, unscoped by OC, returns zero rows

#### Scenario: OC-boundary collision — catalog entry exists under a different OC

- GIVEN a `GDE_GEOCERCA_RODAL` row whose polygon contains the test point and whose `RODAL` text matches exactly one `RODAL` catalog row registered under an OC different from the one under test
- WHEN the full chain runs scoped to the tested OC
- THEN the result is `estado: "GEOMETRIA_HUERFANA"`
- AND a direct query of the `RODAL` catalog table for that `RODAL` code, unscoped by OC, returns exactly one row whose `(EMPRESA, TIPO_DOCTO, NRO_OC)` differs from the tested scope

### Requirement: Ambiguous Multiple-Match Resolution

When the coordinate falls inside more than one in-scope rodal geometry mapped to distinct catalog codes, the chain MUST resolve with `estado: "AMBIGUO"` and MUST NOT auto-select or guess any candidate.

#### Scenario: Coordinate inside two distinct rodal geometries

- GIVEN a real QR whose coordinate lies inside two overlapping in-scope rodal polygons mapped to two distinct catalog codes
- WHEN the full chain runs
- THEN the result is `estado: "AMBIGUO"` with `rodal: null` and `candidatos` listing both codes

### Requirement: Test Wiring

The end-to-end test file MUST be wired into `movil_comaco/package.json`'s `scripts.test` so it runs under `npm test` from a clean checkout, without any production source change in either app.

#### Scenario: Suite runs from a clean checkout

- GIVEN a clean checkout with `movil_comaco_gde` present at `../../movil_comaco_gde`
- WHEN `npm test` runs in `movil_comaco`
- THEN the end-to-end scenarios execute and pass without any manual setup step beyond `npm install`
