# Proposal: QR Scan-First End-to-End Contract Test

## Intent

`guias-rodal-scan-first` and `guias-qr-trace-on-save` are archived green, and a debug APK from `movil_comaco_gde:desarrollo` is about to be handed to a tester. The user asked for something *verified*, not merely a green suite.

Today every layer is proven against a simulation of its neighbour:

| Existing test | Proves | Fakes |
|---|---|---|
| `movil_comaco/tests/qr-guias-contract.test.js` | crypto envelope round-trip | never touches rodal resolution or geometry |
| `movil_comaco_gde/tests/rodal-point-resolution.test.js` | state table + SQL shape | `stubDao()` replaces the DAO; `fakeDatabase()` returns hand-written rows; QR is a typed literal |
| `movil_comaco_gde/tests/scan-first-faena.test.js` | reveal/auto-select UI | stubs `resolverRodalPorPuntoQr` |

No test joins them. A defect in the seam — coordinate order, key drift between repos, `PERTENECE` coercion, OC scoping — is invisible to all three.

## Scope

### In Scope
- One end-to-end chain in a single assertion path: real `generarQrTrazabilidadPorPuntoCarga` → real `GFEQR1:` ciphertext → real guias `validarPayloadQrTrazabilidad` → real `DATOS_buscarRodalPorPunto` over real SQLite geometry → real `resolverRodalPorPuntoQr` outcome.
- Production AES/HMAC constants on both sides (no injected test keys), which also asserts the two repos' constants still match.
- Scenarios: happy path (`RESUELTO`), zero-match (`SIN_COINCIDENCIA`), orphan geometry (`COD_RODAL: null`, `GEOMETRIA_HUERFANA`), OC-scope boundary (geometric match under a different `(empresa, OCE_TIPODOCTO, NUM_ORDEN)` must NOT resolve), and `AMBIGUO`.
- A `ST_Contains`/`GeomFromGeoJSON` SQLite function shim plus `GDE_GEOCERCA_RODAL` and `RODAL` catalog fixtures.
- Wiring the file into `package.json` `scripts.test`.

### Out of Scope
- Crypto hardening (see `movil-comaco/qr-key-rotation-blockers`), transport/driver fields, association-liberation flow.
- Re-testing the crypto envelope or save-time trace persistence.
- `guias-rodal-scan-first` Phase 0 backend prerequisites (`id_emp`, `PAG_ID`).
- Any production source change in either app.

## Capabilities

### New Capabilities
- `qr-scan-first-e2e`: a single executable contract binding producer QR emission to consumer rodal resolution, asserting the dispatcher-observable outcome.

### Modified Capabilities
- None. Existing requirements are unchanged; this change only adds proof for them.

## Approach

Place the test in `movil_comaco/tests/`, split as `tests/support/qr-e2e-harness.js` + `tests/qr-scan-first-e2e.test.js`.

`D:\Trabajos\GFE\qr-roundtrip-tests` was evaluated and rejected as the home despite having the better harness (working ray-cast `spatialContains`, app adapters, deterministic providers). It contains only a `.gitignore` and **no `.git`** — it is untracked, so a test there is neither reviewable, CI-runnable, nor valid evidence. It also hard-fails at import unless the VB.NET backend repo is present, and it predates scan-first entirely (zero hits for `resolverRodalPorPuntoQr`, `GDE_GEOCERCA_RODAL`, `RESUELTO`).

`movil_comaco/tests/` already hosts the cross-repo precedent that reaches into `../../movil_comaco_gde`, and `config.yaml` requires new tests be wired into a runnable command. We port the ~40-line spatial shim rather than depend on the untracked harness.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `movil_comaco/tests/qr-scan-first-e2e.test.js` | New | Scenario assertions |
| `movil_comaco/tests/support/qr-e2e-harness.js` | New | VM bootstrap, spatial shim, schema fixtures |
| `movil_comaco/package.json` | Modified | One line: add file to `scripts.test` |
| `movil_comaco_gde`, `qr-roundtrip-tests` | Read-only | Loaded as source; not modified |

**No production source change in either app.** Not high risk: touches no `plugins-local/`, Gradle prefs, or `firebase/`.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Shim `ST_Contains` diverges from device SpatiaLite | Med | Port the proven ray-cast implementation; keep `POINT(lon lat)` order; document as a named limit |
| Cross-repo path coupling (`../../movil_comaco_gde`) breaks CI | Med | Follow the existing precedent; skip with a clear message when the sibling repo is absent |
| ~400 changed lines meets the review budget | High | Two-file split gives a natural slice boundary; else request `size:exception` |
| Production keys are weak placeholders | Low | Out of scope; test asserts they *match*, not that they are strong |

## Rollback Plan

Trivial and zero-impact: delete both new test files and revert the one-line `package.json` edit. No production code, schema, or build config is touched, so nothing shipped to a device can regress.

## Dependencies

- `movil_comaco_gde` checked out at `..\..\movil_comaco_gde` on `desarrollo`.
- Node ≥ 22.5 for `node:sqlite` (`DatabaseSync.function()` for the spatial shim).

## Success Criteria

- [ ] A green suite proves, without a device: a QR generated at a real load point resolves to exactly one catalog rodal.
- [ ] Points outside all geometry, orphan geometry, and ambiguous overlap each reach their named fallback state rather than a wrong auto-select.
- [ ] A rodal belonging to a different orden de compra never resolves.
- [ ] The QR crossing the boundary is a real ciphertext; no scenario injects a pre-decrypted object or a stubbed DAO.
- [ ] The file runs under `npm test` from a clean checkout.
