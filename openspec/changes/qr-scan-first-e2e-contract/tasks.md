# Tasks: QR Scan-First End-to-End Contract Test

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~505 (PR1 ~140, PR2 ~365) |
| 400-line budget risk | Low (each PR individually under budget) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (spatial shim) → PR 2 (e2e harness + scenarios) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

Note: CI workflow support for checking out `movil_comaco_gde` alongside `movil_comaco` is unresolved by design; no task changes CI config — flagged as a risk, not a task.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Ray-cast spatial shim proven standalone | PR 1 | `node --test tests/spatial-sqlite-shim.test.js` | N/A — pure `node:sqlite` in-memory, no device/emulator | Delete `tests/support/spatial-sqlite.js`, `tests/spatial-sqlite-shim.test.js`; revert `package.json`/`config.yaml` appends |
| 2 | Full cross-repo QR→resolution chain | PR 2 | `node --test tests/qr-scan-first-e2e.test.js` | N/A — pure Node `vm`/`node:sqlite`; requires sibling `../../movil_comaco_gde` on `desarrollo`, else `guiasDisponible()` skips | Delete `tests/support/qr-e2e-harness.js`, `tests/qr-scan-first-e2e.test.js`; revert `package.json`/`config.yaml` appends; independent of PR1 file |

## Phase 1: PR1 — Spatial SQLite Shim

- [x] 1.1 Run a minimal script confirming `DatabaseSync.prototype.function()` exists and is callable on the current Node (register a trivial `ST_Contains`, invoke it). STOP and report as a design-level blocker if unavailable — no silent fallback.
- [x] 1.2 RED: write `tests/spatial-sqlite-shim.test.js` — capability-guard assertion (1.1) plus cases: inside, outside, ring-with-hole, `MultiPolygon`, malformed GeoJSON → `0`. Must fail (module absent).
- [x] 1.3 GREEN: create `tests/support/spatial-sqlite.js` exporting `spatialContains(geoJsonText, wktPoint)` (planar even-odd ray-cast, `Polygon`/`MultiPolygon` only), `registerSpatialFunctions(db)` (`db.function('ST_Contains', {deterministic:true}, spatialContains)`; `GeomFromGeoJSON`/`ST_GeomFromText` as identity passthroughs), `cordovaSqlite(db)` (adapter duplicated from `tests/qr-guias-contract.test.js` (read-only) — do not modify or import from it), `crearBaseSqlite()`. Make 1.2 pass.
- [x] 1.4 Append ` tests/spatial-sqlite-shim.test.js` to `package.json`'s `scripts.test` explicit list (no glob). [FLAGGED: test-script change]
- [x] 1.5 Update `openspec/config.yaml`'s `testing.projects[0].test_command_raw` to match. [FLAGGED: test-config change]
- [x] 1.6 Run `npm test`; confirm green and `tests/qr-guias-contract.test.js` (read-only) diffs zero.

## Phase 2: PR2 — Cross-Repo Harness Foundation

- [x] 2.1 In `tests/support/qr-e2e-harness.js`, add `crearContextoTrazabilidad()`: own `vm` context + SQLite A + `version8Esquema` schema verbatim (`movil_comaco/www/js/Datos/migraciones/Versiones.js`, 20 cols) + deterministic `obtener_IDUNICO`. This context MUST NOT share JS global scope with the guias context: both repos declare `QR_TRAZABILIDAD_AES_KEY_HEX`/`..._HMAC_KEY_HEX` under identical names, so one shared context lets the second `runFile` overwrite the first's key material, making key drift structurally undetectable.
- [x] 2.2 Add `crearContextoGuias()`: a separate, isolated `vm` context + SQLite B + `GDE_GEOCERCA_RODAL` from `version10`+`version12` migrations + `RODAL` catalog table copied verbatim from `movil_comaco_gde/www/js/Datos/Tablas.js:22` (read-only) — it is created there, not by any numbered migration, so a migration-only fixture silently omits it.
- [x] 2.3 Add `consultarCatalogoSinOc(db, codigo)`: direct OC-unscoped query `SELECT EMPRESA, TIPO_DOCTO, NRO_OC FROM RODAL WHERE TRIM(UPPER(RODAL)) = ?` against SQLite B — the primary proof for both orphan and OC-boundary scenarios (not a paired re-run under a second OC).
- [x] 2.4 Define fixtures `GEOCERCAS`, `CATALOGO`, `PUNTOS`, `OC_A`, `OC_B`, `GDE_BASE` exactly per design: rodal codes `R01`, `R02`, `R03`, `R99` (true orphan, zero catalog rows any OC), `R77` (OC-boundary, one row under `OC_B` only) — no other numbering scheme.
- [x] 2.5 Add `guiasDisponible()`: returns `false` when `../../movil_comaco_gde` (read-only) is absent so the e2e file `test.skip`s with an explicit message instead of `ENOENT`.
- [x] 2.6 Fixture type convention: `OC_A.numOrden`/`OC_B.numOrden` as JS Numbers matching `RODAL.NRO_OC INTEGER` affinity; add one assertion (e.g. via `PRAGMA table_info(RODAL)`) proving the DAO bind value's type matches the column's declared type.

## Phase 3: PR2 — E2E Scenarios (RED/GREEN pairs)

- [x] 3.1 RED: create `tests/qr-scan-first-e2e.test.js` — "ciphertext survives round trip": call `generarQrTrazabilidadPorPuntoCarga(gde, coordenadaCarga)` in the trazabilidad context, read `resultado.qr.PAYLOAD_ENCRIPTADO`, pass it into `validarTextoQrTrazabilidad(textoQr)` in the separate guias context — never `validarPayloadQrTrazabilidad` (takes an already-decrypted object, skips decryption). Assert decrypt succeeds AND `payload.latitudCarga === punto.latitud && payload.longitudCarga === punto.longitud`. Expect fail.
- [x] 3.2 GREEN: wire 2.1–2.6 so 3.1 passes; add assertion that both contexts' `QR_TRAZABILIDAD_AES_KEY_HEX`/`..._HMAC_KEY_HEX` are equal (unmodified production constants, no injected test keys).
- [x] 3.3 RED: happy-path scenario, point (−72.2085,−36.1085) inside geocerca A (`R01`) only, `OC_A`. Assert coordinate-equality then `resolverRodalPorPuntoQr` → `{estado:"RESUELTO", rodal:"R01", nombreRodal:"RODAL 01 QUILLAY"}`. Expect fail.
- [x] 3.4 GREEN: make 3.3 pass.
- [x] 3.5 RED: zero-match scenario, point (−72.3000,−36.3000) outside all geometry, `OC_A`. Assert `{estado:"SIN_COINCIDENCIA", rodal:null, candidatos:[]}`. Expect fail.
- [x] 3.6 GREEN: make 3.5 pass.
- [x] 3.7 RED: true-orphan scenario, own fixture, point inside geocerca D (`R99`), `OC_A`. Assert `{estado:"GEOMETRIA_HUERFANA"}` AND `consultarCatalogoSinOc(dbB,'R99')` returns 0 rows (primary proof). Expect fail.
- [x] 3.8 GREEN: make 3.7 pass.
- [x] 3.9 RED: OC-boundary scenario, own separate fixture, point inside geocerca E (`R77`), `OC_A`. Assert `{estado:"GEOMETRIA_HUERFANA"}` AND `consultarCatalogoSinOc(dbB,'R77')` returns exactly 1 row whose `(EMPRESA,TIPO_DOCTO,NRO_OC)` ≠ `OC_A` (primary proof); plus extra assertion that the same point under `OC_B` → `{estado:"RESUELTO", rodal:"R77"}`. Expect fail.
- [x] 3.10 GREEN: make 3.9 pass.
- [x] 3.11 RED: ambiguous scenario, point (−72.2020,−36.1020) inside overlapping geocercas A (`R01`) and C (`R03`), `OC_A`. Assert `{estado:"AMBIGUO", rodal:null, candidatos:['R01','R03']}` (order-insensitive). Expect fail.
- [x] 3.12 GREEN: make 3.11 pass.
- [x] 3.13 Cross-check every `estado` literal used in 3.1–3.12 (`RESUELTO`, `SIN_COINCIDENCIA`, `AMBIGUO`, `GEOMETRIA_HUERFANA`) against `movil_comaco_gde/www/js/Services/GeocercaRodalService.js` (read-only)'s `resolverRodalPorPuntoQr` output — no invented values.

## Phase 4: Wiring & Verification

- [x] 4.1 Append ` tests/qr-scan-first-e2e.test.js` to `package.json`'s `scripts.test` explicit list (no glob). [FLAGGED: test-script change]
- [x] 4.2 Update `openspec/config.yaml`'s `testing.projects[0].test_command_raw` to match. [FLAGGED: test-config change]
- [x] 4.3 Run `npm test` with `../../movil_comaco_gde` (read-only) present on `desarrollo`; confirm all scenarios pass with no manual step beyond `npm install`.
- [x] 4.4 Run with `../../movil_comaco_gde` (read-only) absent/renamed; confirm `guiasDisponible()` triggers `test.skip` with an explicit message, not `ENOENT`.
- [x] 4.5 Confirm zero production changes: `git status`/`git diff` on `movil_comaco` shows only new `tests/` files plus the `package.json`/`config.yaml` wiring edits; `movil_comaco_gde` (read-only) shows zero diff.
- [x] 4.6 Confirm `tests/qr-guias-contract.test.js` (read-only) remains byte-identical (no diff).
