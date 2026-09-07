# Tasks: Rodal Scan-First Header Entry (guias)

All file paths are in `movil_comaco_gde` (code target repo). `movil_comaco` gets zero commits. Strict TDD: RED test task precedes its GREEN implementation task in every phase.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~640 total (PR1 ~330, PR2 ~310) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (foundation, `desarrollo`) -> PR2 (UI, targets PR1 branch) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (ask user) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Contingency: if PR1's DAO/service test exceeds range, split harness + `DATOS_seleccionar_valorParametroPorEmpresa` into PR0 (~100), leaving PR1 at ~230.

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Harness + DAO + service + tenant-scoped param + Constantes | PR1 | `node --test --experimental-test-isolation=none tests/rodal-point-resolution.test.js` | N/A — no UI call sites yet; DB-shape asserted via stubbed `sqlitePlugin` | delete new files/functions, no call sites reference them |
| 2 | Scan markup, wiring, inverted default, auto-select, fallback gating | PR2 | `node --test --experimental-test-isolation=none tests/scan-first-faena.test.js` | N/A — no device/emulator harness in repo; contract-style stubbed-DOM tests only | revert HTML block + JS wiring; PR1 functions remain unused but harmless |

## Phase 0: Blocking Pre-Code Verification (external owners, gate PR2 rollout)

- [ ] 0.1 **BLOCKING**: verify server-side whether `Cargar_Parametro_General` honours `id_emp` or ignores it and returns all empresas, given `ws_cargar_parametros_generales` posts `id_emp: 1` hardcoded (`www/js/WebServices.js:666`) while inserting `item.EMP_ID` from the response (`:681`), after `Parametros.js:98` deletes the full table first. Owner: backend/DBA. Outcome gates whether the empresa-scoped read in Phase 4 can ship as-is or the sync must also be fixed in this change.
- [ ] 0.2 **DEPLOYMENT PREREQUISITE**: request `PAG_ID` assignment for `parametroQrAvanceSinValidacion` and provisioning of the `PARAMETRO_GENERAL` row for every empresa in use, before PR2 merges. Owner: backend/DBA. Fail-closed means an unprovisioned row blocks emission with no fallback.
- [ ] 0.3 Confirm which `movil_comaco_gde` remote (`github/desarrollo` vs `origin/desarrollo`) carries the QR files this change touches; branch from that remote only.

## Phase 1: Test Harness (RED-blocking for all following phases)

- [x] 1.1 RED: add `tests/rodal-point-resolution.test.js` stub asserting the file loads under `node --test`; confirm it currently cannot run via `npm test`.
- [x] 1.2 GREEN: update `package.json` `"scripts.test"` to the explicit file list `node --test --experimental-test-isolation=none tests/qr_backward_compat.test.js tests/rodal-point-resolution.test.js tests/scan-first-faena.test.js` (flag: **package.json test script change**, no CI workflow file exists to update). **PR1 deviation**: `tests/scan-first-faena.test.js` does not exist until PR2 (Phase 6+); `node --test` errors on a listed file that does not exist (verified empirically on Node v22.19.0: `Could not find '<path>'`). PR1's script lists only `qr_backward_compat.test.js` and `rodal-point-resolution.test.js`; PR2 appends the third file when it creates it.
- [x] 1.3 Verify `npm test` runs green with the existing `tests/qr_backward_compat.test.js` plus the two new stub files, reusing the `node:vm` + stubbed-`sqlitePlugin` bootstrap pattern at `tests/qr_backward_compat.test.js:1-45`.

## Phase 2: Point-to-Rodal DAO (PR1)

- [x] 2.1 RED in `tests/rodal-point-resolution.test.js`: DAO binds `EMPRESA`/`TIPO_DOCTO`/`NRO_OC`/`ROL_PREDIO`, uses `ST_Contains`, LEFT JOIN keeps orphan geometry rows, coordinates pass through `Number()` before interpolation (spec `rodal-point-resolution` Bounded Search Scope).
- [x] 2.2 GREEN: implement `DATOS_buscarRodalPorPunto(rolPredio, empresa, tipoDocto, numOrden, lon, lat)` in `www/js/Datos/GeocercaRodal.js` per design D1/D2/D3, returning `{ hits, cantidadHits, codigosCatalogo, cantidadHuerfanas }`.

## Phase 3: Service Resolution Layer (PR1)

- [x] 3.1 RED in `tests/rodal-point-resolution.test.js`: 4-state truth table (`RESUELTO`/`AMBIGUO`/`SIN_COINCIDENCIA`/`GEOMETRIA_HUERFANA`), dedup of multi-geometry rodales, NULL `PERTENECE` treated as non-match (spec `rodal-point-resolution` Zero/Single/Multiple-Match, Name-to-Geometry Join Failure). NULL-`PERTENECE` non-match is covered at the DAO level (task 2.1: the `r4` row with `PERTENECE: null` never reaches `hits`); the service-layer test additionally covers dedup (2 geometry hits sharing one catalog code -> `RESUELTO`, not `AMBIGUO`) and the missing-predio/orden/coordinate short-circuits that never call the DAO.
- [x] 3.2 GREEN: implement `resolverRodalPorPuntoQr(payloadQr, rolPredio, ordenCompra)` in `www/js/Servicios/GeocercaRodalService.js` per design D3 table, calling `DATOS_buscarRodalPorPunto`.

## Phase 4: Tenant-Scoped Parameter Accessor (PR1)

- [x] 4.1 RED in `tests/rodal-point-resolution.test.js`: single-empresa read, multi-empresa isolation, missing-row-for-empresa never falls back cross-tenant (spec `tenant-scoped-parameters` all three requirements).
- [x] 4.2 GREEN: implement `DATOS_seleccionar_valorParametroPorEmpresa(empId, pagId, callback)` in `www/js/Datos/Parametros.js`, `WHERE EMP_ID = ? AND PAG_ID = ?`, `callback(-1)` when absent, modeled on `movil_comaco/www/js/Services/HelperService.js:102` (read-only reference).
- [x] 4.3 Contract test: assert `DATOS_seleccionar_valorParametro` (`:2754`) and its PAG_ID-only siblings (`:2794`, `:2826`) are never used to read the fallback flag — guardrail per design D7, not a migration.

## Phase 5: Constantes Entry (PR1)

- [x] 5.1 Add `parametroQrAvanceSinValidacion: <PAG_ID>` to `www/js/Common/Constantes.js` beside `parametroIva: 3`; value placeholder until Phase 0.2 resolves the real `PAG_ID`. Placeholder value `0`, commented as a TODO pointing at Phase 0.2; fail-closed makes a wrong placeholder safe (unmatched row denies fallback). Covered by a contract test asserting the property exists and is numeric.

## Phase 6: Scan Surface Markup (PR2)

- [x] 6.1 RED in `tests/scan-first-faena.test.js`: every element ID `EmisionDesdeFaena.js` addresses (`#btn_escanear_qr_trazabilidad_faena`, `#row_qr_trazabilidad_faena`, `#row_estado_qr_trazabilidad_faena`, `#estado_qr_trazabilidad_faena`, `#detalle_estado_qr_trazabilidad_faena`, `#detalle_qr_trazabilidad_faena`, `#btn_avance_sin_validacion_qr_faena`) resolves in `www/pages/EmisionDesdeFaena.html` source text. **Corrected after apply**: `#tx_rut_chofer` / `#tx_nom_chofer` were wrongly listed here. They are PRE-EXISTING dead references (styled at `EmisionDesdeFaena.js:125-126` with no markup), not new ids of this change, and they belong to driver data that was explicitly cut. They now sit in the test's pre-existing out-of-scope allowlist alongside the other ~20.
- [x] 6.2 GREEN: add `<div class="block" id="block_qr_trazabilidad_faena">` before `#block_rodal` (`www/pages/EmisionDesdeFaena.html:96`) with the six elements above per design D4. **Corrected after apply**: this task originally also asked for `#tx_rut_chofer`/`#tx_nom_chofer` markup to satisfy the dead style reference at `EmisionDesdeFaena.js:125-126`. That markup was added and then REVERTED (commit `6eccfc2b`). Fabricating elements so dead code has something to point at is the inverse fix — it leaves two dead things where there was one, and reintroduces driver naming into a change that excluded driver data. The correct fix is deleting the dead style lines, and it belongs to whichever change owns driver data.
- [x] 6.3 GREEN: wire `$$("#btn_escanear_qr_trazabilidad_faena").on("click", escanear_qr_trazabilidad_faena)` in the page-init block of `www/js/Vistas/EmisionDesdeFaena.js`, no inline `onclick`.

## Phase 7: Remove Inverted Guard (PR2)

- [x] 7.1 RED in `tests/scan-first-faena.test.js`: `escanear_qr_trazabilidad_faena` source no longer contains the `rodal_seleccionado_qr_trazabilidad_faena()` precondition (spec `guias-rodal-scan-first` Scan Precedes Rodal Selection).
- [x] 7.2 GREEN: remove the guard at `EmisionDesdeFaena.js:594-597`; replace with a guard on `orden_compra_asignada` being resolved.
- [x] 7.3 RED in `tests/scan-first-faena.test.js`: `actualizar_visibilidad_qr_trazabilidad_faena` shows the scan row only when `#block_rodal` is visible AND `orden_compra_asignada` is resolved.
- [x] 7.4 GREEN: rewrite `actualizar_visibilidad_qr_trazabilidad_faena` (`EmisionDesdeFaena.js:585-589`) per design D4, dropping the `rodal_seleccionado_...` term.

## Phase 8: Invert Default + Four MUST-REVEAL Sites (PR2)

- [x] 8.1 RED in `tests/scan-first-faena.test.js`: fresh entry and state-reset keep `#contenido_posterior_qr_trazabilidad_faena` hidden (spec `guias-rodal-scan-first` Hidden By Default, both scenarios).
- [x] 8.2 GREEN: flip `limpiar_qr_trazabilidad_faena` (`EmisionDesdeFaena.js:512`) to call `actualizar_bloqueo_visual_qr_trazabilidad_faena(true)`; add `revelar_contenido_posterior_faena(motivo)` as the single reveal call site.
- [x] 8.3 RED in `tests/scan-first-faena.test.js`, one case per MUST-REVEAL path: (a) `combo_rodal` no-catalog branch (`:2332-2334`), (b) reload GDE validated (`:566`), (c) reload GDE permitido-con-advertencia (`:571`), (d) reload GDE early `return` for a pre-feature borrador (`:540-542`) — this last case asserts a legacy borrador stays editable, not blank-locked.
- [x] 8.4 GREEN: add `revelar_contenido_posterior_faena(...)` calls at the four sites above.
- [x] 8.5 RED in `tests/scan-first-faena.test.js`: `recargar_combo_rodal` setting the combo from a persisted `GDE_RODAL` (`:936-946`) reveals the form.
- [x] 8.6 GREEN: add the reveal call at that site.

## Phase 9: Auto-Select and Ambiguity Handling (PR2)

- [x] 9.1 RED in `tests/scan-first-faena.test.js`: unique resolution auto-selects `#combo_rodal` and reveals the form (spec `guias-rodal-scan-first` Resolved Rodal Auto-Selects); unresolved (0 or N matches, or orphan geometry) keeps the form hidden with no auto-select (spec Unresolved Scan Keeps The Form Hidden).
- [x] 9.2 GREEN: on scan success, call `resolverRodalPorPuntoQr`; on `RESUELTO`, `#combo_rodal.val(cod).trigger("change")` to reuse the existing forward-validation handler at `EmisionDesdeFaena.js:236`/`:695`; on other states, show `#estado_qr_trazabilidad_faena` message and stay hidden.
      **PR1 contract — pinned, must match exactly**: `resolverRodalPorPuntoQr(payloadQr, rolPredio, ordenCompra)` expects `ordenCompra` shaped `{ empresa, tipoDocto, numOrden }`. The design left this shape unpinned; PR1 resolved it to match `DATOS_buscarRodalPorPunto`'s own parameter names. Passing a differently-shaped object (for example the raw `orden_compra_asignada` row with `OCE_TIPODOCTO` / `NUM_ORDEN`) yields `undefined` scope values and a silently empty result set, not an error. Map explicitly at the call site.
- [x] 9.3 RED in `tests/scan-first-faena.test.js`: never write a geometry `RODAL` string into `#combo_rodal` as a non-option value.
- [x] 9.4 GREEN: guard the auto-select assignment against unmatched catalog codes per design D3.

## Phase 10: Fail-Closed Fallback Gating (PR2)

- [x] 10.1 RED in `tests/scan-first-faena.test.js`: absent row (`-1`), read error, and unresolved-at-init all deny; only the explicit provisioned permit token allows; the fallback button is never live before the value resolves (spec `tenant-scoped-parameters` Server-Provisioned Fallback Flag; spec `guias-rodal-scan-first` Governed Manual Fallback, both scenarios).
- [x] 10.2 GREEN: implement the page-scope flag cache read via `DATOS_seleccionar_valorParametroPorEmpresa` at init, defaulting `false`; `permite_avance_sin_validacion_qr_trazabilidad()` (`:1268`) keeps its call shape and reads the resolved cache only.
- [x] 10.3 GREEN: wire `#btn_avance_sin_validacion_qr_faena` to reveal via `revelar_contenido_posterior_faena("fallback")` only when the flag cache resolved to permit and the scan failed/was unavailable/cancelled.

## Phase 11: Full-Suite Verification (PR2 close-out)

- [x] 11.1 Run `npm test` (full explicit list from Phase 1.2); confirm all three files pass.
- [x] 11.2 Cross-check every new element ID referenced in `EmisionDesdeFaena.js` against `EmisionDesdeFaena.html` (extends 6.1 to the full JS file, not just the new block).
- [x] 11.3 Confirm `movil_comaco` has zero commits for this change (proposal success criterion).

## Key Learnings

1. `movil_comaco_gde`'s `package.json` test script is an `npm init` stub (`echo "Error: no test specified" && exit 1`); only one contract test file currently exists.
2. The `tests/qr_backward_compat.test.js` bootstrap (`node:vm` + stubbed DOM + stubbed `sqlitePlugin`) is the established contract-test harness pattern to reuse, not pure unit tests.
3. Fail-closed under an unverified server `id_emp` filter creates a real risk of permanently blocking non-empresa-1 devices; this is not resolvable from client source and must gate rollout via an external owner, not a code task.
4. Four specific `EmisionDesdeFaena.js` call sites must gain an explicit reveal call when the default inverts, or existing production borradores and no-catalog flows regress into being permanently hidden.
